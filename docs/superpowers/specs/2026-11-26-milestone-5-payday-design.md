# Milestone 5: Payday view on real data

Approved in chat on Nov 26, 2026.

## Why

PRODUCT.md: "knowing at a glance how much of the next payday is already spoken for." The Payday tab already reads real data (milestone 2), but late bills from earlier paydays vanish from it, cards can't be moved to the other payday, and a card with no statement adds ₱0 without saying so.

## What changes

1. **Late bills carry over.** The current payday (the one today falls in) also lists everything still unpaid from earlier paydays, in a "From earlier paydays" group above "To pay". They count in its due, paid and left totals, and the summary says "Includes ₱X from earlier paydays". The next payday never shows them, so nothing counts twice.
2. **The tab opens on the current payday**, so late bills are the first thing seen.
3. **Cards get a Payday setting** (Automatic / 15th / 30th) on the card form, like bills. Occurrences use it through `paydayForDue()`. Existing cards have none, which means Automatic.
4. **Missing statements are named.** When a payday holds "Statement not entered" rows, the summary adds: "1 statement not entered yet, so this total may go up."
5. **Tests** for the payday summary (pure function, `src/lib/occurrences.js`).

Non-goals: browsing past paydays, salary planning, reminders.

## Approaches

- **Chosen:** a pure `paydaySummary(occurrences, payday, { carry })` next to `homeGroups()`; the store getter and the view call it. Testable without Vue; Home's own window is untouched.
- Not chosen: store occurrences per payday, or move overdue rows' `payday` field. Both would change Home and History, which already read `payday`.

## Calls made while designing

- **Card statements carry over only while they're really late:** status Unpaid or Partly paid (below minimum), and only the card's newest entered statement. A minimum-paid statement, or one followed by a newer statement, isn't carried: its balance rolls into the next SOA and would count twice.
- Earlier "Statement not entered" rows carry over too (they're the nudge to enter it), and count toward the note in point 4.
- Carried bills sort oldest first.
