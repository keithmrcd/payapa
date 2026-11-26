// The on-device database. Every row carries sync fields for milestone 7
// (id, userId, createdAt, updatedAt, deletedAt). Deletes are soft deletes only.
// Never call db.delete() or table.clear() outside tests: this holds the owner's real data.
// Schema changes go in a new db.version(n) block so Dexie migrates without wiping.

import Dexie from 'dexie'

export const db = new Dexie('payapa')

db.version(1).stores({
  accounts: 'id',
  items: 'id',
  cards: 'id',
  installments: 'id, cardId',
  card_statements: 'id, cardId',
  payments: 'id, ref, paidOn',
  meta: 'key',
})

// Milestone 7: `dirty` marks rows not yet uploaded. Every row that exists before sync counts as not uploaded.
const SYNCED = ['accounts', 'items', 'cards', 'installments', 'card_statements', 'payments']
db.version(2).stores({
  accounts: 'id, dirty',
  items: 'id, dirty',
  cards: 'id, dirty',
  installments: 'id, cardId, dirty',
  card_statements: 'id, cardId, dirty',
  payments: 'id, ref, paidOn, dirty',
}).upgrade(async (tx) => {
  for (const t of SYNCED) await tx.table(t).toCollection().modify({ dirty: 1 })
})

// The signed-in user's id while signed in (set by the session store). Rows saved signed out stay unowned (null)
// and are claimed by the next sign-in.
let currentUser = null
export function setCurrentUser(id) { currentUser = id ?? null }

// Timestamps are UTC instants (moments, not local dates), so toISOString() is right here.
// Each write gets a later timestamp than the row's previous one, so last-write-wins sync
// can't lose an edit made within the same millisecond.
function stamp(prev) {
  const now = new Date()
  if (prev && now.toISOString() <= prev) return new Date(Date.parse(prev) + 1).toISOString()
  return now.toISOString()
}

// crypto.randomUUID exists only in secure contexts; `npm run dev -- --host` over http isn't one.
// The fallback is an RFC 4122 version 4 uuid from crypto.getRandomValues.
export function uuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Insert or replace a row. Returns the row as stored. */
export async function save(table, row) {
  // JSON copy: strips Vue proxies (IndexedDB can't clone them) and undefined fields.
  const r = JSON.parse(JSON.stringify(row))
  const updatedAt = stamp(r.updatedAt)
  const saved = {
    ...r,
    id: r.id ?? uuid(),
    userId: currentUser ?? r.userId ?? null,
    createdAt: r.createdAt ?? updatedAt,
    updatedAt,
    deletedAt: r.deletedAt ?? null,
    dirty: 1,
  }
  await db[table].put(saved)
  return saved
}

/** Mark a row deleted. It stays in the table as a tombstone for sync. */
export async function softDelete(table, id) {
  const row = await db[table].get(id)
  if (!row) throw new Error(`No ${table} row ${id}`)
  const now = stamp(row.updatedAt)
  await db[table].update(id, { deletedAt: now, updatedAt: now, dirty: 1 })
}

const live = (rows) => rows.filter((r) => r.deletedAt == null)

/** Every row that isn't soft-deleted. Archived rows are included. */
export async function loadAll() {
  return db.transaction('r', [db.accounts, db.items, db.cards, db.installments, db.card_statements, db.payments], async () => {
    const [accounts, items, cards, installments, cardStatements, payments] = await Promise.all([
      db.accounts.toArray(), db.items.toArray(), db.cards.toArray(),
      db.installments.toArray(), db.card_statements.toArray(), db.payments.toArray(),
    ])
    return {
      accounts: live(accounts), items: live(items), cards: live(cards),
      installments: live(installments), cardStatements: live(cardStatements), payments: live(payments),
    }
  })
}
