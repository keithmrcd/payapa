import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db, save, softDelete, loadAll } from './index'
import { seedAccounts } from './seed'

// Tests only: start every test from an empty database.
beforeEach(async () => {
  await db.delete()
  await db.open()
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('db', () => {
  it('save stamps sync fields', async () => {
    const a = await save('items', { name: 'A' })
    expect(a.id).toMatch(UUID)
    expect(a.userId).toBe(null)
    expect(a.deletedAt).toBe(null)
    expect(a.createdAt).toBe(a.updatedAt)
    expect(await db.items.get(a.id)).toEqual(a)

    const b = await save('items', { ...a, name: 'B' })
    expect(b.id).toBe(a.id)
    expect(b.createdAt).toBe(a.createdAt)
    expect(b.updatedAt > a.updatedAt).toBe(true)
    expect((await db.items.get(a.id)).name).toBe('B')
  })

  it('softDelete hides from loadAll', async () => {
    const p = await save('payments', { ref: 'item:x:2026-11-20', amount: 100, paidOn: '2026-11-20' })
    expect((await loadAll()).payments).toHaveLength(1)
    await softDelete('payments', p.id)
    expect((await loadAll()).payments).toEqual([])
    const row = await db.payments.get(p.id)
    expect(row.deletedAt).not.toBe(null)
    expect(row.updatedAt > p.updatedAt).toBe(true)
  })

  it('loadAll includes archived rows', async () => {
    await save('items', { name: 'Old', archivedAt: '2026-11-01T00:00:00.000Z' })
    expect((await loadAll()).items).toHaveLength(1)
  })

  it('seedAccounts runs once', async () => {
    await seedAccounts()
    await seedAccounts()
    let accounts = await db.accounts.toArray()
    expect(accounts).toHaveLength(5)
    expect(accounts.map((a) => a.name)).toEqual(['BDO', 'GoTyme', 'MariBank', 'GCash', 'Cash'])
    expect(accounts.map((a) => a.type)).toEqual(['bank', 'bank', 'bank', 'ewallet', 'cash'])
    expect(accounts.every((a) => a.short === a.name && a.archivedAt === null && a.deletedAt === null)).toBe(true)

    const gcash = accounts.find((a) => a.name === 'GCash')
    await save('accounts', { ...gcash, archivedAt: '2026-11-25T00:00:00.000Z' })
    await seedAccounts()
    accounts = await db.accounts.toArray()
    expect(accounts).toHaveLength(5)
    expect(accounts.find((a) => a.name === 'GCash').archivedAt).toBe('2026-11-25T00:00:00.000Z')
  })
})
