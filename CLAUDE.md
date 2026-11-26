# Payapa

Personal Android app (Vue + Capacitor) for tracking payments of bills, subscriptions, credit cards, pay-later accounts, and loans, organized around the Filipino 15th / 30th payday. Built for the owner first; other Filipino salary earners later.

- Product truth: `PRODUCT.md` (users, positioning, principles). Read before changing behavior.
- Design system: `DESIGN.md` + `.impeccable/design.json` (tokens, type ramp, components, Do/Don't). Read before any UI change.
- Spec (features, data model, build plan): https://claude.ai/artifact/NDUYxNA6F5yX8HYpKcFhcj

## Stack

Vue 3 (`<script setup>`, JS, no TS) · Vite 8 · Pinia · Vue Router (hash history) · Tailwind CSS v4 (`@tailwindcss/vite`, tokens in `src/style.css`) · Capacitor 8 (Android) · Solar Icons (`@solar-icons/vue`) · Manrope Variable (`@fontsource-variable/manrope`, bundled, works offline).

Data: Dexie (IndexedDB) holds everything on the device. Planned: Supabase (Postgres + Auth, free plan) as the main database, `@capacitor/local-notifications` for reminders.

## Commands

```bash
npm install
npm run dev               # dev server; add `-- --host` to open on your phone over Wi-Fi
npm test                  # Vitest (db, store, lib)
npm run build             # production build to dist/
npm run android:sync      # build + copy web assets into android/
npm run android:open      # open in Android Studio
npm run android:debug     # build app-debug.apk from the command line
```

Unit tests cover `src/db`, `src/stores` and `src/lib`. Verify UI changes by running the app at 390×844 (phone) in light and dark.

## Structure

```
src/
  App.vue                 shell: back header, 5-slot tab bar (center = Add), sheets, toast
  router/index.js         tabs: / (Home), /payday, /cards, /history · detail: /cards/:id, /items/:id · /settings, /settings/accounts, /settings/paydays
  views/                  one file per screen (incl. AccountsView, PaydaysView under Settings)
  components/
    OccurrenceRow.vue     the standard row: tile, name, due line, amount, Pay / check; swipe right to pay
    GroupList.vue         section title + white rounded group
    CategoryTile.vue      tinted icon tile; `category` or `icon` + `hue`; sizes sm / md / lg
    CardFace.vue          credit card / pay-later face (current statement, or "Statement not entered")
    BottomSheet.vue       the only modal surface (closes on route change and Escape)
    MarkPaidSheet.vue     pay an occurrence, or edit / delete a saved payment (delete asks first, then Undo)
    AddSheet.vue          type chooser → form (also edits items and cards); cards go card type → bank → credit or debit → form (debit saves an account)
    StatementSheet.vue    enter / edit / delete a card statement (delete removes its payments; Undo)
    InstallmentSheet.vue  add / edit / delete an installment plan
    AccountSheet.vue      accounts, incl. debit cards (card type + bank, no number)
    ConfirmSheet.vue
    StatusChip.vue, FieldRow.vue
  stores/
    money.js              loads Dexie into state; write actions; derived state (occurrences, home groups, paydays, history)
    ui.js                 which sheet is open, toast with undo (opening a sheet clears the toast)
  db/
    index.js              Dexie `payapa` database, save() / softDelete() / loadAll()
    seed.js               first-load seed of the five accounts (behind a `meta` flag)
  lib/
    icons.js              the ONLY place icons are imported from
    format.js             peso(), dates, dueLabel(), ordinal()
    theme.js              System / Light / Dark → <html data-theme>
    dates.js              iso(), todayIso(), addDays(), addMonths(), daysBetween()
    payday.js             payday buckets
    recurrence.js         due-date rules and schedule versions
    occurrences.js        builds occurrences (one per card statement + a needs-statement row), home groups, currentStatement(), paydaySummary()
    cards.js              card cycles (statement → due date) and installment progress
    issuers.js            card types, PH banks per type, pay-later providers, card names
    history.js            History filters (type + account), month groups, row text
    swipe.js              swipe-to-pay gesture rules
    csv.js                toCsv() (RFC 4180)
    exportData.js         exportAll(): one CSV per table, share sheet on Android
    prefs.js              small localStorage preferences (user name)
```

## Domain rules (don't break these)

- **Money is integer centavos.** Never store floats. Format only at display with `peso()` (en-PH, `₱3,412.50`). Every displayed amount gets the `num` class (tabular figures).
- **Dates are local `YYYY-MM-DD` strings.** Build them with `iso(y, m, d)` from `lib/dates.js` (it clamps day 31 to the month's last day). Don't use `toISOString()` for local dates.
- **Paydays:** the 15th and the 30th (the last day in shorter months). Salary always lands on the date, weekends included; there is no shift rule.
- **Payday buckets:** the 15th payday covers items due on the 15th–29th; the 30th payday covers the 30th through the 14th of next month. See `paydayFor()` in `lib/payday.js`; an item's or card's payday override is applied by `paydayForDue()` there.
- **Carry-over:** the current payday (the one today falls in) also lists everything still unpaid from earlier paydays (`paydaySummary(…, { carry: true })`). A card statement carries only while it's below its minimum and is the card's newest; a newer SOA already includes its balance.
- **Occurrences** are computed from each item's due rule, not stored per month. An occurrence is paid when payments for its `ref` (`item:<id>:<due>` or `card:<id>:<due>`) cover the amount.
- **Variable bills** (electricity, water): any payment settles them, and the paid amount replaces the estimate.
- **Card status:** Unpaid → Partly paid → Min paid (paid ≥ minimum) → Paid in full. Card due days are fixed each month.
- **Pay-later accounts** (Atome, SPayLater, TikTok Shop PayLater) work like cards: a monthly cycle plus installment plans (`6 of 12 paid`).
- **Statements:** entered by hand from the SOA, one per card per month, all kept. Once a statement date passes without one, the card shows on Home as "Statement not entered" (ref `card:<id>:<due>:statement`, amount 0). A statement's due date locks once it has payments.
- **Installments are progress only.** The SOA balance already includes each month's installment; never add them to the amount due. Progress counts one per statement date from `firstStatementDate`.
- **No card numbers.** Never ask for or store any digits, CVV or expiry (`last4` is always saved as null). Debit cards are accounts (`type: 'debit'`), not cards.
- **Due-first:** Home opens on Overdue → Next 7 days → Later → Paid this month.

## UI conventions

- Use the tokens in `src/style.css` (`bg-surface`, `text-ink-2`, `bg-brand`, `text-brand-text`, `text-due`, `text-late`, `text-paid`, …). No new hex values in components unless DESIGN.md records them.
- **Color jobs:** teal = brand and primary actions. Amber = due within 3 days. Red = overdue text and chip only (never decoration, never Archive/Delete). Green = paid. Category hues stay off amber and red.
- **Dark mode** keys off `[data-theme="dark"]` (Tailwind `dark:` variant is wired to it). Never use `@media (prefers-color-scheme)` directly; `lib/theme.js` resolves System.
- **Icons:** Solar **Bold Duotone** for objects and categories, **Linear** only for navigation chevrons and the Add plus. Add new icons to `src/lib/icons.js` (`export { XIcon } from '@solar-icons/vue/bold-duotone/<name>'`) and import from there. No emoji or text glyphs as icons.
- **Type:** Manrope only; hierarchy by weight (500–800). Use the sizes in DESIGN.md's type ramp. No uppercase tracked labels, and no eyebrow text above headings.
- **Lists, not card grids:** group rows in `GroupList`; rows are separated by inset hairlines; tap targets ≥ 44px.
- **Sheets** (`BottomSheet`) for add / pay flows; no centered modals.
- **Copy:** plain English, short. Buttons name their action ("Mark ₱3,412.50 paid").
- **No zoom:** keep `user-scalable=no` in `index.html`, the `touch-action` rules, and inputs at 16px minimum (`@layer base` in `style.css`).

## Data and storage

- Dexie (IndexedDB) is live. The first load seeds five accounts (BDO, GoTyme, MariBank, GCash, Cash); nothing is held only in memory. Never call `db.delete()` or `table.clear()` outside tests. Tables: `accounts`, `items`, `cards`, `installments`, `card_statements`, `payments`. Every row carries `id` (uuid), `userId`, `createdAt`, `updatedAt`, `deletedAt` (soft delete) for the later Supabase sync (last write wins on `updatedAt`); milestone 7 maps them to snake_case columns.
- Supabase RLS policy on every table: `user_id = auth.uid()`.
- localStorage is used only for small preferences (`payapa.theme`, `payapa.name`); wrap access in try/catch.
- Never change the WebView origin (Capacitor `server.androidScheme` / `server.hostname`; today the defaults, `https://localhost`). IndexedDB is per origin, so a new one opens an empty database.

## Android release signing

- Release builds read the keystore from `android/keystore.properties` (git-ignored) or `PAYAPA_*` env vars; see `android/keystore.properties.example`.
- Never commit `*.jks`, `*.keystore`, or `keystore.properties`, and never hard-code passwords in `build.gradle`.
- Raise `versionCode` in `android/app/build.gradle` on every release. Losing the key means users must uninstall to update.

## Build plan status

1. ✅ Scaffold (Vite, Vue, Pinia, Router, Tailwind, Capacitor Android)
2. ✅ Items + Home on Dexie, add/edit/archive forms, first-run empty state, Accounts / Paydays / Export CSV screens
3. ✅ Mark paid + History on real data (edit/delete payments, notes, account filter, swipe to pay)
4. ✅ Cards: statement entry, installments, card type → bank flow, debit cards as accounts
5. ✅ Payday view on real data: carried-over late bills, card payday setting, missing-statement note
6. ⬜ Reminders (local notifications)
7. ⬜ Supabase sync (auth, RLS, push/pull on `updated_at`)
8. ⬜ Polish + signed release APK

Screens were redesigned before milestone 2 and already reflect the target UI; milestone 2 swaps their data source, not their look.

### Small issues backlog

Minor issues found in reviews and checks that were left for later. Add each new one here when it's deferred (with the milestone that found it), and tick it off when fixed. Milestone 8 clears whatever is left.

- [ ] Swipe: the teal Pay panel disappears on release while the row is still sliding back (M3)
- [ ] Payment sheet: title and body change during the close animation after Save or Delete (M3)
- [ ] Payment sheet: focus drops to the page when the delete confirm step opens or closes (M3)
- [ ] Payment sheet: Escape, scrim tap or X on the confirm step closes the whole sheet instead of going back to the edit form (M3)
- [ ] Payment sheet: Save with no changes still writes the row and bumps `updatedAt` (extra sync work in M7) (M3)
- [ ] Tests: no component tests for the archived-account chip (`accountChoices`) or the swipe pointer flow (M3)
- [ ] DESIGN.md: record swipe to pay and the in-sheet confirm step (M3)
- [ ] Android: check on a device whether a swipe starting near the left edge triggers gesture-nav Back; if it does, start the swipe area past ~32px (M3)
- [ ] Home: a group holding only "Statement not entered" rows shows a ₱0.00 total in its header; hide the total there (M4)
- [ ] Card face: the subtitle repeats the card type when the name already has it ("BDO Visa" / "Visa") (M4)
- [ ] DESIGN.md: record the needs-statement row, the card type → bank list and the installment progress row (M4)
- [x] Accounts: an auto-filled debit short name like "Security Bank debit" passes the 12-character limit and widens the pay-sheet chips (M4)
- [ ] Accounts: changing a debit card's type after picking a bank not offered for the new type keeps the old bank and saves it (M4)
- [ ] Add card: cards saved before M4 show their full name in the Bank field when edited (M4)
- [ ] Payday: paying a carried-over bill drops it from the list without raising the Paid total, so the progress bar doesn't move (M5)
- [ ] Settings > Paydays: the per-payday counts and copy ignore cards, which now have a payday setting too (M5)
- [ ] Payday: a row assigned to an earlier payday by a 15th/30th override shows under "From earlier paydays" even when it isn't late yet (M5)

## Working agreements

- Keep the app usable offline; nothing should block on the network.
- Keep changes scoped: when changing UI, update `DESIGN.md` only if a new token, size, or component becomes part of the system.
- Commit messages: imperative summary line, short body.
- Minor issues you defer go in the Small issues backlog above, not only in a chat message.
