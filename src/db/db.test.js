import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Dexie from 'dexie'
import { db, save, softDelete, loadAll, setCurrentUser } from './index'
import { seedAccounts } from './seed'

// Tests only: start every test from an empty database.
beforeEach(async () => {
  await db.delete()
  await db.open()
})
afterEach(() => vi.unstubAllGlobals())

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

describe('ids outside a secure context', () => {
  it('save builds a v4 uuid when crypto.randomUUID is missing', async () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: (a) => real.getRandomValues(a) })
    expect(crypto.randomUUID).toBeUndefined()
    const a = await save('items', { name: 'A' })
    const b = await save('items', { name: 'B' })
    expect(a.id).toMatch(UUID)
    expect(b.id).toMatch(UUID)
    expect(a.id).not.toBe(b.id)
  })
})

describe('sync fields (milestone 7)', () => {
  afterEach(() => setCurrentUser(null))

  it('save marks the row dirty; signed out it stays unowned', async () => {
    const a = await save('items', { name: 'A' })
    expect(a.dirty).toBe(1)
    expect(a.userId).toBe(null)
  })

  it('signed in, save tags the row with the user', async () => {
    setCurrentUser('u1')
    expect((await save('items', { name: 'A' })).userId).toBe('u1')
  })

  it('softDelete marks the row dirty', async () => {
    const p = await save('payments', { ref: 'r', amount: 1, paidOn: '2026-11-20' })
    await db.payments.update(p.id, { dirty: 0 })
    await softDelete('payments', p.id)
    expect((await db.payments.get(p.id)).dirty).toBe(1)
  })

  it('seed accounts are stamped 1970, so any cloud copy wins', async () => {
    await seedAccounts()
    const rows = await db.accounts.toArray()
    expect(rows.every((r) => r.updatedAt === '1970-01-01T00:00:00.000Z' && r.createdAt === r.updatedAt && r.dirty === 1)).toBe(true)
  })

  it('upgrading from version 1 marks every existing row dirty', async () => {
    db.close()
    await Dexie.delete('payapa')
    const old = new Dexie('payapa')
    old.version(1).stores({ accounts: 'id', items: 'id', cards: 'id', installments: 'id, cardId', card_statements: 'id, cardId', payments: 'id, ref, paidOn', meta: 'key' })
    await old.open()
    await old.items.put({ id: 'i1', name: 'Old', updatedAt: '2026-11-01T00:00:00.000Z' })
    old.close()
    await db.open()
    expect((await db.items.get('i1')).dirty).toBe(1)
    expect(await db.items.where('dirty').equals(1).count()).toBe(1)
  })
})
