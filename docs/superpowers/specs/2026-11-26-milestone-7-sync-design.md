# Milestone 7: Supabase sync

Discussed in chat on Nov 26, 2026. Supabase project and email are set up by the owner (custom SMTP through Gmail, code templates on "Magic link or OTP" and "Confirm signup").

## Why

PRODUCT.md / spec: data that survives a lost or reset phone, and the app still usable offline. Today everything lives only in the phone's IndexedDB. Local-first stays: every change saves to Dexie first, then syncs to Supabase when online. Nothing in the app ever waits on the network.

## Goals

- Sign in once per device with an email and a 6-digit code.
- Back up every row of the six tables to Postgres, locked to the owner by RLS (`user_id = auth.uid()`).
- Two-way sync, last write wins per row on `updated_at`; soft deletes sync as deletes.
- A new phone that signs in gets all the data back.
- Signed out, the app works exactly as today.

Non-goals: realtime push between devices, sharing between users, sync of preferences (theme, name, reminder settings), import from the cloud as a "restore point", account deletion.

Anti-goals: anything that can lose or overwrite newer data, anything that blocks the app on the network, any card number reaching the server.

## Constraints

- Supabase free plan: pauses after a week without activity; the app must treat a paused project like being offline.
- Project URL `https://tiuopebbdoqxtltjeuur.supabase.co`, publishable key `sb_publishable_…` (public by design; lives in `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`). The secret / service_role key is never used.
- Never change the WebView origin. Never `db.delete()` / `table.clear()` outside tests.
- Money stays integer centavos (`bigint`), dates stay `date` (`YYYY-MM-DD`), timestamps `timestamptz`.

## Approaches

The table shape was already settled in CLAUDE.md ("milestone 7 maps them to snake_case columns"), so this is the one sensible design. Considered and dropped:
- One `jsonb data` column per table: less mapping code, but the data is opaque in Supabase's table editor and SQL, against the spec's reason for picking Postgres.
- supabase-js realtime subscriptions: instant cross-device updates, but a single owner on one phone gains nothing and it keeps a socket open.
- Sign-in by magic link or Google: links need app-link setup and break in in-app browsers; Google needs a native plugin and a Cloud project. Email code chosen.

## Database (SQL the owner runs once in the SQL Editor)

Six tables mirroring Dexie, snake_case columns, plus:
- **Primary key `(user_id, id)`.** The seed accounts have fixed ids (`00000000-…-000000000001`…), the same on every install, so `id` alone would collide between users.
- **`synced_at timestamptz`**, set by a trigger to the server's `now()` on every insert and update. Pulls page on `synced_at`, the server clock, so a phone with a wrong clock can't hide rows from another phone's pull.
- **A last-write-wins trigger**: an update whose `updated_at` isn't newer than the stored row's is skipped. So pushing an older row never overwrites a newer one, whatever order phones push in.
- **RLS** on every table: select / insert / update where `user_id = auth.uid()`; no delete policy (deletes are soft).
- No foreign keys (rows may arrive in any order); `user_id` defaults to `auth.uid()`.
- Columns per table:
  - `accounts`: name, short, type, network, bank, archived_at
  - `items`: name, kind, category, account_id, start_date, payday_bucket, reminder_offsets jsonb, reminder_time, notes, total_payments, paid_before, schedule jsonb, archived_at
  - `cards`: name, type, tone, network, provider, credit_limit bigint, statement_day, due_day, account_id, payday_bucket, reminder_offsets jsonb, archived_at. **No `last4` column.**
  - `installments`: card_id, description, monthly_amount bigint, months, first_statement_date
  - `card_statements`: card_id, statement_date, due_date, statement_balance bigint, minimum_due bigint
  - `payments`: ref, amount bigint, paid_on, account_id, reference_no, note
  - all: id uuid, user_id uuid, created_at, updated_at, deleted_at, synced_at

The SQL lives in `supabase/schema.sql` in the repo.

## Sync

`src/lib/sync.js`, pure where possible (mapping and merge tested in Vitest with a fake client).

- **Mapping:** each table has an explicit column list; camelCase ↔ snake_case. Local fields not in the list stay on the phone and aren't pushed (and a pulled row merges over the local one, keeping them). `last4` is never sent.
- **Push uses a per-row `dirty` flag, not a time cursor** (builder check: a cursor follows other phones' clocks and can strand local edits). Dexie `version(2)` adds a `dirty` index on the six tables; `save()` and `softDelete()` set `dirty: 1`. Push sends dirty rows in pages of 500 (`upsert` on `(user_id, id)`); after the server accepts a page, each row gets `dirty: 0` and `userId` = the signed-in user, but only if its `updatedAt` hasn't changed meanwhile (an edit during the upload stays dirty). The migration marks every existing row dirty, so the first sign-in uploads everything.
- **Pull:** rows with `synced_at` after the table's pull cursor (in Dexie `meta`), in pages of 1000. A pulled row replaces the local one only when its `updated_at` is newer (or the local row is missing). Written to Dexie directly with `dirty: 0`, without re-stamping `updatedAt`.
- **Order per run:** push all tables, then pull all tables, then the store reloads from Dexie if anything came in (Home, reminders and the rest follow).
- **When:** after load when signed in, ~2 s after any local change (debounced), when the app returns to the foreground, when the phone comes back online, and from "Sync now". One run at a time; a run requested during a run queues one more.
- **Errors:** network failure or a paused project → status "Offline, will sync later", retried on the next trigger. Auth expiry → supabase-js refreshes; if refresh fails, status "Sign in again".
- **userId:** while signed in, `save()` writes the signed-in user's id on the row (the db layer holds the current user id). Rows saved while signed out have `userId: null` ("not yet backed up") and are claimed by the next sign-in, since this is a single-owner phone. Push writes the user id back onto each local row it uploads, without changing `updatedAt`.

## First sign-in, new phone, seed accounts

- **This phone, first sign-in:** push cursors start empty, so everything on the phone uploads.
- **New phone:** it seeds its five accounts, then signs in and pulls. To stop the fresh seed overwriting the owner's edited BDO / GCash rows (same ids, newer timestamp), **seed rows are written with `updatedAt` 1970-01-01**, so any cloud version wins. The seed rows already on this phone keep their real timestamps; they're the originals.
- **A different account:** if any local row carries a user id other than the one signing in, sign-in stops (signs straight back out) with "This phone has data from another account." Rows with `userId: null` don't block. (Single-owner app; merging two people's data is out of scope.)
- **Sign-out** keeps the rows, their user ids and both cursors. Signing back in as the same owner carries on where it stopped; a different account is blocked by the rule above, so stale cursors can't skip its rows.

## Screens

- **Settings → profile card "Sign in"** opens a sheet: Email → "Send code" → 6-digit code field (`inputmode="numeric"`, `autocomplete="one-time-code"`) → "Sign in". Errors in plain words ("That code didn't work. Check it or send a new one."). Resend after 60 s.
- Signed in, the card shows the email and "Backed up" instead of "Not signed in".
- **Settings → Backup and sync** (new screen `/settings/sync`): status line ("Synced 2 min ago" / "Syncing…" / "Offline, will sync later" / "Sign in again"), "Sync now", the account email, "Sign out". Signing out keeps everything on the phone and stops syncing; it asks first (ConfirmSheet), and says the data stays.
- Settings → Privacy row: "Backed up to your account" when signed in.

## Who can sign up (owner's decision)

Only the owner for now. The app calls `signInWithOtp` with sign-ups allowed, so the owner's first sign-in creates the account; the owner then turns off **Allow new users to sign up** (Authentication → Sign In / Providers). Anyone else then gets "This email isn't set up for Payapa yet." It's turned back on when Payapa opens to others (around milestone 8).

## Calls made while designing

- Session kept by supabase-js in localStorage (small; same origin rule as the database).
- Last write wins per whole row, not per field.
- No delete from the server ever; tombstones stay.
- Sync status time ("2 min ago") is local-only.

## Left to the builder

Exact page sizes, debounce timing, the online/visibility event wiring, how the store reloads after a pull.
