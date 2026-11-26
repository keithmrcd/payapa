# Milestone 3: Mark paid + History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Payments can be edited and deleted later, carry a note, History filters by account as well as type, and unpaid rows swipe right to open the pay sheet.

**Architecture:** New store actions on `money.js` (Dexie first, then state). Pure helpers in `src/lib/history.js` (filtering, month groups, account pills) and `src/lib/swipe.js` (gesture decision) so they're unit-tested. `MarkPaidSheet.vue` gains an edit mode driven by a new `ui.editPayment` state; views only call `ui.openPayment(row)`.

**Tech Stack:** Vue 3 `<script setup>` (JS), Pinia, Dexie, Tailwind v4, Vitest + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-26-milestone-3-payments-design.md`. Also read `CLAUDE.md` (domain + UI rules) and `DESIGN.md` before UI tasks.

## Global Constraints

- Money is integer centavos; display with `peso()` and the `num` class.
- Dates are local `YYYY-MM-DD`; build with `lib/dates.js`, never `toISOString()` for dates.
- Never `db.delete()` / `table.clear()` outside tests. Deletes are soft deletes (`softDelete`).
- A payment's `ref` never changes on edit.
- Red (`text-late`) is never used for Delete. Delete buttons are `text-ink-2`.
- Every delete asks first with `ConfirmSheet`; the Undo toast still follows.
- Icons only from `src/lib/icons.js`; no new hex values; tap targets ≥ 44px; inputs ≥ 16px.
- Copy: plain, short; buttons name their action.
- Commit messages: imperative summary, short body, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Account filter whose last payment gets deleted**: the selected account pill disappears; the filter must fall back to "All accounts", not show an empty list with no pill selected. (Task 2 test `effectiveAccount falls back`.)
2. **Deleting the only payment on a variable bill**: the occurrence goes back to unpaid with its estimate amount, and Undo restores paid with the paid amount. (Task 1 test.)
3. **Vertical scrolling over a Home row** must never open the pay sheet, and a swipe must not also follow the row's link to detail. (Task 5 tests on `swipeAxis`; manual check in Task 6.)
4. **Payment on an archived account or archived item**: the edit sheet still opens, shows the archived account chip selected, and saving keeps that account. (Task 3 manual check.)
5. **Route change (Android back) with the delete confirm open** closes both sheets. (Task 3: App watcher closes `editPayment`; confirm lives inside the sheet.)

---

### Task 1: Store actions for note, edit, delete, restore

**Files:**
- Modify: `src/stores/money.js` (Payments section, ~line 172)
- Test: `src/stores/money.test.js`

**Interfaces:**
- Produces:
  - `markPaid(o, { amount, paidOn, account, referenceNo, note })` → saved payment row; `note` empty/absent → `null`.
  - `updatePayment(id, { amount, paidOn, account, referenceNo, note })` → saved row; `account` maps to `accountId`; empty `referenceNo`/`note` → `null`; `ref` unchanged.
  - `deletePayment(id)` → the raw payment row as it was in state (before delete). Soft-deletes in Dexie, removes from `payments`.
  - `restorePayment(row)` → saved row with `deletedAt: null`, back in `payments`.
  - `undoPayment(id)` stays (calls `deletePayment`).

- [ ] **Step 1: Write failing tests** in a new `describe('payments')` block:

```js
it('markPaid stores a note', async () => {
  // addItem(itemFields()), markPaid(o, { amount: 341250, paidOn: '2026-11-19', account: null, note: 'Paid at 7-Eleven' })
  expect(p.note).toBe('Paid at 7-Eleven')
  expect(money.history[0].note).toBe('Paid at 7-Eleven')
  // second markPaid with note: '' → p2.note === null
})

it('updatePayment rewrites fields but keeps ref', async () => {
  // pay full 341250, then updatePayment(p.id, { amount: 100000, paidOn: '2026-11-18', account: gcash, referenceNo: 'X9', note: 'n' })
  expect(u).toMatchObject({ ref: p.ref, amount: 100000, paidOn: '2026-11-18', accountId: gcash, referenceNo: 'X9', note: 'n' })
  expect(money.occurrences.find((x) => x.ref === p.ref).status).toBe('partial')
  expect((await db.payments.get(p.id)).amount).toBe(100000)
  expect(money.payments).toHaveLength(1)
})

it('deletePayment then restorePayment', async () => {
  // pay full; const row = await money.deletePayment(p.id)
  expect(row.id).toBe(p.id)
  expect(money.occurrences.find((x) => x.ref === p.ref).status).toBe('unpaid')
  expect((await db.payments.get(p.id)).deletedAt).not.toBe(null)
  await money.restorePayment(row)
  expect(money.occurrences.find((x) => x.ref === p.ref).status).toBe('paid')
  expect((await db.payments.get(p.id)).deletedAt).toBe(null)
  // reload from Dexie in a fresh pinia: payment present
})

it('deleting the only payment on a variable bill restores the estimate', async () => {
  // addItem(itemFields({ schedule: [{ ...variable: true, amount: 300000 }] })); markPaid 280000
  // after delete: status 'unpaid', amount 300000; after restore: status 'paid', amount 280000
})
```

- [ ] **Step 2: Run** `npx vitest run src/stores/money.test.js` — Expected: the four new tests FAIL (`updatePayment is not a function`, note undefined).

- [ ] **Step 3: Implement** the four actions in `money.js` per Interfaces. `updatePayment` builds from `this._find('payments', id)` and calls `_put`. `restorePayment` passes `{ ...row, deletedAt: null }` to `_put` (keeps `id`, `createdAt`). Make `undoPayment(id)` call `deletePayment`.

- [ ] **Step 4: Run** `npm test` — Expected: all PASS.

- [ ] **Step 5: Commit** — `git commit -m "Add payment edit, delete, restore, and note to the store"`

---

### Task 2: History helpers (`src/lib/history.js`)

**Files:**
- Create: `src/lib/history.js`
- Test: `src/lib/history.test.js`

**Interfaces:**
- Consumes: rows shaped like `money.history` entries (`{ id, paidOn, amount, kind, account, referenceNo, note, ... }`) and account rows (`{ id, name, short, archivedAt }`).
- Produces:
  - `accountsWithPayments(accounts, rows)` → account rows that have ≥1 payment, archived included, in `accounts` order.
  - `effectiveAccount(selected, pills)` → `selected` if it's `'all'` or an id in `pills`, else `'all'`.
  - `filterHistory(rows, { kind, account })` → rows matching both (`'all'` matches anything).
  - `groupByMonth(rows)` → `[{ k: 'YYYY-MM', label, list, total }]` in input order (moved out of `HistoryView.vue`; `label` = `monthName(k + '-01')`).
  - `paymentMeta(p, accountShort)` → string `"Nov 19 · BDO · Ref R1 · note"`, dropping missing parts (uses `shortDate`).

- [ ] **Step 1: Write failing tests**:

```js
it('accountsWithPayments keeps archived accounts that have payments, in accounts order', ...)
  // accounts [A, B(archived), C]; rows on C and B → [B, C]
it('effectiveAccount falls back to all when the account has no payments left', ...)
  // effectiveAccount('b', [{id:'a'}]) === 'all'; effectiveAccount('a', [{id:'a'}]) === 'a'; effectiveAccount('all', []) === 'all'
it('filterHistory combines type and account', ...)
  // { kind: 'bill', account: 'a' } returns only bill rows paid from a
it('groupByMonth totals each month', ...)
  // two Nov rows 100 + 250 → [{ k: '2026-11', total: 350, list.length 2 }, ...]
it('paymentMeta joins date, account, ref, and note', ...)
  // expect(paymentMeta({ paidOn: '2026-11-19', referenceNo: 'R1', note: 'cash-in' }, 'BDO')).toBe('Nov 19 · BDO · Ref R1 · cash-in')
  // expect(paymentMeta({ paidOn: '2026-11-19', referenceNo: null, note: null }, undefined)).toBe('Nov 19')
```

Check `shortDate`'s exact output in `src/lib/format.js` and use it in expectations.

- [ ] **Step 2: Run** `npx vitest run src/lib/history.test.js` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/lib/history.js`.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add History filter and grouping helpers"`

---

### Task 3: Payment sheet edit mode, note field, delete with confirm

**Files:**
- Modify: `src/stores/ui.js`, `src/components/MarkPaidSheet.vue`, `src/App.vue` (route watcher, line ~36)

**Interfaces:**
- Consumes: Task 1 actions.
- Produces: `ui.editPayment` (a `money.history` row or `null`), `ui.openPayment(row)`, `ui.closePayment()`. Opening one of pay/edit closes the other.

- [ ] **Step 1: ui store** — add `editPayment: null` to state and the two actions; `openPay` sets `editPayment = null`, `openPayment` sets `payFor = null`.
- [ ] **Step 2: App.vue** — route watcher also calls `ui.closePayment()`.
- [ ] **Step 3: MarkPaidSheet edit mode.** `mode = ui.editPayment ? 'edit' : 'pay'`; sheet open when either is set; close calls the matching close.
  - Title: "Mark as paid" / "Edit payment".
  - Header block: tile + name; second line in pay mode unchanged; in edit mode `For the {shortDate(due)} bill` where `due = row.ref.split(':')[2]`.
  - Pre-fill in edit mode: `amount = fmt(row.amount)`, `paidOn = row.paidOn`, `account = row.account ?? ''`, `referenceNo = row.referenceNo ?? ''`, `note = row.note ?? ''`. Full/Minimum chips hidden in edit mode.
  - Account chips: `money.activeAccounts`, plus the payment's account first if it's archived (so it shows selected).
  - Note: second `FieldRow label="Note" for="pn"` under Reference no., `placeholder="Optional"`, both modes; passed to `markPaid`/`updatePayment`.
  - Save in edit mode: button "Save changes" → `money.updatePayment(row.id, {...})`, close, toast "Payment updated". Failure toast "Couldn't save. Try again."
  - Below Save (edit mode only): text button "Delete payment", `h-12 w-full text-[15px] font-bold text-ink-2`.
  - Delete opens a `ConfirmSheet` rendered inside this component: title `Delete this {peso(row.amount)} payment?`, body `{row.name} goes back to unpaid or partly paid.`, confirm label "Delete payment". On confirm: `const r = await money.deletePayment(row.id)`, close confirm + sheet, toast "Payment deleted" with Undo → `money.restorePayment(r)` (failure toast "Couldn't undo. Try again."). Delete failure toast "Couldn't delete. Try again." The confirm closes whenever `ui.editPayment` becomes null.
- [ ] **Step 4: Build check** — `npm run build` — Expected: no errors.
- [ ] **Step 5: Manual check** (after Task 4 makes rows tappable, or via Vue devtools `ui.openPayment(money.history[0])`): edit amount → status changes on Home; delete asks, deletes, Undo restores; payment from an archived account shows that chip selected and keeps it on save.
- [ ] **Step 6: Commit** — `git commit -m "Edit and delete payments from the payment sheet"`

---

### Task 4: History account filter, tappable payment rows, notes on rows

**Files:**
- Modify: `src/views/HistoryView.vue`, `src/views/ItemDetailView.vue` (Payments list), `src/views/CardDetailView.vue` (Payments this cycle list)

**Interfaces:**
- Consumes: Task 2 helpers, `ui.openPayment(row)`.

- [ ] **Step 1: HistoryView** — keep the type pills; add a second pill row below (same 36px pill classes, `mt-2`, `aria-label="Filter by account"`): "All accounts" then `accountsWithPayments(money.accounts, money.history)` using `a.short`. Selected account `acct` ref; use `effectiveAccount(acct, pills)` for filtering and `aria-checked`. Rows via `filterHistory` + `groupByMonth`.
- [ ] **Step 2: History rows** — each `li` content becomes a `<button type="button" class="... w-full text-left">` (keep 68px min height and the hairline style) calling `ui.openPayment(p)`. Meta line uses `paymentMeta(p, money.account(p.account)?.short)`, still `truncate`. Empty message: "No payments match these filters." when any filter is set, else "No payments yet."
- [ ] **Step 3: Item and card detail** — payment rows become buttons opening `ui.openPayment(p)`; their meta shows `from {account name}` · Ref · note (card detail gains Ref).
- [ ] **Step 4: Run** `npm test && npm run build` — Expected: PASS, build clean.
- [ ] **Step 5: Commit** — `git commit -m "Filter History by account and open payments to edit"`

---

### Task 5: Swipe right to pay

**Files:**
- Create: `src/lib/swipe.js`, `src/lib/swipe.test.js`
- Modify: `src/components/OccurrenceRow.vue`

**Interfaces:**
- Produces: `swipeAxis(dx, dy)` → `'idle' | 'scroll' | 'track'` while moving; `swipeRelease({ dx, ms })` → `'pay' | 'cancel'` on release. Constants: `LOCK = 10` px (movement before deciding an axis), `THRESHOLD = 96` px, flick = `dx ≥ 48 && dx / ms ≥ 0.5`.
  - `swipeAxis(dx, dy)`: `'idle'` if `max(|dx|,|dy|) < 10`; `'track'` if `dx > 0 && |dx| > 1.5 * |dy|`; else `'scroll'`.
  - `swipeRelease({ dx, ms })`: `'pay'` if `dx ≥ 96` or flick, else `'cancel'`.

- [ ] **Step 1: Write failing tests** for `swipeAxis` (small move → idle; mostly vertical → scroll; leftward → scroll; right and flat → track) and `swipeRelease` (95px slow → cancel; 96px → pay; 60px in 80ms → pay; 40px in 40ms → cancel).
- [ ] **Step 2: Run** `npx vitest run src/lib/swipe.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** `src/lib/swipe.js`.
- [ ] **Step 4: OccurrenceRow** — only when `showPay && o.status !== 'paid'`:
  - Wrap the row in a relative `overflow-hidden` container; behind it an absolutely positioned `bg-brand` panel with "Pay" (`text-brand-ink font-bold`) on the left. The row's foreground gets `bg-surface` and `transform: translateX(px)`.
  - Pointer events on the foreground (`pointerdown/move/up/cancel`), `touch-action: pan-y`. Once `swipeAxis` says `'track'`, capture the pointer and follow `dx` (clamp to 0..160 with resistance past 96 is optional). `'scroll'` → stop handling for this gesture.
  - On release: `'pay'` → `ui.openPay(o)`; either way spring back to 0 (`transition: transform 200ms`; no transition under `prefers-reduced-motion` — use a `motion-reduce:` Tailwind class, not a media query in script).
  - If the gesture tracked, suppress the RouterLink click (`@click.capture` that `preventDefault`s and `stopPropagation`s when a `moved` flag is set; reset the flag after).
  - Keep the hairline styling working (it's on `.row + .row`; put the class on the outer wrapper).
- [ ] **Step 5: Run** `npm test && npm run build` — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "Swipe right on a row to open the pay sheet"`

---

### Task 6: Verify in the app and update docs

**Files:**
- Modify: `CLAUDE.md` (Build plan status line 3 → ✅; components list mentions MarkPaidSheet edit mode and `lib/history.js`, `lib/swipe.js`)

- [ ] **Step 1:** `npm run dev`, open at 390×844, light and dark. Walk: add a bill → Pay with a note → History row shows note → tap row → edit amount → Home shows partly paid → Delete → confirm → toast Undo → restored. Account pills appear/disappear as payments do; pick an account, delete its last payment → filter falls back to All. Swipe a Home row right past threshold → pay sheet opens, detail page doesn't; short swipe springs back; vertical scroll over rows never opens it.
- [ ] **Step 2:** `npm test` and `npm run build` — Expected: all pass, clean build.
- [ ] **Step 3:** Update `CLAUDE.md` as above.
- [ ] **Step 4: Commit** — `git commit -m "Mark milestone 3 done in CLAUDE.md"`
