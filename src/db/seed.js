// First-run setup: the five accounts the owner uses. These are real, editable rows,
// not sample data. Fixed ids so a later sync can't duplicate them across phones.

import { db, save } from './index'

const SEED_KEY = 'seeded.accounts'

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
      await save('accounts', { ...a, short: a.name, archivedAt: null })
    }
    await db.meta.put({ key: SEED_KEY, value: new Date().toISOString() })
  })
}
