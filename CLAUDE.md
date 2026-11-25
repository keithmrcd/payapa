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
    OccurrenceRow.vue     the standard row: tile, name, due line, amount, Pay / check
    GroupList.vue         section title + white rounded group
    CategoryTile.vue      tinted icon tile; `category` or `icon` + `hue`; sizes sm / md / lg
    CardFace.vue          credit card / pay-later face
    BottomSheet.vue       the only modal surface (closes on route change and Escape)
    MarkPaidSheet.vue     amount (pre-filled), paid from, date chips, reference no.
    AddSheet.vue          type chooser → form (also edits items and cards)
    AccountSheet.vue, ConfirmSheet.vue
    StatusChip.vue, FieldRow.vue
  stores/
    money.js              loads Dexie into state; write actions; derived state (occurrences, home groups, paydays, history)
    ui.js                 which sheet is open, toast with undo
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
    occurrences.js        builds occurrences and home groups from rows
    csv.js                toCsv() (RFC 4180)
    exportData.js         exportAll(): one CSV per table, share sheet on Android
    prefs.js              small localStorage preferences (user name)
```

## Domain rules (don't break these)

- **Money is integer centavos.** Never store floats. Format only at display with `peso()` (en-PH, `₱3,412.50`). Every displayed amount gets the `num` class (tabular figures).
- **Dates are local `YYYY-MM-DD` strings.** Build them with `iso(y, m, d)` from `lib/dates.js` (it clamps day 31 to the month's last day). Don't use `toISOString()` for local dates.
- **Paydays:** the 15th and the 30th (the last day in shorter months). Salary always lands on the date, weekends included; there is no shift rule.
- **Payday buckets:** the 15th payday covers items due on the 15th–29th; the 30th payday covers the 30th through the 14th of next month. See `paydayFor()` in `lib/payday.js`; an item's payday override is applied by `paydayForDue()` there.
- **Occurrences** are computed from each item's due rule, not stored per month. An occurrence is paid when payments for its `ref` (`item:<id>:<due>` or `card:<id>:<due>`) cover the amount.
- **Variable bills** (electricity, water): any payment settles them, and the paid amount replaces the estimate.
- **Card status:** Unpaid → Partly paid → Min paid (paid ≥ minimum) → Paid in full. Card due days are fixed each month.
- **Pay-later accounts** (Atome, SPayLater, TikTok Shop PayLater) work like cards: a monthly cycle plus installment plans (`6 of 12 paid`).
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
3. ⬜ Mark paid + History on real data
4. ⬜ Cards: statement entry, installments
5. ⬜ Payday view on real data
6. ⬜ Reminders (local notifications)
7. ⬜ Supabase sync (auth, RLS, push/pull on `updated_at`)
8. ⬜ Polish + signed release APK

Screens were redesigned before milestone 2 and already reflect the target UI; milestone 2 swaps their data source, not their look.

## Working agreements

- Keep the app usable offline; nothing should block on the network.
- Keep changes scoped: when changing UI, update `DESIGN.md` only if a new token, size, or component becomes part of the system.
- Commit messages: imperative summary line, short body.
