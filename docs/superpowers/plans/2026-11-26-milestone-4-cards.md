# Milestone 4: Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statements can be entered, edited and deleted; a card whose statement date has passed shows on Home as "Statement not entered"; every statement is kept; installment plans count up on their own; cards are added by type → bank → form with no card number.

**Architecture:** Pure cycle and installment math in a new `src/lib/cards.js`. `buildOccurrences` emits one occurrence per entered statement plus at most one needs-statement occurrence per card. Store actions in `money.js` (Dexie first, then state), two new sheets (`StatementSheet.vue`, `InstallmentSheet.vue`) opened through `ui.js`, and the add sheet gains card-type and bank steps fed by `src/lib/issuers.js`.

**Tech Stack:** Vue 3 `<script setup>` (JS), Pinia, Dexie, Tailwind v4, Vitest + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-26-milestone-4-cards-design.md`. Also read `CLAUDE.md` (domain + UI rules) and `DESIGN.md` before UI tasks.

## Global Constraints

- Money is integer centavos; display with `peso()` and the `num` class.
- Dates are local `YYYY-MM-DD`; build with `lib/dates.js` (`iso(y, m0, d)` takes a **0-based** month and clamps the day). Never `toISOString()` for dates.
- Never `db.delete()` / `table.clear()` outside tests. Deletes are soft deletes (`softDelete`). No Dexie schema version change: `card_statements` and `installments` tables already exist.
- Card payment refs stay `card:<cardId>:<dueDate>`.
- Installments never change a statement's amount due (the SOA balance already includes them).
- No card number anywhere: no last 4, no full number, no CVV, no expiry.
- Every delete asks first (in-sheet confirm step, as in `MarkPaidSheet.vue`), then a toast with Undo. Delete buttons are `text-ink-2`, never red.
- Icons only from `src/lib/icons.js`; no brand logos; no new hex values; tap targets ≥ 44px; inputs ≥ 16px.
- Copy: plain, short; buttons name their action.
- Deferred minors go in CLAUDE.md's "Small issues backlog", tagged (M4).
- Test command: `npm test` (or `npm test -- <file>`); never `npx vitest` directly.
- Commit messages: imperative summary, short body, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Month edges:** statement day 31 in February, and a due day ≤ statement day (due lands next month, December → January rollover). Cycle dates must clamp and roll over correctly. (Task 1 tests.)
2. **A card added after this month's statement date and after its due date** must not get a needs-statement row for that cycle; one added after the statement date but before the due date must. (Task 2 tests.)
3. **Installment added during the needs-statement window** (anchor = last entered statement, not the closed cycle) must not count one month too many. (Task 1 test `anchor is the latest entered statement`.)
4. **Deleting a statement that has payments**, then Undo: payments come back and the statement is Partly paid / Paid again, also after a reload. (Task 3 test.)
5. **Editing a card's due day** must not move entered statements or orphan their payments. (Task 3 test.)

---

### Task 1: Cycle and installment math (`lib/cards.js`)

**Files:**
- Create: `src/lib/cards.js`, `src/lib/cards.test.js`

**Interfaces:**
- Produces:
  - `cycleFor(card, y, m0)` → `{ statementDate, dueDate, key }`. `statementDate = iso(y, m0, card.statementDay)`. `dueDate` = the first date with `card.dueDay` after `statementDate`: `iso(y, m0, dueDay)` if `dueDay > statementDay`, else `iso(y, m0 + 1, dueDay)`. `key` = `statementDate.slice(0, 7)`.
  - `latestClosedCycle(card, today)` → the cycle for today's month if its `statementDate <= today`, else the previous month's.
  - `nextCycle(card, cycle)` → the cycle one month after `cycle.statementDate`.
  - `addedOn(card)` → local `YYYY-MM-DD` of `card.createdAt` (`todayIso(new Date(card.createdAt))`), or `null` without `createdAt`.
  - `statementsFor(cardId, cardStatements)` → live statements for that card, newest `statementDate` first.
  - `firstStatementFromPaid(card, anchorDate, paid)` → `paid > 0`: `addMonths(anchorDate, -(paid - 1), card.statementDay)`; `paid === 0`: `addMonths(anchorDate, 1, card.statementDay)`.
  - `installmentAnchor(card, cardStatements, today)` → `{ date, label }`: the latest entered statement's `statementDate`, else `latestClosedCycle(card, today).statementDate`; `label` is the month name ("Nov").
  - `installmentProgress(plan, card, today)` → `{ paid, months, left, done }`. `paid` = number of months from `plan.firstStatementDate` through `latestClosedCycle(card, today).statementDate`, counted by year-month (0 if the closed cycle is before the first), capped at `plan.months`. `left = (months - paid) * plan.monthlyAmount`. `done = paid >= months`.

- [ ] **Step 1: Write failing tests** in `src/lib/cards.test.js`:

```js
const card = (statementDay, dueDay, extra = {}) => ({ id: 'c1', statementDay, dueDay, ...extra })

it('due lands the same month when the due day is after the statement day', () => {
  expect(cycleFor(card(2, 27), 2026, 10)).toEqual({ statementDate: '2026-11-02', dueDate: '2026-11-27', key: '2026-11' })
})
it('due lands next month when the due day is on or before the statement day', () => {
  expect(cycleFor(card(20, 5), 2026, 11).dueDate).toBe('2027-01-05')
})
it('statement day 31 clamps in February', () => {
  expect(cycleFor(card(31, 20), 2027, 1).statementDate).toBe('2027-02-28')
})
it('latestClosedCycle uses this month once the statement date has passed', () => {
  expect(latestClosedCycle(card(10, 1), '2026-11-10').statementDate).toBe('2026-11-10')
  expect(latestClosedCycle(card(10, 1), '2026-11-09').statementDate).toBe('2026-10-10')
})
it('addedOn is the local date of createdAt', () => {
  expect(addedOn({ createdAt: new Date(2026, 10, 3, 23, 30).toISOString() })).toBe('2026-11-03')
  expect(addedOn({})).toBe(null)
})
it('installment progress counts statement months and caps at months', () => {
  const plan = { firstStatementDate: '2026-09-10', months: 12, monthlyAmount: 499900 }
  expect(installmentProgress(plan, card(10, 1), '2026-11-26')).toEqual({ paid: 3, months: 12, left: 9 * 499900, done: false })
  expect(installmentProgress({ ...plan, months: 2 }, card(10, 1), '2026-11-26').done).toBe(true)
  expect(installmentProgress({ ...plan, firstStatementDate: '2026-12-10' }, card(10, 1), '2026-11-26').paid).toBe(0)
})
it('anchor is the latest entered statement, not the closed cycle', () => {
  // card stmt day 10; today Nov 26; only the Oct statement entered → anchor Oct 10
  // firstStatementFromPaid(card, anchor, 2) === '2026-09-10'; progress today (Nov closed) is 3
})
it('already paid 0 starts on the next statement after the anchor', () => {
  expect(firstStatementFromPaid(card(10, 1), '2026-11-10', 0)).toBe('2026-12-10')
})
```

- [ ] **Step 2: Run** `npm test -- src/lib/cards.test.js`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/lib/cards.js` with the signatures above, using `iso`, `addMonths`, `todayIso`, `toDate` from `./dates`.
- [ ] **Step 4: Run** `npm test -- src/lib/cards.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** "Add card cycle and installment math".

---

### Task 2: Occurrences for every statement and for a missing one

**Files:**
- Modify: `src/lib/occurrences.js` (card loop, `finish`), `src/lib/occurrences.test.js`

**Interfaces:**
- Consumes: `cycleFor`, `latestClosedCycle`, `addedOn` (Task 1).
- Produces:
  - Card occurrences: one per live statement: `{ ref: 'card:<id>:<dueDate>', type: 'card', statementId, statementDate, needsStatement: false, amount: statementBalance, minimum: minimumDue, … }`, as today minus `last4`.
  - At most one needs-statement occurrence per card: `{ ref: 'card:<id>:<dueDate>:statement', type: 'card', needsStatement: true, statementDate, due: dueDate, amount: 0, minimum: null, paid: 0, status: 'statement', left: 0, overdue: daysLeft < 0 }`, when the latest closed cycle has no live statement with the same `key` and (`addedOn(card)` is null or `dueDate >= addedOn(card)`).
  - `currentStatement(occurrences, cardId)` (exported from `occurrences.js`) → the earliest-due unpaid entered statement; else the needs-statement occurrence; else the latest-due statement; else `undefined`.
- `finish()`: when `needsStatement`, status is `'statement'` and it is never settled.

- [ ] **Step 1: Write failing tests** (replace `card uses the latest non-deleted statement` with the first one):

```js
it('every live statement is an occurrence; an older unpaid one goes overdue', () => {
  // statements due 2026-11-27 and 2026-12-27 (and a deleted one); today = '2026-12-01'
  // refs → ['card:c1:2026-11-27', 'card:c1:2026-12-27']; the Nov one has overdue === true
})
it('needs-statement row after the statement date passes', () => {
  // card stmt 2, due 27, createdAt Oct 1; today '2026-12-03'; no statement for 2026-12
  // one occurrence with needsStatement, due '2026-12-27', status 'statement', amount 0
})
it('no needs-statement row once that cycle is entered', () => {})
it('no needs-statement row for a cycle due before the card was added', () => {
  // card stmt 2, due 20, createdAt Dec 21 2026 local; today Dec 22 → none
  // same card createdAt Dec 10 → one (due Dec 20 is after Dec 10)
})
it('a needs-statement row counts nothing in home totals and is not "paid"', () => {
  // homeGroups(...).paid has no needsStatement rows; week has it
})
it('currentStatement prefers the earliest unpaid, then needs-statement, then latest', () => {})
```

- [ ] **Step 2: Run** `npm test -- src/lib/occurrences.test.js`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** in the card loop of `buildOccurrences`; `paydayForDue(due).date` for both kinds.
- [ ] **Step 4: Run** `npm test`. Expected: all PASS (other suites untouched).
- [ ] **Step 5: Commit** "Show every card statement and missing ones on Home".

---

### Task 3: Store actions for statements and installments

**Files:**
- Modify: `src/stores/money.js` (new "Statements" and "Installments" sections after Cards), `src/stores/money.test.js`

**Interfaces:**
- Produces:
  - `addStatement(cardId, { statementDate, dueDate, statementBalance, minimumDue })` → saved row. Throws `Error('duplicate')` if a live statement for that card already has the same `statementDate.slice(0, 7)`.
  - `updateStatement(id, fields)` → saved row. If the row has live payments (ref `card:<cardId>:<oldDue>`), `dueDate` is kept as it was, whatever is passed.
  - `statementPayments(id)` → live payments on that statement.
  - `deleteStatement(id)` → `{ statement, payments }` as they were; soft-deletes the statement and each payment, removes them from state.
  - `restoreStatement({ statement, payments })` → saves all back with `deletedAt: null`.
  - `addInstallment(cardId, { description, monthlyAmount, months, paid })` → saved row `{ cardId, description, monthlyAmount, months, firstStatementDate }`, anchor from `installmentAnchor`.
  - `updateInstallment(id, { description, monthlyAmount, months, paid? })`: `firstStatementDate` is recomputed only when `paid` is given and differs from today's `installmentProgress(...).paid`, then with anchor `latestClosedCycle(card, today).statementDate`.
  - `deleteInstallment(id)` → row as it was; `restoreInstallment(row)`.
  - `addCard` / `updateCard` always save `last4: null`; they accept `network` and `provider`.

- [ ] **Step 1: Write failing tests** in `describe('statements')` and `describe('installments')`:

```js
it('addStatement makes the card payable and clears the needs-statement row', async () => {})
it('addStatement rejects a second statement in the same month', async () => {
  await expect(money.addStatement(c.id, sameMonth)).rejects.toThrow('duplicate')
})
it('updateStatement keeps the due date once the statement has payments', async () => {})
it('deleteStatement removes its payments; restoreStatement brings both back, also after reload', async () => {})
it('editing a card due day leaves entered statements and their payments alone', async () => {})
it('addInstallment anchors on the latest entered statement', async () => {
  // card stmt 10; today Nov 26; Oct statement entered only; paid 2 → firstStatementDate '2026-09-10'
})
it('updateInstallment with an unchanged count keeps firstStatementDate', async () => {})
it('updateInstallment with a corrected count moves firstStatementDate', async () => {})
it('saving a card never stores last4', async () => {})
```

- [ ] **Step 2: Run** `npm test -- src/stores/money.test.js`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** the actions (same pattern as payments: Dexie first via `_put` / `softDelete`, then state).
- [ ] **Step 4: Run** `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit** "Add statement and installment store actions".

---

### Task 4: Statement sheet

**Files:**
- Create: `src/components/StatementSheet.vue`
- Modify: `src/stores/ui.js` (+ test in `src/stores/ui.test.js`), `src/App.vue` (mount sheet; route watcher closes it)

**Interfaces:**
- Consumes: Task 1 (`latestClosedCycle`, `nextCycle`, `cycleFor`), Task 3 actions.
- Produces: `ui.statementFor` (`{ cardId, statementId? }` or null), `ui.openStatement(target)` (clears toast, closes pay/payment sheets), `ui.closeStatement()`.

- [ ] **Step 1: Failing test** in `ui.test.js`: `openStatement clears the toast and closes the pay sheet`.
- [ ] **Step 2: Run** `npm test -- src/stores/ui.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `ui` actions, then the sheet:
  - Title "Nov statement" (month of the statement date) in edit mode, "Enter statement" in add mode; header names the card.
  - Add mode default: latest closed cycle if its key has no statement, else the next cycle; due date follows the statement date (via `cycleFor` on its month) until the owner edits the due date.
  - Fields (`FieldRow`): Statement date (date input), Due date (date input; disabled with hint "Locked: this statement has payments" when `statementPayments(id).length`), Statement balance, Minimum due (empty → 0).
  - Valid when balance is filled (≥ 0), minimum ≤ balance, due date > statement date. A duplicate month shows "You already entered the Nov statement." inline instead of saving.
  - Buttons: "Save statement" / "Save changes"; edit mode adds "Delete statement" (ink-2) → in-sheet confirm "Delete the Nov statement?" body "Its 2 payments are removed too." (omit the sentence with no payments), confirm "Delete statement" / Cancel → toast "Statement deleted" with Undo (`restoreStatement`).
  - Toasts: "Statement saved", "Statement updated".
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Add the statement sheet".

---

### Task 5: Installment sheet

**Files:**
- Create: `src/components/InstallmentSheet.vue`
- Modify: `src/stores/ui.js` (+ test), `src/App.vue`

**Interfaces:**
- Consumes: Task 1 `installmentAnchor`, `installmentProgress`; Task 3 actions.
- Produces: `ui.installmentFor` (`{ cardId, installmentId? }`), `ui.openInstallment(target)`, `ui.closeInstallment()`.

- [ ] **Step 1: Failing test** in `ui.test.js`: `openInstallment clears the toast`.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement**: fields Description, Monthly amount, Months (integer ≥ 1), Already paid (add mode, 0 ≤ n ≤ months, hint "As on your Nov statement" from `installmentAnchor().label`) / Paid so far (edit mode, pre-filled from `installmentProgress().paid`, hint "Counting the Nov statement"). Buttons "Add installment" / "Save changes"; edit mode "Delete installment" with in-sheet confirm "Delete iPhone 16?" → toast with Undo. Title "New installment" / the description.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Add the installment sheet".

---

### Task 6: Add a card by type and bank

**Files:**
- Create: `src/lib/issuers.js`, `src/lib/issuers.test.js`
- Modify: `src/components/AddSheet.vue`, `src/stores/ui.js` (+ test), `src/views/CardsView.vue` (its "Add a card" button), `src/components/CardFace.vue`, `src/lib/occurrences.js` (drop `last4`)

**Interfaces:**
- Produces:
  - `NETWORKS` = `[{ key: 'visa', label: 'Visa' }, { key: 'mastercard', label: 'Mastercard' }, { key: 'amex', label: 'American Express' }, { key: 'jcb', label: 'JCB' }, { key: 'unionpay', label: 'UnionPay' }]`.
  - `banksFor(networkKey)` → array of bank display names (lists below), never including "Other bank" (the sheet adds it).
  - `PAY_LATER` = `['Atome', 'SPayLater', 'TikTok Shop PayLater']`.
  - `cardName(bank, networkKey)` → `"BDO Visa"`; pay-later → the provider name.
  - `networkLabel(card)` → network label, "Pay later", or "Credit card" when `network` is missing.
  - `ui.openAdd({ cards: true })` opens the add sheet on the card-only list; `ui.openAdd()` unchanged.

Bank lists (`banksFor`), from web research on Nov 26, 2026 (banks' sites and comparison sites; low-confidence entries left out, "Other bank" covers gaps):

```js
visa:       ['BDO', 'BPI', 'UnionBank', 'Metrobank', 'RCBC', 'HSBC', 'EastWest', 'Maybank']
mastercard: ['BDO', 'Metrobank', 'BPI', 'Security Bank', 'RCBC', 'UnionBank', 'Chinabank', 'AUB', 'PSBank', 'HSBC', 'EastWest', 'PNB', 'Maybank']
amex:       ['BDO']
jcb:        ['BDO', 'PNB', 'RCBC']
unionpay:   ['BDO', 'RCBC', 'PNB']
```

- [ ] **Step 1: Failing tests** in `issuers.test.js`: `banksFor('amex')` equals the Amex list; every network has ≥ 1 bank; `cardName('BDO', 'visa') === 'BDO Visa'`; `networkLabel({ type: 'credit_card' }) === 'Credit card'`. In `ui.test.js`: `openAdd({ cards: true }) sets addCardsOnly`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement**:
  - `ui` state `addCardsOnly`; `openAdd(opts)` sets it from `opts?.cards`.
  - AddSheet steps: chooser → (Credit card) network list → bank list (+ "Other bank") → form. Card-only chooser (title "Add a card") lists the five networks, then "Pay later". Pay later → provider list (+ "Other") → form. Back button walks one step back. Rows use `CategoryTile category="credit_card"` / `"pay_later"`.
  - Form: Name (pre-filled from `cardName`, editable; a later bank/network change only re-fills it while the owner hasn't typed in it), Card type (select of `NETWORKS`, credit cards only), Bank (text input; for pay-later "Provider"), Credit limit, Statement day, Due day, account. The "Last 4 digits" field is removed. Edit mode opens the form directly with these filled.
  - Save sends `network`, `provider`; `last4` is always `null` (Task 3).
  - `CardsView` "Add a card" calls `ui.openAdd({ cards: true })`.
  - `CardFace` subtitle: `networkLabel(card)` only (no digits).
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Add cards by type and bank, with no card number".

---

### Task 7: Home rows, Cards tab and card detail

**Files:**
- Modify: `src/components/OccurrenceRow.vue`, `src/components/StatusChip.vue`, `src/components/CardFace.vue`, `src/views/CardsView.vue`, `src/views/CardDetailView.vue`

**Interfaces:**
- Consumes: `currentStatement` (Task 2), `statementsFor`, `installmentProgress` (Task 1), `ui.openStatement`, `ui.openInstallment`.

- [ ] **Step 1: Implement** (UI only; logic is covered by Tasks 1–3):
  - `OccurrenceRow`: when `o.needsStatement`: due line "Due Dec 5 · Statement not entered" (due coloring as usual), no amount, an "Enter" button (Pay's style, `aria-label="Enter {name} statement"`) calling `ui.openStatement({ cardId: o.id })`; not swipeable.
  - `StatusChip`: status `'statement'` reads "Not entered" in the neutral style.
  - `CardFace` takes the `currentStatement` occurrence: needs-statement shows "Statement not entered" in the balance spot and the due date; no status pill text beyond "Not entered".
  - `CardsView`: `occFor(c)` → `currentStatement(money.occurrences, c.id)`; header total sums `left` of every unpaid entered statement of active cards.
  - `CardDetailView`:
    - `occ` → `currentStatement`.
    - When the card has a needs-statement occurrence, a primary teal "Enter Nov statement" button sits above everything; otherwise the existing "Enter next statement" surface button opens the sheet in add mode.
    - **Statements** group: `statementsFor` rows, newest first: "Nov statement", "Due Dec 5", balance (`num`), `StatusChip`; tapping opens `ui.openStatement({ cardId, statementId })`.
    - **Installments** group: active plans (`!done`) with the progress bar and "6 of 12 paid · ₱12,000 left", aside = monthly sum of active plans; a final "Add installment" row; finished plans behind a "2 finished" row that expands.
    - Payments group lists payments for `occ` (unchanged) and is hidden for a needs-statement occ.
    - Remove the "Statements arrive in a later update." line.
- [ ] **Step 2: Run** `npm test` and `npm run build`. Expected: PASS, build clean.
- [ ] **Step 3: Commit** "Show statements, installments and missing statements on cards".

---

### Task 8: Browser check and docs

**Files:**
- Modify: `CLAUDE.md` (Structure lines for `cards.js`, `issuers.js`, `StatementSheet.vue`, `InstallmentSheet.vue`; milestone 4 ✅; backlog), `DESIGN.md` only if a new component pattern became part of the system.

- [ ] **Step 1:** Run the app (`npm run dev -- --port 5199`) and drive it at 390×844 in light and dark with playwright-core from the scratchpad: add a card via Cards → Add a card → Visa → bank → form (no digit fields anywhere); confirm a needs-statement row on Home with Enter; enter the statement; pay part, see Partly paid; edit the statement (due locked); delete with confirm and Undo; add an installment with already paid 2; see "3 of 12" style progress; check no console errors. Look at every screenshot.
- [ ] **Step 2:** Update CLAUDE.md, add deferred minors to the backlog.
- [ ] **Step 3: Commit** "Mark milestone 4 done in CLAUDE.md".
