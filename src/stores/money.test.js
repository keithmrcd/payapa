import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { db } from '@/db'
import { useMoney } from './money'

const itemFields = (over = {}) => ({
  name: 'Meralco', kind: 'bill', category: 'electricity', accountId: null,
  startDate: '2026-11-20', paydayBucket: 'auto', reminderOffsets: [3, 1, 0], reminderTime: '09:00', notes: '',
  schedule: [{ effectiveFrom: '2026-11-20', recurrence: 'monthly', dueDay: 20, dueMonth: null, interval: 1, amount: 341250, variable: false }],
  ...over,
})

beforeEach(async () => {
  await db.delete() // tests only
  await db.open()
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('money store', () => {
  it('load seeds the five accounts and is ready', async () => {
    const money = useMoney()
    expect(money.ready).toBe(false)
    await money.load()
    expect(money.ready).toBe(true)
    expect(money.accounts.map((a) => a.name)).toEqual(['BDO', 'GoTyme', 'MariBank', 'GCash', 'Cash'])
    expect(money.items).toEqual([])
  })

  it('load keeps existing data', async () => {
    const first = useMoney()
    await first.load()
    await first.addItem(itemFields())
    setActivePinia(createPinia())
    const again = useMoney()
    await again.load()
    expect(again.items.map((i) => i.name)).toEqual(['Meralco'])
    expect(again.accounts).toHaveLength(5)
  })

  it('action leaves state unchanged when the write throws', async () => {
    const money = useMoney()
    await money.load()
    vi.spyOn(db.items, 'put').mockRejectedValue(new Error('QuotaExceededError'))
    await expect(money.addItem(itemFields())).rejects.toThrow('QuotaExceededError')
    expect(money.items).toHaveLength(0)
  })

  it('updateItem starts a schedule version at the earliest unpaid occurrence', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 25, 12, 0))
    const money = useMoney()
    await money.load()
    const v = { effectiveFrom: '2026-10-20', recurrence: 'monthly', dueDay: 20, dueMonth: null, interval: 1, amount: 100000, variable: false }
    const item = await money.addItem(itemFields({ startDate: '2026-10-20', schedule: [v] }))
    const oct = money.occurrences.find((o) => o.due === '2026-10-20')
    await money.markPaid(oct, { amount: 100000, paidOn: '2026-10-19', account: null })
    await money.updateItem(item.id, { amount: 120000 })
    const updated = money.items.find((i) => i.id === item.id)
    expect(updated.schedule.map((s) => [s.effectiveFrom, s.amount])).toEqual([['2026-10-20', 100000], ['2026-11-20', 120000]])
    expect((await db.items.get(item.id)).schedule).toHaveLength(2)
  })

  it('updateItem ignores caller-supplied row bookkeeping', async () => {
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields())
    const updated = await money.updateItem(item.id, { createdAt: 'x', id: 'other', name: 'Meralco 2' })
    expect(updated.createdAt).toBe(item.createdAt)
    expect(updated.id).toBe(item.id)
    expect(updated.name).toBe('Meralco 2')
  })

  it('updateItem with a new startDate moves a single schedule version', async () => {
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields())
    const u = await money.updateItem(item.id, { startDate: '2026-12-20', amount: 5000 })
    expect(u.startDate).toBe('2026-12-20')
    expect(u.schedule).toHaveLength(1)
    expect(u.schedule[0]).toMatchObject({ effectiveFrom: '2026-12-20', amount: 5000 })
    const earlier = await money.updateItem(item.id, { startDate: '2026-11-01' })
    expect(earlier.schedule.map((v) => [v.effectiveFrom, v.amount])).toEqual([['2026-11-01', 5000]])
  })

  it('markPaid then undo', async () => {
    const money = useMoney()
    await money.load()
    await money.addItem(itemFields())
    const o = money.occurrences[0]
    const bdo = money.accounts[0].id
    const p = await money.markPaid(o, { amount: 341250, paidOn: '2026-11-19', account: bdo, referenceNo: 'R1' })
    expect(p.accountId).toBe(bdo)
    expect(money.history).toHaveLength(1)
    expect(money.history[0]).toMatchObject({ id: p.id, name: 'Meralco', account: bdo, referenceNo: 'R1' })
    expect(money.occurrences.find((x) => x.ref === o.ref).status).toBe('paid')

    await money.undoPayment(p.id)
    expect(money.payments).toHaveLength(0)
    expect(money.history).toHaveLength(0)
    expect((await db.payments.get(p.id)).deletedAt).not.toBe(null)
  })

  it('archived items leave occurrences but keep their history name', async () => {
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields())
    await money.markPaid(money.occurrences[0], { amount: 341250, paidOn: '2026-11-19', account: null })
    await money.archiveItem(item.id)
    expect(money.activeItems).toHaveLength(0)
    expect(money.occurrences).toHaveLength(0)
    expect(money.history[0].name).toBe('Meralco')
    await money.unarchiveItem(item.id)
    expect(money.activeItems).toHaveLength(1)
  })

  it('archiveAccount hides an account from pickers, unarchiveAccount brings it back', async () => {
    const money = useMoney()
    await money.load()
    const cash = money.accounts.find((a) => a.name === 'Cash')
    await money.archiveAccount(cash.id)
    expect(money.activeAccounts.map((a) => a.name)).not.toContain('Cash')
    expect(money.account(cash.id).name).toBe('Cash')
    await money.unarchiveAccount(cash.id)
    expect(money.activeAccounts.map((a) => a.name)).toContain('Cash')
    expect((await db.accounts.get(cash.id)).archivedAt).toBe(null)
  })

  it('refreshToday updates today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 25, 23, 59))
    const money = useMoney()
    expect(money.today).toBe('2026-11-25')
    vi.setSystemTime(new Date(2026, 10, 26, 0, 1))
    money.refreshToday()
    expect(money.today).toBe('2026-11-26')
  })
})
