// Two-way sync between the phone (Dexie) and Supabase. Local-first: the phone is always written first;
// this uploads rows marked dirty, then downloads rows changed on the server, last write wins on updatedAt.
// The client is passed in, so the logic is tested without a network.

import { db } from '@/db'

const COMMON = ['id', 'createdAt', 'updatedAt', 'deletedAt']
const TIMESTAMPS = new Set(['createdAt', 'updatedAt', 'deletedAt', 'archivedAt'])

/** Synced tables: Dexie name, Supabase name, store key, and the app fields that go to the server. */
export const TABLES = [
  { local: 'accounts', remote: 'accounts', key: 'accounts', fields: ['name', 'short', 'type', 'network', 'bank', 'archivedAt'] },
  { local: 'items', remote: 'items', key: 'items', fields: ['name', 'kind', 'category', 'accountId', 'startDate', 'paydayBucket', 'reminderOffsets', 'reminderTime', 'notes', 'totalPayments', 'paidBefore', 'schedule', 'archivedAt'] },
  // No last4: card digits never leave the phone (and are never stored there either).
  { local: 'cards', remote: 'cards', key: 'cards', fields: ['name', 'type', 'tone', 'network', 'provider', 'creditLimit', 'statementDay', 'dueDay', 'accountId', 'paydayBucket', 'reminderOffsets', 'archivedAt'] },
  { local: 'installments', remote: 'installments', key: 'installments', fields: ['cardId', 'description', 'monthlyAmount', 'months', 'firstStatementDate'] },
  { local: 'card_statements', remote: 'card_statements', key: 'cardStatements', fields: ['cardId', 'statementDate', 'dueDate', 'statementBalance', 'minimumDue'] },
  { local: 'payments', remote: 'payments', key: 'payments', fields: ['ref', 'amount', 'paidOn', 'accountId', 'referenceNo', 'note'] },
]
const PUSH_PAGE = 500
const PULL_PAGE = 1000

const tableOf = (local) => TABLES.find((t) => t.local === local)
const snake = (k) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

export function toRemote(local, row, userId) {
  const rec = { user_id: userId }
  for (const f of [...COMMON, ...tableOf(local).fields]) rec[snake(f)] = row[f] ?? null
  return rec
}

const isoOrSame = (v) => (v == null || Number.isNaN(Date.parse(v)) ? v : new Date(v).toISOString())

export function fromRemote(local, rec) {
  const row = { userId: rec.user_id }
  for (const f of [...COMMON, ...tableOf(local).fields]) {
    const v = rec[snake(f)] ?? null
    row[f] = TIMESTAMPS.has(f) ? isoOrSame(v) : v
  }
  row.dirty = 0
  return row
}

/** The row to write when `remote` arrives, or null when the local copy is as new or newer. Local-only fields are kept. */
export function mergeRow(local, remote) {
  if (!local) return remote
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? { ...local, ...remote } : null
}

/** Upload every dirty row; each is marked clean (and owned) only if it wasn't edited while uploading. */
export async function push(client, userId, database = db) {
  for (const t of TABLES) {
    const ids = await database[t.local].where('dirty').equals(1).primaryKeys()
    for (let i = 0; i < ids.length; i += PUSH_PAGE) {
      const rows = (await database[t.local].bulkGet(ids.slice(i, i + PUSH_PAGE))).filter(Boolean)
      const { error } = await client.from(t.remote).upsert(rows.map((r) => toRemote(t.local, r, userId)), { onConflict: 'user_id,id' })
      if (error) throw new Error(error.message || 'Upload failed')
      await database.transaction('rw', database[t.local], async () => {
        for (const r of rows) {
          const now = await database[t.local].get(r.id)
          if (now && now.updatedAt === r.updatedAt) await database[t.local].update(r.id, { dirty: 0, userId })
        }
      })
    }
  }
}

/** Download rows changed on the server since the last pull. Returns how many local rows changed. */
export async function pull(client, database = db) {
  let written = 0
  for (const t of TABLES) {
    const key = `sync.pull.${t.local}`
    let cursor = (await database.meta.get(key))?.value ?? null
    for (;;) {
      let q = client.from(t.remote).select('*')
      if (cursor) q = q.gte('synced_at', cursor)
      const { data, error } = await q.order('synced_at').order('id').limit(PULL_PAGE)
      if (error) throw new Error(error.message || 'Download failed')
      await database.transaction('rw', database[t.local], async () => {
        for (const rec of data) {
          const merged = mergeRow(await database[t.local].get(rec.id), fromRemote(t.local, rec))
          if (merged) { await database[t.local].put(merged); written++ }
        }
      })
      const last = data.at(-1)?.synced_at
      const moved = last && last !== cursor
      if (last) { cursor = last; await database.meta.put({ key, value: cursor }) }
      // A page shorter than full is the end. A full page that didn't move the cursor can't make progress either.
      if (data.length < PULL_PAGE || !moved) break
    }
  }
  return written
}

/** True when the phone holds rows owned by a different account. Unowned rows (saved signed out) don't count. */
export async function foreignRows(userId, database = db) {
  for (const t of TABLES) {
    if (await database[t.local].filter((r) => r.userId != null && r.userId !== userId).count()) return true
  }
  return false
}
