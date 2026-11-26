# Milestone 5: Payday Implementation Plan

**Goal:** Payday tab carries late bills into the current payday, cards get a payday setting, missing statements are named.
**Spec:** `docs/superpowers/specs/2026-11-26-milestone-5-payday-design.md`
**Execution:** inline; run `npm test` after each task.

## Task 1: `paydaySummary` (src/lib/occurrences.js)

`paydaySummary(occurrences, payday, { carry = false } = {}) → { own, earlier, due, paid, left, carried, missing }`
- `own`: occurrences with `o.payday === payday.date`.
- `earlier` (only with `carry`): `o.payday < payday.date`, status not `'paid'`; card statements only when status is `'unpaid'`/`'partial'` and no newer entered statement of that card exists; needs-statement rows included. Oldest due first.
- `due`/`paid`/`left` over `own + earlier` (paid capped per row at amount); `carried` = sum of `left` over `earlier`; `missing` = count of needs-statement rows in both.

Tests (occurrences.test.js, `describe('paydaySummary')`): own only without carry; overdue item carried with carry; paid earlier item not carried; minimum-paid statement not carried; unpaid statement with a newer statement not carried; unpaid latest statement carried; missing counts needs-statement rows; totals include carried.

## Task 2: card payday setting

- occurrences.js: card occurrences use `paydayForDue(due, c.paydayBucket)` (both statement and needs-statement rows). Test: a card with `paydayBucket: '15'` lands on the 15th payday.
- AddSheet card form: Payday select (same choices as bills), saved as `paydayBucket`, loaded on edit; "Covered by your … payday" hint uses it.

## Task 3: store + view

- money.js: `periodSummary(p)` returns `paydaySummary(this.occurrences, p, { carry: p.date === this.paydays[0].date })`; keep `list` alias = own for callers.
- PaydayView: default tab 0; "From earlier paydays" group; "Includes ₱X from earlier paydays" line; missing-statement note; empty state only when own and earlier are both empty.
- Verify at 390×844 light/dark; update CLAUDE.md (structure line, milestone 5 ✅).
