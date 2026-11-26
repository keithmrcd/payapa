# Milestone 3: Mark paid + History — design

## Intent

The spec calls milestone 3 "usable from here": the owner logs every payment, sees it in History, and can fix a mistake at any time. Milestone 2 already saves payments, shows History from real data, and offers Undo right after paying. This milestone fills the gaps the spec still lists.

## Goals

1. **Edit or delete any payment later.** Tapping a payment row (History, item detail, card detail) opens the payment sheet pre-filled.
2. **Note field** on the mark-paid sheet, next to reference no.
3. **Filter History by account** as well as by type.
4. **Swipe right to pay** on Home rows, as the spec's screen table describes.

## Non-goals

- Card statements, installments, card payments (milestone 4). Card detail rows become tappable, but no card payments exist yet.
- Moving a payment to a different bill or due date. A payment's `ref` never changes; to move it, delete it and pay the right one.
- Filtering by a single item (item detail already lists its payments).
- Receipt photos (v1.1).

## Approaches considered (History filter)

- **A. Second pill row for accounts under the type pills (chosen).** Answers "what did I pay from GCash this month?" and keeps type filtering. Cheap, fits the current screen.
- B. Account pills replace type pills. Simpler, loses "just subscriptions".
- C. Item search/picker. Duplicates item detail.

## Design

**Store (`money.js`)**
- `markPaid` also takes `note` (empty → `null`).
- `updatePayment(id, { amount, paidOn, account, referenceNo, note })`: rewrites those fields only; `ref` is kept.
- `deletePayment(id)`: soft delete (same as today's `undoPayment`, which stays as an alias).
- `restorePayment(row)`: saves the row back with `deletedAt: null` and returns it to state, used by the delete toast's Undo.
- Unit tests for each, including that occurrence status follows (paid → unpaid after delete, back after restore; amount edit turns paid into partly paid).

**Payment sheet (`MarkPaidSheet.vue`, one sheet, two modes)**
- `ui.openPay(occurrence)` works as now. New `ui.openPayment(payment)` opens edit mode.
- Edit mode: title "Edit payment"; amount, account, date, reference no., and note pre-filled from the payment; no Full/Minimum chips; button "Save changes". Below it a plain "Delete payment" text button (ink-2, not red, per the color rules). Delete always asks first: a `ConfirmSheet` ("Delete this ₱3,412.50 payment?", body naming the bill and that it goes back to unpaid or partly paid, confirm "Delete payment"). On confirm it soft-deletes, closes both sheets, and shows a toast "Payment deleted" with Undo (`restorePayment`). (Owner's call: every delete asks first.)
- The header block shows the item or card name and the due date the payment belongs to.
- If the payment's account is archived, it still appears as a chip (selected) so the save doesn't silently change it.
- Note field: a second `FieldRow` under reference no., placeholder "Optional", both modes.
- The App shell closes this sheet on route change, like the others.

**History (`HistoryView.vue`)**
- Second pill row: "All accounts" plus every account that has at least one payment (archived ones included, so old payments stay findable), in the accounts list order. Same 36px pill style.
- Filters combine (type AND account); monthly totals and the empty message follow the filters.
- Each row becomes a button (≥44px; rows stay 68px) that opens the edit sheet. Row meta: paid date · account · Ref · note (the note is new; the line still truncates to one line). Item and card detail payment rows show the note the same way.

**Item / card detail**: payment rows become buttons opening the same edit sheet. Card detail shows `referenceNo` like item detail does.

**Swipe to pay (`OccurrenceRow.vue`)**
- Horizontal drag right on an unpaid row reveals a teal "Pay" panel behind it. Past ~96px (or a quick flick), releasing opens the mark-paid sheet for that row; otherwise it springs back. It opens the sheet with the amount pre-filled; it never records a payment by itself.
- Starts only when horizontal movement clearly beats vertical (so the page still scrolls), uses pointer events with `touch-action: pan-y`, and a swipe that moved doesn't also follow the row's link.
- Applies wherever `OccurrenceRow` shows Pay (Home and Payday). Paid rows and rows with `showPay=false` don't swipe. Reduced motion: no spring animation, just snap.
- The Pay button stays as is (it's the accessible path).

## Left to the builder

Exact swipe threshold and spring timing, toast wording beyond the above, and test layout. Verify UI at 390×844 in light and dark.

## Known limit (from final review)

On Android with gesture navigation, a swipe that starts within about 24dp of the left screen edge is taken by the system as Back (and with no history the app closes; there's no back-button handler yet). The row's content starts 16px in, so a swipe that begins on the tile can hit this. Check on a real device; fixes if it bites: start rows' swipe area past ~32px, or exclude the strip natively with `View.setSystemGestureExclusionRects`.
