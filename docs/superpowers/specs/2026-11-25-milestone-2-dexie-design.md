# Milestone 2: real data on Dexie

Date: 2026-11-25 · Status: approved 2026-11-25

## Intent

Payapa stops running on in-memory demo data. Everything the owner types in (accounts, bills, subscriptions, loans, cards, payments) is saved on the phone in IndexedDB through Dexie and survives reloads, app restarts, and every later milestone. From the end of milestone 2 the owner can start entering real data and keep it.

Payapa is a tracker only: payments happen in bank and e-wallet apps and are recorded here by hand. Nothing in this milestone moves money.

## Goals

- All six tables from the spec live in Dexie: `accounts`, `items`, `cards`, `installments`, `card_statements`, `payments`. No screen shows sample data mixed with real data.
- Items (bills, subscriptions, loans) can be added, edited, and archived, with every recurrence the spec lists: monthly on day N, yearly on a date, every N weeks, one-off.
- Home, Payday, History, and item detail show real data. Marking something paid writes a real payment (the existing mark-paid sheet, now persisted).
- Cards and pay-later accounts can be added and edited (the existing Add sheet form, persisted). Their statements and installments arrive in milestone 4; until then a card with no statement shows "No statement yet" instead of an amount (rule 1 below).
- A first-run empty state on Home that leads to adding the first item.
- Settings screens that work: Accounts (list, add, edit, archive), Paydays (see below), Export CSV.
- The database is versioned from day one so later milestones add tables and fields through Dexie migrations without wiping data.

## Non-goals

- Statement entry, installment plans, card status from payments (milestone 4).
- Payment edit/delete beyond the existing Undo toast (milestone 3 polishes History and payment editing).
- Reminders (milestone 6), sign-in and Supabase sync (milestone 7), CSV import.
- Any visual redesign. Screens keep their current look; DESIGN.md changes only if a new component becomes part of the system.

## Anti-goals

- Losing data the owner typed. A schema change, an app update, or a bug in a migration must never clear the database.
- Fake numbers. No sample rows ever written into the real database.
- Blocking on the network, or anything that needs the network to open the app.

## Constraints (from CLAUDE.md, unchanged)

- Money is integer centavos; dates are local `YYYY-MM-DD` strings built with `iso()`; no `toISOString()` for local dates.
- Payday buckets: 15th covers the 15th–29th, 30th covers the 30th–14th of next month; no weekend shift.
- Every row carries `id` (uuid), `user_id`, `created_at`, `updated_at`, `deleted_at` for the milestone 7 sync (last write wins on `updated_at`). Deletes are soft deletes.
- Offline-first; localStorage only for small preferences.

## Approaches considered

1. **Dexie stores the data, Pinia keeps an in-memory copy (chosen).** On start the app loads every non-deleted row into the `money` store; each change writes to Dexie first, then updates the store. Screens and derived state (occurrences, paydays, Home groups) keep reading from the store. Data is small (dozens of rows, a few thousand payments after years), so loading everything is instant. Smallest change to existing code, and the row shape is exactly what milestone 7 needs.
2. **Screens read Dexie directly with live queries.** More idiomatic Dexie, but the occurrence and payday logic lives in the store, so it would be split across views or duplicated. Rejected: more rewiring, no benefit at this size.
3. **A Pinia persistence plugin that saves the whole store.** Quickest, but stores one blob, not rows with per-row `updated_at` / `deleted_at`. Rejected: incompatible with the milestone 7 sync.

The owner picked approach 1, and option A on scope (all six tables now, real data from milestone 2 on).

## Design

### Database (`src/db/index.js`)

- One Dexie database, `payapa`, version 1, with the six tables. Indexes only where the app queries: `id` primary key everywhere; `payments` indexed on `ref` and `paidOn`; `installments` and `card_statements` on `cardId`.
- Field names are camelCase in Dexie and in the app (`dueDay`, `accountId`, `createdAt`). Milestone 7 maps them to the snake_case Postgres columns in one place. *(Builder's call recorded: keeps every existing component unchanged.)*
- `userId` is `null` until sign-in exists; milestone 7 fills it on first sign-in.
- Every write goes through one small helper that sets `id` (`crypto.randomUUID()`), `createdAt`, `updatedAt`, and handles soft delete (`deletedAt`). Timestamps are ISO UTC instants (these are moments, not local dates, so `toISOString()` is correct here).
- Field lists follow the spec's data model table. Items: `name, kind (bill | subscription | loan), category, amount, variable, recurrence (monthly | yearly | weekly | once), dueDay, dueMonth, interval, startDate, endDate, paydayBucket (auto | 15 | 30), accountId, reminderOffsets, reminderTime, archivedAt, notes`, with the schedule fields held as versions (rule 2 below). Cards: `name, type (credit_card | pay_later), provider, last4, creditLimit, statementDay, dueDay, accountId, tone, archivedAt`. Accounts: `name, short, type (bank | ewallet | cash), archivedAt`. Payments keep the existing `ref` (`item:<id>:<due>` / `card:<id>:<due>`) plus `amount, paidOn, accountId, referenceNo, note`.

### Store (`src/stores/money.js`)

- State starts empty with `ready: false`. `App.vue` awaits `money.load()` before rendering routes (a blank ground-colored screen for the few milliseconds it takes; no spinner).
- Actions replace direct array pushes: `addItem / updateItem / archiveItem`, `addCard / updateCard / archiveCard`, `addAccount / updateAccount / archiveAccount`, `markPaid / undoPayment`. Each writes Dexie, then patches state.
- Archived items and cards are hidden from Home, Payday, and Cards but their payments stay in History.
- The `buildDemo()` import goes away. `src/data/demo.js` is deleted; `iso()` moves to `src/lib/dates.js` with the other date helpers (`toDate`, `todayIso`, `daysBetween`).

### Recurrence engine (`src/lib/recurrence.js`)

A pure function, `occurrencesBetween(item, fromIso, toIso)`, returns due dates for:

- **monthly**: day `dueDay` each month, clamped to the month's last day.
- **yearly**: `dueMonth` / `dueDay` each year, clamped (Feb 29 → Feb 28).
- **weekly**: every `interval` weeks from `startDate` (`interval` 1 = weekly, 2 = fortnightly).
- **once**: `startDate` only.

All respect `startDate` (no occurrences before it) and `endDate` (none after it; loans use this). The store's `occurrences` getter calls it for the same window it uses today (last month to two months out). An item's `paydayBucket` of `15` or `30` overrides the automatic bucket.

### Screens

- **Add sheet**: bill / subscription / loan forms gain a "Repeats" row (Monthly, Yearly, Every N weeks, Once) that swaps the date fields accordingly, plus a "First due" date (rule 3). Loans ask for total payments and payments already made instead (rule 5). Saving calls store actions. The same sheet opens pre-filled for **Edit** from item detail (title "Edit Meralco", button "Save changes").
- **Item detail**: Edit opens the sheet; Archive asks once in a small sheet ("Archive Meralco? It leaves Home and Payday; past payments stay in History.") then archives and returns to Home with an Undo toast. Reminders row shows the item's real offsets.
- **Home first run**: when there are no active items and no cards, Home shows the greeting header and an empty state: one line ("Add your bills, subscriptions, and cards to see what's due before each payday.") and a teal "Add your first bill" button that opens the Add sheet. No illustration.
- **Greeting name**: "Good evening, Kit" is hard-coded today. It becomes a name field in Settings → Profile area, stored as a preference; with no name set, the greeting is just "Good evening".
- **Cards**: a card with no statement shows "No statement yet" on its face and is left out of the "left on this cycle" total. Card detail shows the same, with statement entry arriving in milestone 4.
- **Settings → Accounts**: a list of accounts (name, type) with add, edit, and archive in a sheet. First run seeds the five accounts the owner uses (BDO, GoTyme, MariBank, GCash, Cash) as real, editable rows; this is setup, not sample data.
- **Settings → Paydays**: read-only explanation of the two paydays and which due days each covers, plus the count of items in each bucket. *(Per-item bucket overrides live on the item form, so this screen has nothing to edit in v1.)*
- **Settings → Export CSV**: writes one CSV per table (header row, amounts in centavos, soft-deleted rows included with their `deletedAt`) and hands them to the Android share sheet so they can be saved to Files, Drive, or email. Uses `@capacitor/filesystem` + `@capacitor/share` (new dependencies); in a desktop browser it downloads the files instead.
- **Settings banner**: "Sample data shown…" is removed.

### Rules settled during review (Claude's calls; owner to check)

1. **Cards before a statement exists.** A card with no statement has no occurrence: it doesn't appear on Home or Payday, adds nothing to totals, and can't be marked paid. Card detail hides "Mark a payment" and "Enter statement" until milestone 4. No card payments are recorded in milestone 2, so nothing can be orphaned when statements arrive.
2. **Editing an item never rewrites the past.** Each item keeps its schedule (`recurrence, dueDay, dueMonth, interval, amount, variable`) as a list of versions, each with an `effectiveFrom` date. An edit that changes any of those fields appends a version effective from the edited item's next unpaid occurrence. The recurrence engine uses whichever version was in force for each date. Past occurrences keep their due dates and amounts, so their payments still match. Edits to name, category, account, or reminders apply everywhere.
3. **First due date and overdue.** The add form shows a "First due" date, pre-filled with the next due date on or after today. The owner can move it back to a date that has already passed to log a bill not paid yet. Nothing before it is generated. An unpaid occurrence stays in Overdue on Home until it's paid, however old, because the first product goal is no missed due dates. The occurrence window starts at the earliest unpaid occurrence, not last month.
4. **Archive vs delete.** Archive is its own field, `archivedAt`, on items, cards, and accounts; it is not the soft delete. Archived rows stay loaded, so History still names their payments. They're hidden from Home, Payday, Cards, and pickers. Milestone 2 restores them only through the Undo toast; there's no Delete. `deletedAt` stays reserved for sync tombstones.
5. **Loans.** The loan form asks for the monthly amount, due day, total number of payments, and how many are already paid. From those the app sets the start date and the end date, so "9 of 24 paid" works without inventing past payments. Payments made before the app count toward progress only, not as History rows.
6. **Bucket override.** Moving an item to the other payday means it's paid from the nearest payday of that kind on or before its due date. An item due on the 10th moved to the 15th counts against the 15th of the previous month. An item due on the 20th moved to the 30th counts against the 30th (or the month's last day) of the previous month.
7. **Seeded accounts** get fixed ids (constants in code) and are seeded once, behind a `meta` flag in Dexie, so milestone 7 can't duplicate them across phones. Accounts gain a `short` field for the "Paid from" chips.
8. **Greeting name** is a local preference (`payapa.name` in localStorage). It doesn't sync, and it doesn't need to.

### Tests

There are no tests today. This milestone adds Vitest (dev dependency) with unit tests for the pure logic only: the recurrence engine, `paydayFor`, `iso()` clamping, occurrence paid/variable status, and CSV encoding. UI is still verified by running the app at 390×844 in light and dark, per CLAUDE.md.

## Left to the builder

- Exact Dexie index strings and helper names.
- How `load()` handles a Dexie open failure (must not wipe; showing a plain error with a retry is fine).
- Component breakdown for the Accounts list and the Archive confirm sheet, following existing patterns (`GroupList`, `BottomSheet`, `FieldRow`).
- CSV quoting details (RFC 4180).
