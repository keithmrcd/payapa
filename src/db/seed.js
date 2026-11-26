// First-run setup: the five accounts the owner uses. These are real, editable rows,
// not sample data. Fixed ids so a later sync can't duplicate them across phones.

import { db } from './index'

const SEED_KEY = 'seeded.accounts'
const EPOCH = '1970-01-01T00:00:00.000Z'

export const SEED_ACCOUNTS = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'BDO', type: 'bank' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'GoTyme', type: 'bank' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'MariBank', type: 'bank' },
  { id: '00000000-0000-4000-8000-000000000004', name: 'GCash', type: 'ewallet' },
  { id: '00000000-0000-4000-8000-000000000005', name: 'Cash', type: 'cash' },
]

/** Writes the seed accounts once, guarded by a meta flag. Never overwrites an existing row. */
export async function seedAccounts() {
  await db.transaction('rw', db.accounts, db.meta, async () => {
    if (await db.meta.get(SEED_KEY)) return
    for (const a of SEED_ACCOUNTS) {
      if (await db.accounts.get(a.id)) continue
      // Stamped 1970 so that, on a new phone, the owner's own copy of these rows from the cloud always wins.
      await db.accounts.put({ ...a, short: a.name, archivedAt: null, userId: null, createdAt: EPOCH, updatedAt: EPOCH, deletedAt: null, dirty: 1 })
    }
    await db.meta.put({ key: SEED_KEY, value: new Date().toISOString() })
  })
}
