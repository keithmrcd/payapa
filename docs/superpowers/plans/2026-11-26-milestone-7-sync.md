# Milestone 7: Supabase Sync Implementation Plan

**Spec:** `docs/superpowers/specs/2026-11-26-milestone-7-sync-design.md`
**Execution:** inline, tests first; `npm test` after each task.

Config: `.env.local` (git-ignored by `*.local`) holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; `.env.example` documents them. Missing config = sync unavailable, app unchanged.

## Task 1: Dexie v2 + save() ownership (src/db)
- `db.version(2)`: add `dirty` index to the six tables; upgrade marks every row `dirty: 1`.
- `setCurrentUser(id|null)`; `save()` writes `dirty: 1` and `userId` = current user when set (else keeps the row's); `softDelete()` sets `dirty: 1`.
- `seedAccounts()` writes seed rows with `updatedAt`/`createdAt` `1970-01-01T00:00:00.000Z` (new installs only).
- Tests (db.test.js): save marks dirty and tags the user; signed-out save keeps userId null; softDelete marks dirty; seed rows stamped 1970; upgrade from v1 marks rows dirty.

## Task 2: mapping + merge (src/lib/sync.js)
- `TABLES` (dexie name ↔ remote name, column list); `toRemote(table, row, userId)` (snake_case, only listed columns, never `last4`), `fromRemote(table, rec)` (camelCase, `dirty: 0`, drops `synced_at`).
- `mergeRow(local, remote)` → row to write or null (remote newer or local missing).
- Tests: round trip per table, `last4` never sent, unlisted local fields kept on merge, older remote ignored.

## Task 3: push / pull / run (src/lib/sync.js)
- `push(client, userId)`: dirty rows per table, pages of 500, `upsert(onConflict: 'user_id,id')`; after success set `dirty: 0`, `userId` only if `updatedAt` unchanged.
- `pull(client)`: per table `synced_at > cursor` order asc, pages of 1000; merge; cursor in `meta` (`sync.pull.<table>`). Returns count of rows written.
- `foreignRows(userId)`: true if any local row has a different non-null userId.
- Tests with a fake client: push sends dirty rows and clears them; an edit during push stays dirty; pull merges and advances the cursor; paging.

## Task 4: schema (supabase/schema.sql)
Six tables, PK `(user_id, id)`, `user_id default auth.uid()`, `synced_at` trigger, last-write-wins BEFORE UPDATE trigger, RLS select/insert/update own rows, no delete policy.

## Task 5: client + session + runner
- `src/lib/supabase.js`: `createClient` when configured (session in localStorage, `detectSessionInUrl: false`).
- `src/stores/session.js` (Pinia): `user`, `status` ('off' | 'syncing' | 'ok' | 'offline' | 'auth' | 'error'), `lastSynced`; actions `sendCode(email)`, `verify(email, code)` (foreign-data guard → sign out + error), `signOut()`, `syncNow()`.
- Runner: one run at a time (+1 queued); triggers: after load, ~2 s after store changes (watch dirty writes via money store actions), visibility, `online`; after a pull with changes, `money.load()` re-reads.
- Tests: session store with a fake client (verify sets user + current user; foreign data blocks; sign-out keeps data).

## Task 6: screens
- `SignInSheet.vue` (email → code), opened from the Settings profile card.
- `SyncView.vue` at `/settings/sync`: status, Sync now, email, Sign out (ConfirmSheet).
- Settings: profile card shows email / "Backed up"; Backup and sync row status; Privacy row text.

## Finish
Owner runs `supabase/schema.sql`; live test against the project (sign in with the owner's code, push, pull); 390×844 light/dark; CLAUDE.md (structure, data rules, milestone 7); final review.
