# Milestone 8: Polish and Release Plan

**Spec:** `docs/superpowers/specs/2026-11-26-milestone-8-polish-release-design.md`
**Execution:** inline; tests first for logic; `npm test` after each task; one final review.

## Task 1: Peso P icon
- `assets/icon/payapa-icon.svg` (108-unit adaptive canvas, brand teal, white ₱, `#bfe3dc` bars) and a one-colour variant.
- Android: `drawable/ic_launcher_foreground.xml` (vector ₱), `drawable/ic_launcher_monochrome.xml`, `values/ic_launcher_background.xml` colour `#0B6B63`; `mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml` with `<monochrome>`; `ic_stat_payapa.xml` → ₱.
- `scripts/render-icons.mjs` (playwright-core + Chrome) renders: legacy `mipmap-*/ic_launcher.png` + `ic_launcher_round.png` (48/72/96/144/192), `ic_launcher_foreground.png` (108/162/216/324/432), splash PNGs (same pixel sizes as the current files, teal + centred ₱), `public/favicon.svg` copied from the source.
- Check: rendered PNGs viewed; CI build passes.

## Task 2: soft backup reminder
- `lib/prefs.js`: `backupNudged` flag (`payapa.backupNudged`).
- After a guest's first `addItem` / `addCard` / `markPaid` (via the money store action hook in App.vue): toast once.
- HomeView: "Not backed up yet" row with Sign in (opens SignInSheet) when signed out, sync available, and any active item or card.
- Test: prefs flag; a pure `shouldNudge({ signedIn, available, nudged })`.

## Task 3: backlog code fixes (each with a failing test where it's logic)
1. Home group of only needs-statement rows: no ₱0.00 total.
2. Card face subtitle not repeating the type already in the name.
3. Debit account: changing card type clears a bank not offered for it.
4. Add card edit: pre-M4 cards (no `provider`) show an empty Bank, not the full name.
5. Payday: a carried bill paid today stays in Paid (counts in Paid total) for the rest of the current payday.
6. Payday: an override row that isn't late shows under "To pay", not "From earlier paydays".
7. Settings → Paydays: counts and copy include cards.
8. Payment sheet: Save with no changes closes without writing.
9. Payment sheet confirm step: Escape / scrim / X go back to the form; focus moves into the step.
10. Payment sheet: title/body frozen during close.
11. Swipe: the Pay panel stays while the row slides back.
12. Reminders: watch a change counter, not deep arrays; keep 'denied' after an explicit no.
13. Reminders: payday amounts beyond the occurrence horizon (extend horizon for reminders).
14. Sync: keyset paging `(synced_at, id)`; allow-list of write actions for `soon()`.
15. Tests: `accountChoices` archived chip, swipe pointer flow (unit level).
Items that need a phone go to the checklist; the `./gradlew` item is closed.

## Task 4: DESIGN.md
Record the M3–M7 components and the switch knob tokens.

## Task 5: release
`versionCode 2`, `versionName "1.0.0"`; CLAUDE.md (milestone 8, backlog ticked, phone checklist); final review; merge; push; CI release APK verified.
