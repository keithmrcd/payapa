import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { db } from '@/db'
import { useMoney } from './money'
import { currentVersion } from '@/lib/recurrence'

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

// Today is pinned to 2026-11-25 for the edit-base tests.
const pinToday = () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 25, 12, 0))
}
const monthly = (effectiveFrom, dueDay, amount) => ({ effectiveFrom, recurrence: 'monthly', dueDay, dueMonth: null, interval: 1, amount, variable: false })
const occsOf = (money, id) => money.occurrences.filter((o) => o.id === id)
const payDue = (money, id, due, amount) => money.markPaid(occsOf(money, id).find((o) => o.due === due), { amount, paidOn: '2026-11-20', account: null })
// What AddSheet sends on save: every non-schedule field plus the schedule it pre-filled.
function formFields(money, id, over = {}) {
  const item = money.items.find((i) => i.id === id)
  const v = currentVersion(item, money.editBaseDate(id) ?? money.today)
  return {
    name: item.name, category: item.category, accountId: item.accountId, paydayBucket: item.paydayBucket, reminderOffsets: item.reminderOffsets,
    recurrence: v.recurrence, dueDay: v.dueDay, dueMonth: v.dueMonth, interval: v.interval, amount: v.amount, variable: v.variable,
    ...over,
  }
}

describe('editing an item never moves or drops a paid due date', () => {
  it('a second edit keeps the first (Meralco)', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields({ startDate: '2026-10-05', schedule: [monthly('2026-10-05', 5, 100000)] }))
    await payDue(money, item.id, '2026-10-05', 100000)
    await payDue(money, item.id, '2026-11-05', 100000)
    await money.updateItem(item.id, { amount: 120000 })
    expect(money.editBaseDate(item.id)).toBe('2026-12-05')
    const form = formFields(money, item.id)
    expect(form.amount).toBe(120000)
    await money.updateItem(item.id, { ...form, name: 'Meralco Home' })
    expect(occsOf(money, item.id).map((o) => [o.due, o.amount, o.status])).toEqual([
      ['2026-10-05', 100000, 'paid'], ['2026-11-05', 100000, 'paid'], ['2026-12-05', 120000, 'unpaid'], ['2027-01-05', 120000, 'unpaid'],
    ])
    expect(money.items.find((i) => i.id === item.id).name).toBe('Meralco Home')
  })

  it('moving the first due day of an unpaid bill moves its start (PLDT)', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields({ name: 'PLDT', startDate: '2026-11-20', schedule: [monthly('2026-11-20', 20, 200000)] }))
    await money.updateItem(item.id, { dueDay: 10 })
    const u = money.items.find((i) => i.id === item.id)
    expect(u.startDate).toBe('2026-11-10')
    expect(u.schedule).toHaveLength(1)
    const occs = occsOf(money, item.id)
    expect(occs[0]).toMatchObject({ due: '2026-11-10', overdue: true, amount: 200000 })
    expect(occs.map((o) => o.due)).toEqual(['2026-11-10', '2026-12-10', '2027-01-10'])
  })

  it('a partly paid first bill keeps its date; the change starts next month', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields({ name: 'PLDT', startDate: '2026-11-20', schedule: [monthly('2026-11-20', 20, 200000)] }))
    await payDue(money, item.id, '2026-11-20', 50000)
    await money.updateItem(item.id, { dueDay: 10 })
    expect(occsOf(money, item.id).map((o) => [o.due, o.paid, o.status])).toEqual([
      ['2026-11-20', 50000, 'partial'], ['2026-12-10', 0, 'unpaid'], ['2027-01-10', 0, 'unpaid'],
    ])
    expect(money.items.find((i) => i.id === item.id).startDate).toBe('2026-11-20')
  })

  it('a month paid ahead keeps its date when an earlier month is overdue (Water)', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields({ name: 'Water', category: 'water', startDate: '2026-11-08', schedule: [monthly('2026-11-08', 8, 50000)] }))
    await payDue(money, item.id, '2026-12-08', 50000)
    await money.updateItem(item.id, formFields(money, item.id, { dueDay: 12 }))
    expect(occsOf(money, item.id).map((o) => [o.due, o.status])).toEqual([
      ['2026-11-08', 'unpaid'], ['2026-12-08', 'paid'], ['2027-01-12', 'unpaid'],
    ])
  })

  it('correcting a paid one-off bill keeps its date and adds no bill due today', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const once = { effectiveFrom: '2026-11-10', recurrence: 'once', dueDay: null, dueMonth: null, interval: 1, amount: 150000, variable: false }
    const item = await money.addItem(itemFields({ name: 'Registration', startDate: '2026-11-10', schedule: [once] }))
    await payDue(money, item.id, '2026-11-10', 150000)
    expect(money.editBaseDate(item.id)).toBe(null)
    await money.updateItem(item.id, formFields(money, item.id, { name: 'LTO registration', amount: 155000 }))
    const occs = occsOf(money, item.id)
    expect(occs.map((o) => [o.due, o.amount])).toEqual([['2026-11-10', 155000]])
    expect(occs.some((o) => o.due === money.today)).toBe(false)
    expect(money.items.find((i) => i.id === item.id).schedule).toHaveLength(1)
  })

  it('ignores a startDate change once the item has payments', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields())
    await payDue(money, item.id, '2026-11-20', 341250)
    const u = await money.updateItem(item.id, { startDate: '2026-12-20', name: 'Meralco 2' })
    expect(u.startDate).toBe('2026-11-20')
    expect(u.schedule[0].effectiveFrom).toBe('2026-11-20')
    expect(u.name).toBe('Meralco 2')
    expect(occsOf(money, item.id)[0]).toMatchObject({ due: '2026-11-20', status: 'paid' })
  })

  it('an amount edit on an unpaid bill with an off-cycle first due adds no earlier bill', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields({ startDate: '2026-11-25', schedule: [monthly('2026-11-25', 5, 100000)] }))
    expect(occsOf(money, item.id)[0].due).toBe('2026-12-05')
    await money.updateItem(item.id, { amount: 120000 })
    const u = money.items.find((i) => i.id === item.id)
    expect(u.startDate).toBe('2026-12-05')
    expect(occsOf(money, item.id).map((o) => [o.due, o.amount])).toEqual([['2026-12-05', 120000], ['2027-01-05', 120000]])
  })

  it('a first-bill edit with no payments collapses later versions into one', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields())
    const p = await payDue(money, item.id, '2026-11-20', 341250)
    await money.updateItem(item.id, { amount: 120000 })
    expect(money.items.find((i) => i.id === item.id).schedule).toHaveLength(2)
    await money.undoPayment(p.id)
    await money.updateItem(item.id, { amount: 130000 })
    const u = money.items.find((i) => i.id === item.id)
    expect(u.schedule).toHaveLength(1)
    expect(occsOf(money, item.id).map((o) => [o.due, o.amount])).toEqual([['2026-11-20', 130000], ['2026-12-20', 130000], ['2027-01-20', 130000]])
  })

  it('editBaseDate is null for archived items', async () => {
    pinToday()
    const money = useMoney()
    await money.load()
    const item = await money.addItem(itemFields())
    expect(money.editBaseDate(item.id)).toBe('2026-11-20')
    await money.archiveItem(item.id)
    expect(money.editBaseDate(item.id)).toBe(null)
  })
})

describe('cards', () => {
  it('archiveCard hides a card, unarchiveCard brings it back', async () => {
    const money = useMoney()
    await money.load()
    const card = await money.addCard({ name: 'BDO Gold', provider: 'BDO Gold', type: 'credit_card', tone: 'navy', last4: '4821', creditLimit: 0, statementDay: 5, dueDay: 25, accountId: null })
    await money.archiveCard(card.id)
    expect(money.activeCards).toHaveLength(0)
    expect((await db.cards.get(card.id)).archivedAt).not.toBe(null)
    await money.unarchiveCard(card.id)
    expect(money.activeCards.map((c) => c.name)).toEqual(['BDO Gold'])
    expect((await db.cards.get(card.id)).archivedAt).toBe(null)
  })
})

describe('payments', () => {
  async function setup(over) {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 25, 12, 0))
    const money = useMoney()
    await money.load()
    await money.addItem(itemFields(over))
    return { money, o: money.occurrences[0] }
  }
  const statusOf = (money, ref) => money.occurrences.find((x) => x.ref === ref)

  it('markPaid stores a note', async () => {
    const { money, o } = await setup()
    const p = await money.markPaid(o, { amount: 100000, paidOn: '2026-11-19', account: null, note: 'Paid at 7-Eleven' })
    expect(p.note).toBe('Paid at 7-Eleven')
    expect(money.history[0].note).toBe('Paid at 7-Eleven')
    const p2 = await money.markPaid(o, { amount: 1000, paidOn: '2026-11-19', account: null, note: '' })
    expect(p2.note).toBe(null)
  })

  it('updatePayment rewrites fields but keeps ref', async () => {
    const { money, o } = await setup()
    const gcash = money.accounts.find((a) => a.name === 'GCash').id
    const p = await money.markPaid(o, { amount: 341250, paidOn: '2026-11-19', account: null })
    const u = await money.updatePayment(p.id, { amount: 100000, paidOn: '2026-11-18', account: gcash, referenceNo: 'X9', note: 'n' })
    expect(u).toMatchObject({ id: p.id, ref: p.ref, amount: 100000, paidOn: '2026-11-18', accountId: gcash, referenceNo: 'X9', note: 'n' })
    expect(statusOf(money, p.ref).status).toBe('partial')
    expect((await db.payments.get(p.id)).amount).toBe(100000)
    expect(money.payments).toHaveLength(1)
    const v = await money.updatePayment(p.id, { amount: 100000, paidOn: '2026-11-18', account: gcash, referenceNo: '', note: '' })
    expect(v).toMatchObject({ referenceNo: null, note: null })
  })

  it('deletePayment then restorePayment', async () => {
    const { money, o } = await setup()
    const p = await money.markPaid(o, { amount: 341250, paidOn: '2026-11-19', account: null })
    const row = await money.deletePayment(p.id)
    expect(row.id).toBe(p.id)
    expect(money.payments).toHaveLength(0)
    expect(statusOf(money, p.ref).status).toBe('unpaid')
    expect((await db.payments.get(p.id)).deletedAt).not.toBe(null)
    await money.restorePayment(row)
    expect(statusOf(money, p.ref).status).toBe('paid')
    expect((await db.payments.get(p.id)).deletedAt).toBe(null)
    setActivePinia(createPinia())
    const again = useMoney()
    await again.load()
    expect(again.payments.map((x) => x.id)).toEqual([p.id])
  })

  it('deleting the only payment on a variable bill restores the estimate', async () => {
    const { money, o } = await setup({
      schedule: [{ effectiveFrom: '2026-11-20', recurrence: 'monthly', dueDay: 20, dueMonth: null, interval: 1, amount: 300000, variable: true }],
    })
    const p = await money.markPaid(o, { amount: 280000, paidOn: '2026-11-19', account: null })
    expect(statusOf(money, p.ref)).toMatchObject({ status: 'paid', amount: 280000 })
    const row = await money.deletePayment(p.id)
    expect(statusOf(money, p.ref)).toMatchObject({ status: 'unpaid', amount: 300000 })
    await money.restorePayment(row)
    expect(statusOf(money, p.ref)).toMatchObject({ status: 'paid', amount: 280000 })
  })
})
