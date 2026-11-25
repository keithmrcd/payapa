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
    userId: r.userId ?? null,
    createdAt: r.createdAt ?? updatedAt,
    updatedAt,
    deletedAt: r.deletedAt ?? null,
  }
  await db[table].put(saved)
  return saved
}

/** Mark a row deleted. It stays in the table as a tombstone for sync. */
export async function softDelete(table, id) {
  const row = await db[table].get(id)
  if (!row) throw new Error(`No ${table} row ${id}`)
  const now = stamp(row.updatedAt)
  await db[table].update(id, { deletedAt: now, updatedAt: now })
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
