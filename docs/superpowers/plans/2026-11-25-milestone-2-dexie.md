# Milestone 2: Real Data on Dexie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-memory demo data with six persisted Dexie tables, add item add/edit/archive with all recurrences, and ship working Accounts, Paydays, and Export CSV screens.

**Architecture:** Pure logic (dates, paydays, recurrence, occurrences, CSV) lives in `src/lib/` and is unit-tested with Vitest. `src/db/` owns the Dexie schema and a write helper that stamps sync fields. The Pinia `money` store loads every row on start, writes to Dexie first and then patches its state, and keeps exposing the same getters the screens already use.

**Tech Stack:** Vue 3 `<script setup>` (JS), Pinia, Dexie 4, Vitest + fake-indexeddb (new dev deps), `@capacitor/filesystem` + `@capacitor/share` (new deps), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-11-25-milestone-2-dexie-design.md`

## Global Constraints

- Money is integer centavos; display only through `peso()`; every displayed amount has the `num` class.
- Local dates are `YYYY-MM-DD` strings built with `iso(y, m, d)` (0-based month, may overflow, day clamps to month end). Never `toISOString()` for a local date. `createdAt` / `updatedAt` / `deletedAt` / `archivedAt` are UTC instants from `new Date().toISOString()`.
- Every row: `id` (`crypto.randomUUID()`), `userId` (`null` until milestone 7), `createdAt`, `updatedAt`, `deletedAt` (`null`; soft delete only, never `table.delete()`).
- Field names are camelCase.
- Paydays: 15th covers due days 15–29; 30th (or the month's last day) covers the 30th through the 14th of next month. No weekend shift.
- Write order: Dexie first, then store state. If the Dexie write throws, state is unchanged and the error propagates.
- Never clear or delete the Dexie database, in code or in migrations.
- UI: existing tokens and components only (`GroupList`, `BottomSheet`, `FieldRow`, `CategoryTile`); icons only from `src/lib/icons.js`; inputs 16px+; tap targets ≥ 44px; plain-English copy; buttons name their action.
- Seeded accounts, exactly: BDO (`bank`), GoTyme (`bank`), MariBank (`bank`), GCash (`ewallet`), Cash (`cash`).

## Review Focus

1. **A Dexie write fails** (quota, private mode): the store must not show the change as saved. → Task 4 test `action leaves state unchanged when the write throws`.
2. **Editing an item that has an overdue unpaid bill**: the new amount applies to that overdue bill (it's the next unpaid occurrence); paid months keep their old amount and due day. → Task 2 test `edit applies from the next unpaid occurrence`.
3. **Loan already finished or nearly finished** (`paidBefore >= totalPayments`): no occurrences, progress shows complete, nothing goes overdue. → Task 2 test `loan with all payments made has no occurrences`.
4. **App left open past midnight**: Home must move to the new day when the app comes back to the foreground. → Task 4 test `refreshToday updates today`.
5. **Names and notes with commas, quotes, or line breaks** in the CSV export. → Task 9 test `escapes commas quotes and newlines`.

---

### Task 1: Vitest, date helpers, payday rules

**Files:**
- Create: `vitest.config.js`, `src/lib/dates.js`, `src/lib/payday.js`, `src/lib/dates.test.js`, `src/lib/payday.test.js`
- Modify: `package.json` (add `vitest` dev dep, `"test": "vitest run"`)

**Interfaces:**
- Produces (`src/lib/dates.js`): `iso(y, m, d) → string` (moved verbatim from `src/data/demo.js`), `toDate(iso) → Date`, `todayIso(now = new Date()) → string`, `daysBetween(a, b) → number`, `addDays(iso, n) → string`, `addMonths(iso, n, day) → string` (month offset, clamped to `day`).
- Produces (`src/lib/payday.js`): `paydayFor(dueIso) → { bucket: '15'|'30', date, from, to }` (moved from `stores/money.js`, unchanged behavior), `nextPaydayAfter(p)`, `paydayForDue(dueIso, override = 'auto') → same shape` (rule 6).

- [ ] **Step 1: Install Vitest and add the config** — `npm i -D vitest fake-indexeddb`; `vitest.config.js` reuses the `@` alias from `vite.config.js` (import the same uppercase-normalized `src` path logic), `environment: 'node'`.
- [ ] **Step 2: Write failing tests**
  - `iso clamps to month end`: `iso(2026, 1, 31) === '2026-02-28'`, `iso(2028, 1, 30) === '2028-02-29'`, `iso(2026, 12, 5) === '2027-01-05'`.
  - `addMonths clamps`: `addMonths('2026-01-31', 1, 31) === '2026-02-28'`, `addMonths('2026-02-28', 1, 31) === '2026-03-31'`.
  - `paydayFor buckets`: due `'2026-12-20'` → `{ bucket: '15', date: '2026-12-15' }`; due `'2026-12-10'` → `{ bucket: '30', date: '2026-11-30' }`; due `'2026-12-30'` → `{ bucket: '30', date: '2026-12-30' }`; due `'2027-02-28'` → `{ bucket: '30', date: '2027-02-28' }`; due `'2027-03-01'` → `{ bucket: '30', date: '2027-02-28' }`.
  - `paydayForDue overrides` (rule 6): `('2026-12-10', '15')` → date `'2026-11-15'`; `('2026-12-20', '30')` → date `'2026-11-30'`; `('2026-12-20', '15')` → date `'2026-12-15'`; `('2026-12-03', '15')` → date `'2026-11-15'`; `('2026-12-10', 'auto')` equals `paydayFor('2026-12-10')`.
- [ ] **Step 3: Run `npm test`** — expect FAIL (modules missing).
- [ ] **Step 4: Implement** `src/lib/dates.js` and `src/lib/payday.js`. `paydayForDue` with an override returns the latest payday of that bucket whose date is ≤ the due date.
- [ ] **Step 5: Run `npm test`** — expect PASS.
- [ ] **Step 6: Commit** — `Add Vitest and date and payday helpers`.

### Task 2: Recurrence engine with schedule versions and loans

**Files:**
- Create: `src/lib/recurrence.js`, `src/lib/recurrence.test.js`

**Interfaces:**
- Consumes: `iso`, `addDays`, `addMonths`, `toDate` from Task 1.
- Item shape this task defines (used by Tasks 3–7):
  ```js
  {
    id, name, kind: 'bill'|'subscription'|'loan', category, accountId,
    paydayBucket: 'auto'|'15'|'30', reminderOffsets: [3, 1, 0], reminderTime: '09:00', notes: '',
    startDate,            // first due date (rule 3)
    totalPayments: null,  // loans only
    paidBefore: 0,        // loans only: payments made before the app
    schedule: [           // rule 2; sorted by effectiveFrom, first one === startDate
      { effectiveFrom, recurrence: 'monthly'|'yearly'|'weekly'|'once', dueDay, dueMonth, interval, amount, variable }
    ],
    archivedAt: null, userId, createdAt, updatedAt, deletedAt
  }
  ```
- Produces: `dueDates(item, toIso) → [{ due, amount, variable }]`, from `startDate` through `toIso`. `loanEndDate(item) → iso|null` (due date of payment number `totalPayments - paidBefore`). `loanProgress(item, paidCount) → { paid, total }`. `withScheduleEdit(item, changes, nextUnpaidDue) → item`. It appends a version effective `nextUnpaidDue` when any of `recurrence, dueDay, dueMonth, interval, amount, variable` changed. Otherwise it returns the item with only non-schedule fields merged.

- [ ] **Step 1: Write failing tests**
  - `monthly clamps day 31`: monthly `dueDay: 31`, start `'2026-01-31'`, to `'2026-04-30'` → dues `['2026-01-31','2026-02-28','2026-03-31','2026-04-30']`.
  - `yearly Feb 29`: yearly `dueMonth: 1, dueDay: 29` (0-based month), start `'2028-02-29'`, to `'2030-03-01'` → `['2028-02-29','2029-02-28','2030-02-28']`.
  - `every 2 weeks`: weekly `interval: 2`, start `'2026-11-02'`, to `'2026-12-01'` → `['2026-11-02','2026-11-16','2026-11-30']`.
  - `once`: start `'2026-12-05'` → `['2026-12-05']` for any `toIso >= '2026-12-05'`, `[]` before.
  - `nothing before startDate`: monthly day 10, start `'2026-11-25'` → first due `'2026-12-10'`. (Start date is a due date in practice, but the engine must not emit earlier dates.)
  - `edit applies from the next unpaid occurrence`: monthly day 20, ₱1,000.00, start `'2026-09-20'`; `withScheduleEdit(item, { dueDay: 22, amount: 120000 }, '2026-11-20')`, then `dueDates(_, '2026-12-31')` → `[{ due: '2026-09-20', amount: 100000 }, { due: '2026-10-20', amount: 100000 }, { due: '2026-11-22', amount: 120000 }, { due: '2026-12-22', amount: 120000 }]`.
  - `name-only edit adds no version`: `withScheduleEdit(item, { name: 'X' }, …).schedule.length === 1`.
  - `loan end`: monthly day 10, start `'2026-12-10'`, `totalPayments: 24, paidBefore: 9` → `loanEndDate === '2028-02-10'` (15 more payments), `dueDates(_, '2030-01-01').length === 15`, `loanProgress(item, 2)` → `{ paid: 11, total: 24 }`.
  - `loan with all payments made has no occurrences`: `totalPayments: 12, paidBefore: 12` → `dueDates` is `[]`, `loanProgress(item, 0)` → `{ paid: 12, total: 12 }`.
- [ ] **Step 2: Run `npm test`** — expect FAIL.
- [ ] **Step 3: Implement `src/lib/recurrence.js`.** Each version applies from its `effectiveFrom` to the next version's `effectiveFrom` (exclusive). A new version's monthly/yearly series starts at the first matching date on or after `effectiveFrom`; weekly continues from `effectiveFrom`.
- [ ] **Step 4: Run `npm test`** — expect PASS.
- [ ] **Step 5: Commit** — `Add recurrence engine with schedule versions and loans`.

### Task 3: Occurrences and Home groups as pure functions

**Files:**
- Create: `src/lib/occurrences.js`, `src/lib/occurrences.test.js`

**Interfaces:**
- Consumes: `dueDates`, `loanProgress` (Task 2); `paydayForDue`, `daysBetween`, `addMonths` (Task 1).
- Produces: `buildOccurrences({ items, cards, cardStatements, payments }, today) → Occurrence[]`, `homeGroups(occurrences, today) → { overdue, week, later, paid }`.
- Occurrence shape keeps the fields screens read today: `{ key, ref, type, id, name, kind, category, due, amount, minimum, paid, left, status, overdue, daysLeft, account, variable, payday }`. `account` is the item's `accountId`, so `OccurrenceRow` and `MarkPaidSheet` need no change. `payday` is the `date` from `paydayForDue(due, item.paydayBucket)`.

- [ ] **Step 1: Write failing tests** (move the paid/variable/minimum rules from `occ()` in `stores/money.js`)
  - `items generate through two months out`: today `'2026-11-25'`, monthly day 20 from `'2026-11-20'` → dues `['2026-11-20','2026-12-20','2027-01-20']`.
  - `archived items are skipped`: same item with `archivedAt` set → `[]`.
  - `variable bill settles on any payment`: amount 341250, `variable: true`, one payment of 298870 for its ref → `status: 'paid'`, `amount: 298870`.
  - `card without statement has no occurrence`: one card, no statements → no `type: 'card'` entries.
  - `card with statement`: statement `{ cardId, dueDate: '2026-12-27', balance: 1248000, minimum: 62400 }`, payment 62400 for `card:<id>:2026-12-27` → `status: 'minimum'`.
  - `overdue reaches back`: today `'2026-11-25'`, monthly day 10 from `'2026-08-10'`, Aug, Oct, Nov paid, Sep unpaid → `homeGroups(...).overdue` is exactly the `'2026-09-10'` occurrence (older than last month).
  - `override payday`: due day 10, `paydayBucket: '15'` → occurrence for `'2026-12-10'` has `payday: '2026-11-15'`.
- [ ] **Step 2: Run `npm test`** — expect FAIL.
- [ ] **Step 3: Implement.** Generate item occurrences from `startDate` to the last day of the month two months after `today`. `homeGroups`: `overdue` = unpaid with `due < today` (any age); `week` = unpaid with 0–7 days left; `later` = unpaid with 8–21 days left; `paid` = paid with due in today's month.
- [ ] **Step 4: Run `npm test`** — expect PASS.
- [ ] **Step 5: Commit** — `Move occurrence and Home grouping logic into tested pure functions`.

### Task 4: Dexie database and the store on real data

**Files:**
- Create: `src/db/index.js`, `src/db/seed.js`, `src/db/db.test.js`, `src/stores/money.test.js`
- Modify: `src/stores/money.js` (rewrite), `src/App.vue`, `src/components/MarkPaidSheet.vue` (`yesterday` without `toISOString`), `src/views/PaydayView.vue` (filter by `o.payday === p.date`), `src/views/HomeView.vue` (`money.ready` guard only)
- Delete: `src/data/demo.js`

**Interfaces:**
- Produces (`src/db/index.js`): `db` (Dexie `'payapa'`, version 1). Stores: `accounts: 'id'`, `items: 'id'`, `cards: 'id'`, `installments: 'id, cardId'`, `card_statements: 'id, cardId'`, `payments: 'id, ref, paidOn'`, `meta: 'key'`. `save(table, row) → Promise<row>` stamps `id`, `userId: null`, `createdAt` on insert, and `updatedAt` always. `softDelete(table, id)` sets `deletedAt` and `updatedAt`. `loadAll() → { accounts, items, cards, installments, cardStatements, payments }` returns rows with `deletedAt == null`. Archived rows are included.
- Produces (`src/db/seed.js`): `seedAccounts()` writes the five Global Constraints accounts once, guarded by `meta` key `'seeded.accounts'`. Ids are fixed constants `'00000000-0000-4000-8000-00000000000{1..5}'`. Each account: `{ name, short, type, archivedAt: null }` (`short` equals `name`).
- Produces (store `useMoney`): state `{ ready, today, accounts, items, cards, installments, cardStatements, payments }`.
  - Actions: `load()`, `refreshToday()`, `addItem(fields)`, `updateItem(id, changes)` (calls `withScheduleEdit` with the due date of the item's earliest unpaid occurrence, or its next due date on or after today when nothing is unpaid), `archiveItem(id)`, `unarchiveItem(id)`, `addCard`, `updateCard`, `archiveCard`, `unarchiveCard`, `addAccount`, `updateAccount`, `archiveAccount`, `markPaid(o, { amount, paidOn, account, referenceNo }) → payment`, `undoPayment(id)` (soft delete).
  - Getters keep their names: `account(id)`, `occurrences`, `home`, `paydays`, `periodSummary(p)`, `history`.
  - New getters: `activeAccounts`, `activeItems`, `activeCards`.
  - Payments are stored with `accountId`. `history` entries expose `account` (= `accountId`) as before.

- [ ] **Step 1: Write failing tests** (`import 'fake-indexeddb/auto'`; fresh `db` per test via `db.delete()` **in tests only**)
  - `save stamps sync fields`: `save('items', { name: 'A' })` → uuid `id`, `userId === null`, `createdAt === updatedAt`, `deletedAt === null`; second `save` keeps `createdAt`, bumps `updatedAt`.
  - `softDelete hides from loadAll`: after `softDelete('payments', id)`, `loadAll().payments` is empty and the row still exists in `db.payments`.
  - `seedAccounts runs once`: calling twice → exactly 5 accounts, names `['BDO','GoTyme','MariBank','GCash','Cash']`. Seeding again after the user archives GCash leaves it archived.
  - `action leaves state unchanged when the write throws`: stub `db.items.put` to reject; `await expect(money.addItem({...})).rejects…`; `money.items.length` unchanged.
  - `markPaid then undo`: payment appears in `history`, `undoPayment` removes it from state and sets `deletedAt` in Dexie.
  - `refreshToday updates today`: with fake timers at `2026-11-25T23:59` local, then `2026-11-26T00:01`, `refreshToday()` → `money.today === '2026-11-26'`.
- [ ] **Step 2: Run `npm test`** — expect FAIL.
- [ ] **Step 3: Implement `src/db/`, rewrite the store, delete `demo.js`.** `App.vue`: call `money.load()` on mount, then render `<RouterView>` only when `money.ready`. If `load()` throws, show one line, "Couldn't open your data.", with a Retry button. Add `document.addEventListener('visibilitychange', …)` to call `money.refreshToday()` when visible.
- [ ] **Step 4: Run `npm test`** — expect PASS. Run `npm run build` — expect no errors.
- [ ] **Step 5: Manual check** (`npm run dev`, 390×844): first open shows Home with no items (empty-state task comes later, an empty list is fine here); Settings shows 5 accounts; reload keeps them.
- [ ] **Step 6: Commit** — `Store data in Dexie and load it into the money store`.

### Task 5: Add / edit sheet with all recurrences and loans

**Files:**
- Modify: `src/components/AddSheet.vue`, `src/stores/ui.js`

**Interfaces:**
- Consumes: store actions from Task 4, `paydayForDue` (Task 1), `ordinal` from `lib/format.js`.
- Produces (`ui` store): `openAdd()` (chooser), `openEdit({ type: 'item'|'card', id })` (form pre-filled, chooser skipped). `addOpen` stays the open flag; add `editing: null | { type, id }`.

- [ ] **Step 1: Bill / subscription form** — add rows in this order after Amount: **Repeats** (`Monthly`, `Yearly`, `Every few weeks`, `Once`), then the date rows for that choice: Monthly → Due day; Yearly → Month + Day; Every few weeks → Every (`1`–`8`) weeks; Once → no extra row. Then **First due** (native date input, pre-filled with the next due date on or after today from the current choice, re-filled when the choice changes unless the user edited it). Then **Payday** (`Automatic`, `15th`, `30th`).
- [ ] **Step 2: Loan form** — Name, Monthly amount, Due day, **Total payments** (number), **Already paid** (number, default 0), First due, Payday, Remind me, Usually paid from.
- [ ] **Step 3: Payday hint line** — replace the inline 15th/30th guess with `paydayForDue(firstDue, bucket)`: "Covered by your Dec 15 payday."
- [ ] **Step 4: Edit mode** — when `ui.editing` is set, title "Edit {name}", button "Save changes", calls `updateItem` / `updateCard`; toast "{name} updated".
- [ ] **Step 5: Save** — `addItem` builds one `schedule` version with `effectiveFrom === startDate`; amounts through the existing `cents()` parser; `reminderOffsets` from the Remind me choice (`[3,1,0]`, `[1,0]`, `[0]`, `[]`). Card form unchanged except saving through `addCard` (no `statement` field).
- [ ] **Step 6: Manual check** (390×844, light and dark): add one of each recurrence and a loan; each appears on Home or Payday on the right dates; edit Meralco's amount and confirm last month's paid bill is unchanged; reload keeps everything.
- [ ] **Step 7: Commit** — `Add and edit items with every recurrence and loans`.

### Task 6: Item detail — edit, archive, real reminders, loan progress

**Files:**
- Modify: `src/views/ItemDetailView.vue`
- Create: `src/components/ConfirmSheet.vue`

**Interfaces:**
- Consumes: `ui.openEdit`, `archiveItem`, `unarchiveItem`, `loanProgress`.
- Produces: `ConfirmSheet` props `{ open, title, body, confirmLabel }`, emits `confirm`, `close`. It's built on `BottomSheet`, with the confirm button styled `bg-surface-2 text-ink` (not red, per CLAUDE.md).

- [ ] **Step 1:** Edit button → `ui.openEdit({ type: 'item', id })`.
- [ ] **Step 2:** Archive button → `ConfirmSheet`. Title "Archive {name}?", body "It leaves Home and Payday. Past payments stay in History.", button "Archive {name}". On confirm: `archiveItem`, `router.replace('/')`, then toast "{name} archived" with Undo → `unarchiveItem`.
- [ ] **Step 3:** Subtitle reads the current schedule version ("monthly on the 20th", "yearly on Mar 5", "every 2 weeks", "once on Dec 5"). The Reminders row formats `reminderOffsets` ("3 days, 1 day, on the day", "Off" when empty). For loans, add a "Progress" row: "{paid} of {total} paid".
- [ ] **Step 4: Manual check:** archive then Undo restores the item on Home; archive, leave, and the item's payments still show by name in History.
- [ ] **Step 5: Commit** — `Edit and archive items from item detail`.

### Task 7: Home first run, greeting name, cards without statements

**Files:**
- Modify: `src/views/HomeView.vue`, `src/views/SettingsView.vue`, `src/views/CardsView.vue`, `src/views/CardDetailView.vue`, `src/components/CardFace.vue`
- Create: `src/lib/prefs.js`

**Interfaces:**
- Produces (`src/lib/prefs.js`): `userName` (a `ref` loaded from localStorage `payapa.name`, try/catch), `setUserName(v)`. Same pattern as `lib/theme.js`.

- [ ] **Step 1: Home empty state** — when `activeItems` and `activeCards` are both empty: keep the header, hide the summary card and groups, show "Add your bills, subscriptions, and cards to see what's due before each payday." and a full-width teal button "Add your first bill" → `ui.openAdd()`.
- [ ] **Step 2: Greeting** — "{greeting}, {userName}", or just "{greeting}" when no name is set. Settings profile card: the name becomes an inline text field (placeholder "Your name"). Remove the hard-coded "Kit", and remove the "Sample data shown…" note from Settings if it's present.
- [ ] **Step 3: Cards with no statement** — `CardFace` with no `occ` shows "No statement yet" where the amount goes. `CardsView`'s "left on this cycle" total already skips them (`?? 0`). It reads "No cards yet" with an "Add a card" button when there are no active cards. `CardDetailView` guards every `occ.` use; with no `occ`, it hides "Mark a payment" and "Enter statement" and shows "Statements arrive in a later update." *(Remove this line in milestone 4.)*
- [ ] **Step 4: Manual check:** a fresh profile (clear site data in dev tools) shows the empty state; add a card and the Cards tab shows "No statement yet" with no crash on its detail page.
- [ ] **Step 5: Commit** — `Add first-run state, greeting name, and statement-less cards`.

### Task 8: Settings — Accounts and Paydays screens

**Files:**
- Create: `src/views/AccountsView.vue`, `src/views/PaydaysView.vue`, `src/components/AccountSheet.vue`
- Modify: `src/router/index.js`, `src/views/SettingsView.vue`

**Interfaces:**
- Routes: `/settings/accounts` (`meta: { back: true, title: 'Accounts' }`), `/settings/paydays` (`meta: { back: true, title: 'Paydays' }`). The Settings rows link to them.

- [ ] **Step 1: Accounts** — `GroupList` of active accounts (name, type label "Bank" / "E-wallet" / "Cash"), tap opens `AccountSheet` (Name, Short name, Type; "Save changes"; "Archive {name}" through `ConfirmSheet`). "Add account" button at the bottom opens it empty. Archived accounts are hidden from the list and from both pickers (Add sheet, mark-paid chips) but still name past payments.
- [ ] **Step 2: Paydays** — read-only: two rows, "15th payday · covers bills due on the 15th–29th · {n} items" and "30th payday · covers bills due on the 30th–14th · {n} items". Item counts come from `activeItems` by `paydayForDue(nextDue, paydayBucket).bucket`. One line under: "To move a bill to the other payday, edit it and change Payday."
- [ ] **Step 3: Manual check:** rename GCash and see it in the mark-paid chips; archive Cash, and it's gone from pickers while past Cash payments still say Cash in History.
- [ ] **Step 4: Commit** — `Add Accounts and Paydays settings screens`.

### Task 9: Export CSV

**Files:**
- Create: `src/lib/csv.js`, `src/lib/csv.test.js`, `src/lib/exportData.js`
- Modify: `package.json` (`@capacitor/filesystem`, `@capacitor/share`), `src/views/SettingsView.vue`, `CLAUDE.md`

**Interfaces:**
- Produces: `toCsv(rows, columns) → string` (RFC 4180, CRLF line ends, header row first). `exportAll() → Promise<void>` writes `accounts.csv, items.csv, cards.csv, installments.csv, card_statements.csv, payments.csv` from Dexie, **including** soft-deleted rows. `schedule` and `reminderOffsets` are JSON strings in one cell.

- [ ] **Step 1: Write failing tests**
  - `header and rows`: `toCsv([{ a: 1, b: 'x' }], ['a','b']) === 'a,b\r\n1,x\r\n'`.
  - `escapes commas quotes and newlines`: value `'Meralco, "home"\nunit 4'` → `'"Meralco, ""home""\nunit 4"'`.
  - `null and undefined are empty`: `{ a: null }` → `'a\r\n\r\n'`.
- [ ] **Step 2: Run `npm test`** — expect FAIL. **Step 3:** implement `toCsv`. **Step 4:** expect PASS.
- [ ] **Step 5: `exportAll`** — on native (`Capacitor.isNativePlatform()`): write each file to `Directory.Cache` under `payapa-export-{YYYY-MM-DD}/`, then `Share.share({ files: [uris], title: 'Payapa export' })`. On the web: trigger a download per file with a Blob link. The Settings row "Export as CSV" calls it, then shows the toast "Exported 6 files".
- [ ] **Step 6: Install and sync** — `npm i @capacitor/filesystem @capacitor/share`, `npm run android:sync`, and confirm `npm run android:debug` builds.
- [ ] **Step 7: Manual check:** in the browser, six files download and open in a spreadsheet with correct columns. On the phone, the share sheet appears and saving to Files works.
- [ ] **Step 8: Update `CLAUDE.md`** — Structure (`src/db/`, `src/lib/dates.js`, `payday.js`, `recurrence.js`, `occurrences.js`, `csv.js`, `prefs.js`, the new views; `data/demo.js` removed), Commands (`npm test`), "Data and storage" (Dexie is live; the sample-data note removed), Build plan (milestone 2 ✅).
- [ ] **Step 9: Commit** — `Add CSV export and mark milestone 2 done`.
