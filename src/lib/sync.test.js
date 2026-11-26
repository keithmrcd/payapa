import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db, save, setCurrentUser } from '@/db'
import { toRemote, fromRemote, mergeRow, push, pull, foreignRows, TABLES } from './sync'

beforeEach(async () => {
  await db.delete() // tests only
  await db.open()
})
afterEach(() => setCurrentUser(null))

// A tiny in-memory stand-in for the parts of supabase-js that sync uses.
function fakeClient() {
  const tables = Object.fromEntries(TABLES.map((t) => [t.remote, []]))
  let clock = 0
  const calls = []
  return {
    tables, calls,
    from(name) {
      const rows = tables[name]
      return {
        async upsert(recs, opts) {
          calls.push({ name, n: recs.length, opts })
          for (const r of recs) {
            const i = rows.findIndex((x) => x.id === r.id && x.user_id === r.user_id)
            const synced_at = `2026-11-26T00:00:${String(++clock).padStart(2, '0')}.000000+00:00`
            if (i === -1) rows.push({ ...r, synced_at })
            else if (Date.parse(r.updated_at) > Date.parse(rows[i].updated_at)) rows[i] = { ...r, synced_at }
          }
          return { error: null }
        },
        select() {
          let filter = () => true
          let limit = Infinity
          const q = {
            gte(col, v) { filter = (r) => r[col] >= v; return q },
            order() { return q },
            limit(n) { limit = n; return q },
            then(resolve) {
              const data = rows.filter(filter).sort((a, b) => (a.synced_at < b.synced_at ? -1 : a.synced_at > b.synced_at ? 1 : a.id < b.id ? -1 : 1)).slice(0, limit)
              resolve({ data, error: null })
            },
          }
          return q
        },
      }
    },
  }
}

describe('mapping', () => {
  it('maps a card to snake_case columns and never sends last4', () => {
    const r = toRemote('cards', { id: 'c1', name: 'BDO Visa', type: 'credit_card', creditLimit: 5000000, statementDay: 2, dueDay: 27, last4: '1234', reminderOffsets: [3, 1, 0], createdAt: 'a', updatedAt: 'b', deletedAt: null, dirty: 1 }, 'u1')
    expect(r).toMatchObject({ id: 'c1', user_id: 'u1', name: 'BDO Visa', credit_limit: 5000000, statement_day: 2, due_day: 27, reminder_offsets: [3, 1, 0], created_at: 'a', updated_at: 'b', deleted_at: null })
    expect('last4' in r).toBe(false)
    expect('dirty' in r).toBe(false)
    expect(r.network).toBe(null) // missing fields go up as null
  })

  it('maps back to camelCase, normalising timestamps, clean and not dirty', () => {
    const local = fromRemote('payments', { id: 'p1', user_id: 'u1', ref: 'item:x:2026-11-20', amount: 210000, paid_on: '2026-11-20', account_id: 'a1', reference_no: null, note: 'hi', created_at: '2026-11-26T01:02:03.456+00:00', updated_at: '2026-11-26T01:02:03.456+00:00', deleted_at: null, synced_at: 'x' })
    expect(local).toEqual({ id: 'p1', userId: 'u1', ref: 'item:x:2026-11-20', amount: 210000, paidOn: '2026-11-20', accountId: 'a1', referenceNo: null, note: 'hi', createdAt: '2026-11-26T01:02:03.456Z', updatedAt: '2026-11-26T01:02:03.456Z', deletedAt: null, dirty: 0 })
  })

  it('every table round-trips its listed fields', () => {
    for (const t of TABLES) {
      const row = { id: 'x', userId: 'u1', createdAt: '2026-11-26T00:00:00.000Z', updatedAt: '2026-11-26T00:00:00.000Z', deletedAt: null }
      for (const f of t.fields) row[f] = `v-${f}`
      expect(fromRemote(t.local, toRemote(t.local, row, 'u1'))).toEqual({ ...row, dirty: 0 })
    }
  })

  it('merge takes the newer row and keeps local-only fields', () => {
    const local = { id: 'i1', name: 'Old', updatedAt: '2026-11-26T00:00:00.000Z', extra: 'kept' }
    expect(mergeRow(local, { id: 'i1', name: 'New', updatedAt: '2026-11-26T00:00:01.000Z' })).toEqual({ id: 'i1', name: 'New', updatedAt: '2026-11-26T00:00:01.000Z', extra: 'kept' })
    expect(mergeRow(local, { id: 'i1', name: 'Older', updatedAt: '2026-11-25T00:00:00.000Z' })).toBe(null)
    expect(mergeRow(local, { id: 'i1', name: 'Same', updatedAt: '2026-11-26T00:00:00.000Z' })).toBe(null)
    expect(mergeRow(undefined, { id: 'i2', name: 'New' })).toEqual({ id: 'i2', name: 'New' })
  })
})

describe('push', () => {
  it('uploads dirty rows, then marks them clean and owned', async () => {
    const client = fakeClient()
    const a = await save('items', { name: 'Meralco' })
    await push(client, 'u1')
    expect(client.tables.items.map((r) => [r.id, r.user_id, r.name])).toEqual([[a.id, 'u1', 'Meralco']])
    expect(client.calls[0].opts).toEqual({ onConflict: 'user_id,id' })
    expect(await db.items.get(a.id)).toMatchObject({ dirty: 0, userId: 'u1', updatedAt: a.updatedAt })
    await push(client, 'u1')
    expect(client.calls).toHaveLength(1) // nothing dirty, nothing sent
  })

  it('a row edited while its upload is in flight stays dirty', async () => {
    const client = fakeClient()
    const a = await save('items', { name: 'A' })
    const realFrom = client.from.bind(client)
    client.from = (name) => {
      const t = realFrom(name)
      return { ...t, upsert: async (...args) => { const res = await t.upsert(...args); await save('items', { ...a, name: 'B' }); return res } }
    }
    await push(client, 'u1')
    expect((await db.items.get(a.id)).dirty).toBe(1)
  })

  it('uploads in pages of 500', async () => {
    const client = fakeClient()
    await db.payments.bulkPut(Array.from({ length: 1201 }, (_, i) => ({ id: `p${String(i).padStart(4, '0')}`, ref: 'r', amount: 1, paidOn: '2026-11-20', updatedAt: '2026-11-26T00:00:00.000Z', dirty: 1 })))
    await push(client, 'u1')
    expect(client.calls.filter((c) => c.name === 'payments').map((c) => c.n)).toEqual([500, 500, 201])
    expect(await db.payments.where('dirty').equals(1).count()).toBe(0)
  })

  it('a failed upload leaves rows dirty and throws', async () => {
    await save('items', { name: 'A' })
    const client = { from: () => ({ upsert: async () => ({ error: { message: 'offline' } }) }) }
    await expect(push(client, 'u1')).rejects.toThrow('offline')
    expect(await db.items.where('dirty').equals(1).count()).toBe(1)
  })
})

describe('pull', () => {
  it('brings in newer rows, skips older ones, and moves its cursor', async () => {
    const client = fakeClient()
    const mine = await save('items', { name: 'Local newer' })
    await db.items.update(mine.id, { dirty: 0 })
    client.tables.items.push(
      { id: 'cloud1', user_id: 'u1', name: 'From cloud', created_at: '2026-11-20T00:00:00+00:00', updated_at: '2026-11-20T00:00:00+00:00', deleted_at: null, synced_at: '2026-11-26T00:00:01+00:00' },
      { id: mine.id, user_id: 'u1', name: 'Cloud older', created_at: '2026-01-01T00:00:00+00:00', updated_at: '2026-01-01T00:00:00+00:00', deleted_at: null, synced_at: '2026-11-26T00:00:02+00:00' },
    )
    const n = await pull(client)
    expect(n).toBe(1)
    expect((await db.items.get('cloud1'))).toMatchObject({ name: 'From cloud', dirty: 0, userId: 'u1' })
    expect((await db.items.get(mine.id)).name).toBe('Local newer')
    expect((await db.meta.get('sync.pull.items')).value).toBe('2026-11-26T00:00:02+00:00')
    expect(await pull(client)).toBe(0) // boundary row comes again but changes nothing
  })

  it('a pulled delete hides the row locally', async () => {
    const client = fakeClient()
    const a = await save('payments', { ref: 'r', amount: 1, paidOn: '2026-11-20' })
    client.tables.payments.push({ ...toRemote('payments', a, 'u1'), updated_at: '2030-01-01T00:00:00+00:00', deleted_at: '2030-01-01T00:00:00+00:00', synced_at: '2026-11-26T00:00:01+00:00' })
    await pull(client)
    expect((await db.payments.get(a.id)).deletedAt).toBe('2030-01-01T00:00:00.000Z')
  })

  it('pages through more than 1000 rows', async () => {
    const client = fakeClient()
    for (let i = 0; i < 1500; i++) {
      client.tables.payments.push({ id: `p${i}`, user_id: 'u1', ref: 'r', amount: 1, paid_on: '2026-11-20', created_at: '2026-11-20T00:00:00+00:00', updated_at: '2026-11-20T00:00:00+00:00', deleted_at: null, synced_at: `2026-11-26T00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}+00:00` })
    }
    expect(await pull(client)).toBe(1500)
    expect(await db.payments.count()).toBe(1500)
  })
})

describe('foreignRows', () => {
  it('finds rows owned by someone else; unowned rows are fine', async () => {
    await save('items', { name: 'Unowned' })
    expect(await foreignRows('u1')).toBe(false)
    setCurrentUser('u2')
    await save('items', { name: 'Theirs' })
    expect(await foreignRows('u2')).toBe(false)
    expect(await foreignRows('u1')).toBe(true)
  })
})
