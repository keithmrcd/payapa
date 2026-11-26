# Milestone 4: Cards (statements + installments) — design

## Intent

Credit cards and pay-later accounts (Atome, SPayLater, TikTok Shop PayLater) are where due dates hurt most: the amount changes every month and only the SOA says what it is. The owner wants each card's cycle visible at a glance (statement date, due date, balance, paid so far), a nudge to type in the SOA when it arrives, and installment plans that show how far along they are ("6 of 12 paid, ₱12,000 left").

Today cards can be added and paid once a statement exists, but there is no way to enter one ("Enter next statement" does nothing), only the latest statement is considered, and the installments list on card detail is a mock reading fields that don't exist.

## Goals

1. **Enter a statement** from the SOA: statement date, balance, minimum due; due date pre-filled from the card's due day.
2. **"Needs statement" rows**: once a card's statement date passes and that cycle's statement isn't entered, the card shows in Home's due list at its due date with no amount and an "Enter" button.
3. **Every entered statement is kept.** An unpaid older statement stays on Home (overdue once its due date passes). Card detail lists past statements with their status; any statement can be edited or deleted.
4. **Installment plans** per card: description, monthly amount, months, already paid. Progress counts up on its own each statement date.
5. Status per statement from payments, as today: Unpaid → Partly paid → Min paid → Paid in full.

## Non-goals

- Card utilization warnings, statement reminders as notifications (milestone 6), payday view totals (milestone 5).
- Adding installments into the amount due. **Owner's call:** the SOA balance already includes each month's installment (labelled "1 of 3" etc.), for credit cards and pay-later alike. Installments are progress only and never change the amount due.
- Parsing SOAs, bank integration.
- Tracking interest, fees, or purchases.

## Approaches considered (what Home shows before a statement is entered)

- **1. "Needs statement" row in the due list (chosen, owner and builder agree).** The card sits in Home at its due date, without an amount, with an "Enter" button. The due date is never invisible even if the SOA is ignored, and milestone 6 reminders get a date. Cost: those rows add nothing to totals until entered.
- 2. Only entered statements appear, plus a banner nudge. Tidier, but an ignored banner hides the due date.
- 3. Estimate from last month's balance (like variable bills). Always in totals, but card balances swing a lot, so the guess can mislead.

## Installment counting

**Owner's call (option A):** when adding a plan you enter the months and how many are already paid, copied from the latest SOA ("2 of 12" → months 12, already paid 2). From then on the count goes up by one each time the card's statement date passes. At months-of-months the plan is done and leaves the active list. Not counted from payments, and not ticked by hand each month.

## Design

**Cycles (`lib/cards.js`, new, pure functions with unit tests)**
- A card's cycle for month M: statement date `iso(y, M, statementDay)`; due date is the first date with the card's due day after the statement date (same month if dueDay > statementDay, else next month), built with `iso()` so the 31st clamps.
- A statement belongs to a cycle by its statement date's month (`YYYY-MM`).
- `latestClosedCycle(card, today)`: the most recent cycle whose statement date ≤ today.
- `installmentProgress(plan, card, today)` → `{ paid, months, left, done }`; `paid` = number of statement dates from `firstStatementDate` through today, capped at `months`; `left = (months − paid) × monthlyAmount`.
- From "already paid" N on the form: N is read off the **latest statement you've entered** (the SOA you're holding), not the latest closed cycle, because in the needs-statement window the newest SOA in hand is last month's. If N > 0, `firstStatementDate` is that statement's date minus (N − 1) months; if no statement is entered yet, the latest closed cycle's date stands in. If N = 0 (not on a statement yet), it is the next cycle's statement date after that anchor. The form hint names the anchor ("As on your Nov statement"). *(Builder's call.)*

**Data (existing Dexie tables, no schema version change)**
- `card_statements` rows: `cardId, statementDate, dueDate, statementBalance, minimumDue` (+ sync fields). Balance may be ₱0 (shows as Paid in full). Minimum due ≤ balance; empty minimum saves as 0.
- `installments` rows: `cardId, description, monthlyAmount, months, firstStatementDate` (+ sync fields). Total is `monthlyAmount × months`, not stored. Delete is a soft delete.

**Occurrences (`lib/occurrences.js`)**
- Cards produce one occurrence per entered statement (not just the latest), ref `card:<id>:<dueDate>` as today. Paid ones show in "Paid this month" like items; older unpaid ones stay and go overdue.
- Plus one "needs statement" occurrence when the latest closed cycle has no statement and its due date is on or after the date the card was added (so a newly added card isn't nagged for cycles before it existed). It has `needsStatement: true`, amount 0, its own status `'statement'`, never counts as paid, and goes overdue after its due date like any other row. Only the latest closed cycle is ever nagged.
- Home groups, payday buckets and totals take these rows as they come; amount 0 means they add nothing to totals.

**Store (`money.js`)**
- `addStatement(cardId, fields)`, `updateStatement(id, fields)`, `deleteStatement(id)` / `restoreStatement(row, payments)`.
- Changing a statement's due date when it has payments is not allowed (the field is locked with a short hint), because payments are keyed by that date.
- Deleting a statement soft-deletes its payments too; the confirm says so ("Its 2 payments are removed too"), and Undo restores both.
- `addInstallment`, `updateInstallment`, `deleteInstallment` / restore.
- Unit tests for each, including occurrence results (needs-statement row appears after statement date, disappears on entry, older unpaid statement goes overdue, delete/undo).

**Statement sheet (`StatementSheet.vue`, new; a `BottomSheet`)**
- Opened by `ui.openStatement({ cardId, statementId? })`. Add mode pre-fills the statement date with the latest closed cycle's date (or the next one if that's entered) and the due date from it; edit mode pre-fills from the row.
- Fields: Statement date, Due date, Statement balance, Minimum due. Button "Save statement" / "Save changes". In edit mode a plain "Delete statement" text button (ink-2) with an in-sheet confirm step, like the payment sheet, then a toast with Undo.
- Closes on route change like the other sheets; opening it clears the toast.

**Installment sheet (`InstallmentSheet.vue`, new)**
- From card detail "Add installment" and tapping a plan. Fields: Description, Monthly amount, Months, Already paid. In edit mode "Already paid" shows today's count and can be corrected; saving recomputes `firstStatementDate` from it, so a wrong count is fixable without deleting the plan. *(Builder's call.)* Delete with in-sheet confirm, toast with Undo.

**Home / Payday rows (`OccurrenceRow.vue`)**
- A needs-statement row: card tile, name, due line "Due Dec 5 · Statement not entered", no amount, an "Enter" button (same style as Pay) that opens the statement sheet. No swipe to pay. Tapping the row opens card detail.

**Cards tab and card face**
- One shared rule, `currentStatement(card)`, used by the Cards tab and card detail (face, status chip, "₱X left · due" line, "Mark a payment", and the Payments group): **the earliest unpaid entered statement; else the needs-statement cycle; else the latest statement.** So money owed always wins (an unpaid older statement stays on the face, and the needs-statement cycle still shows as its own Home row and as the teal "Enter statement" button on card detail); once everything is paid, the new cycle's "Statement not entered" and due date replace the old paid statement. "No statement yet" only when the card has neither. *(Builder's call.)*
- The Cards tab total ("left on this cycle's statements") sums every unpaid entered statement.

**Card detail**
- Top: face, status chip, "Mark a payment" for the current statement (as now).
- "Enter statement" button works (it was a dead button). When the latest closed cycle needs a statement, it is a primary teal button above everything else.
- **Statements** group: every statement newest first, each row: "Nov statement", due date, balance, status chip; tap opens the statement sheet in edit mode.
- **Installments** group: active plans with progress bar and "6 of 12 paid · ₱12,000 left", monthly sum in the aside; "Add installment" row at the end; finished plans in a collapsed "Finished" line ("2 finished").
- **Payments** group: payments for the current statement (as now).

**Card edits** to statement day or due day change future cycles only; entered statements keep their dates.

**Adding a card by type (owner's request)**
- Flow: **Add a card → card type → bank → form.**
  1. "Add a card" on the Cards tab opens the add sheet on a card-only list (title "Add a card"): **Visa, Mastercard, American Express, JCB, UnionPay**, then **Pay later**. Bills, subscriptions and loans aren't in this list. From the + button, "Credit card" goes to the same card-type list.
  2. Picking a card type shows the **banks that issue that type in the Philippines**, plus "Other bank" (free text). The per-type bank lists live in one data file (`lib/issuers.js`) and are checked against the banks' own sites while planning; "Other bank" means a missing or wrong entry never blocks anyone.
  3. Picking a bank opens the card form with the name pre-filled ("BDO Visa", editable).
- The card row stores `network` (`visa`, `mastercard`, `amex`, `jcb`, `unionpay`; null for pay-later) and `provider` (the bank). The form shows both as fields that can be changed, also when editing. Older cards without a network keep working (shown as plain "Credit card").
- The card face's subtitle shows the type ("Visa", "Pay later"). Names are plain text, no brand logos (icons stay Solar only).
- **No card number at all (owner's call, data protection):** the form asks for no digits of the card number, no CVV, no expiry. The existing "Last 4 digits" field is removed, the face stops showing `•••• 1234`, and saving a card writes `last4: null`, so old values are cleared on the next edit.
- *(Builder's call)* Pay later gets the same treatment: a provider list (Atome, SPayLater, TikTok Shop PayLater, Other). Picking one pre-fills the name.

## Left to the builder

Exact copy beyond the above, how the statement date default picks between cycles at month edges, test layout, and where the cycle helpers live inside `lib/cards.js`. Verify UI at 390×844 in light and dark. Deferred minors go in CLAUDE.md's Small issues backlog.
