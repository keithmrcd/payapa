# Payapa

Personal Android app (Vue + Capacitor) for tracking payments of bills, subscriptions, credit cards, pay-later accounts, and loans, organized around the Filipino 15th / 30th payday. Built for the owner first; other Filipino salary earners later.

- Product truth: `PRODUCT.md` (users, positioning, principles). Read before changing behavior.
- Design system: `DESIGN.md` + `.impeccable/design.json` (tokens, type ramp, components, Do/Don't). Read before any UI change.
- Spec (features, data model, build plan): https://claude.ai/artifact/NDUYxNA6F5yX8HYpKcFhcj

## Stack

Vue 3 (`<script setup>`, JS, no TS) · Vite 8 · Pinia · Vue Router (hash history) · Tailwind CSS v4 (`@tailwindcss/vite`, tokens in `src/style.css`) · Capacitor 8 (Android) · Solar Icons (`@solar-icons/vue`) · Manrope Variable (`@fontsource-variable/manrope`, bundled, works offline).

Data: Dexie (IndexedDB) holds everything on the device and is always written first. Supabase (Postgres + Auth, free plan, `@supabase/supabase-js`) is the backup: sign in with an email code, then two-way sync. Config in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; see `.env.example`); without it the app runs local-only. Reminders are local notifications (`@capacitor/local-notifications`), scheduled on the phone.

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
  router/index.js         tabs: / (Home), /payday, /cards, /history · detail: /cards/:id, /items/:id · /settings, /settings/accounts, /settings/paydays, /settings/reminders, /settings/sync
  views/                  one file per screen (incl. AccountsView, PaydaysView, RemindersView, SyncView under Settings)
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
    SignInSheet.vue       email → 6-digit code sign-in
    ConfirmSheet.vue
    StatusChip.vue, FieldRow.vue
  stores/
    money.js              loads Dexie into state; write actions; derived state (occurrences, home groups, paydays, history)
    ui.js                 which sheet is open, toast with undo (opening a sheet clears the toast)
    session.js            sign-in (email code), sync runner (one run at a time), status
  db/
    index.js              Dexie `payapa` database (v2: `dirty` index), save() / softDelete() / loadAll(), setCurrentUser()
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
    prefs.js              small localStorage preferences (first name, reminder time and kinds)
    reminders.js          buildReminders(): due, statement and payday reminders for the next 60 days (pure)
    notify.js             plugin calls: sync (cancel all pending, schedule the list), permission
    supabase.js           the Supabase client, or null when not configured
    back.js, sheets.js    Android Back: close the top sheet, go back a screen, or on Home exit on a second Back within 2 s
    sync.js               push (dirty rows) / pull (by server synced_at), column mapping, last-write-wins merge
    reminderSync.js       Android only: reschedules on load, return to the app and any change; tap opens the route
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
- **Supabase:** schema in `supabase/schema.sql` (run in the SQL Editor; re-runnable). Primary key `(user_id, id)` (seed accounts share fixed ids across phones), server `synced_at` stamped by trigger, a trigger skips updates that aren't newer (last write wins), RLS `user_id = auth.uid()` for select/insert/update, no deletes; a `before delete` trigger turns any DELETE (e.g. from the Table Editor) into a soft delete with a newer `updated_at`, so it syncs to the phones. Columns are snake_case; a new app field needs a column there and in `TABLES` in `lib/sync.js`, or it stays on the phone. Never send `last4` (there's no column for it).
- **Sync:** `save()`/`softDelete()` mark rows `dirty: 1` and tag them with the signed-in user; push uploads dirty rows and clears the flag only if the row wasn't edited meanwhile; pull writes rows with `dirty: 0` without re-stamping. Seed accounts are stamped 1970 so a cloud copy always wins. A phone holding another account's rows refuses sign-in. Sign-out keeps all data.
- **First name:** asked once after the first sign-in when the account has none; saved on the phone (`payapa.name`) and on the Supabase account (`user_metadata.name`), pushed with each sync when changed. Signed out, Settings shows "Guest" and Home greets without a name.
- Sign-up is limited to the owner for now: after the owner's first sign-in, "Allow new users to sign up" is off in Supabase (turn it back on when Payapa opens to others).
- localStorage is used only for small preferences (`payapa.theme`, `payapa.name`, `payapa.reminders`, `payapa.notifAsked`, and supabase-js's session `payapa.auth`); wrap access in try/catch.
- **Reminders:** Payapa owns every scheduled notification; each sync cancels all pending and schedules the fresh list (max 120). Paid occurrences and "Statement not entered" rows get no due reminder. The status-bar icon is `res/drawable/ic_stat_payapa.xml`.
- Never change the WebView origin (Capacitor `server.androidScheme` / `server.hostname`; today the defaults, `https://localhost`). IndexedDB is per origin, so a new one opens an empty database.

## Android release signing

- **APKs are built on GitHub**, not on this computer (no Java or Android SDK here). `.github/workflows/android.yml` runs on every push to `main` (or by hand): tests, then `payapa-debug-apk` and a signed `payapa-release-apk`, downloadable from the run's Artifacts. It also checks the keystore opens and prints the release signature with `apksigner`.
- **Releases:** raise `versionCode` (build.gradle) and the version in `package.json` (and `versionName`), commit, push, then `git tag -a vX.Y.Z -m "Payapa X.Y.Z" && git push origin vX.Y.Z`. The tag's build publishes a GitHub Release with `payapa-X.Y.Z.apk` (it fails if the tag doesn't match `package.json`). 1.0.0 is https://github.com/keithmrcd/payapa/releases/tag/v1.0.0.
- GitHub settings: variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; secrets `PAYAPA_KEYSTORE_BASE64` (base64 of the .p12), `PAYAPA_STORE_PASSWORD`, `PAYAPA_KEY_PASSWORD` (alias `payapa`).
- The release key is `C:\Users\keith\payapa-keys\payapa-release.p12` (PKCS12, made with openssl, valid to 2054) with `password.txt` beside it, outside the repo. Signing certificate SHA-256 `B9:47:15:72:5A:71:53:F3:98:E9:45:21:D6:AA:F8:73:2C:D8:88:57:5D:B9:7D:DF:16:C5:4C:F3:20:A7:78:2E`, SHA-1 `E7:F4:E5:19:D6:D4:75:89:69:2C:7B:1C:8D:FE:9B:1F:47:4C:FA:58` (Google sign-in needs the SHA-1).
- On Windows, strip `\r` from anything openssl prints before using it as a password (`tr -d '\r\n'`): a stray carriage return made Java reject the key.
- Release builds read the keystore from `android/keystore.properties` (git-ignored) or `PAYAPA_*` env vars; see `android/keystore.properties.example`.
- Never commit `*.jks`, `*.keystore`, or `keystore.properties`, and never hard-code passwords in `build.gradle`.
- Raise `versionCode` in `android/app/build.gradle` on every release. Losing the key means users must uninstall to update.

## Build plan status

1. ✅ Scaffold (Vite, Vue, Pinia, Router, Tailwind, Capacitor Android)
2. ✅ Items + Home on Dexie, add/edit/archive forms, first-run empty state, Accounts / Paydays / Export CSV screens
3. ✅ Mark paid + History on real data (edit/delete payments, notes, account filter, swipe to pay)
4. ✅ Cards: statement entry, installments, card type → bank flow, debit cards as accounts
5. ✅ Payday view on real data: carried-over late bills, card payday setting, missing-statement note
6. ✅ Reminders: due, statement and payday-morning notifications; Settings → Reminders
7. ✅ Supabase sync: email-code sign-in, RLS, push dirty rows / pull by server `synced_at`, last write wins
8. ✅ Polish + release 1.0.0: Peso P icon and splash, guest backup nudge, backlog cleared, signed APKs built on GitHub

Screens were redesigned before milestone 2 and already reflect the target UI; milestone 2 swaps their data source, not their look.

## Future features / plan

1. ⬜ Later: Sign in with Google (fills the first name from the Google account; needs a Google Cloud OAuth client, the release key's SHA-1 and a native sign-in plugin), then reopen sign-ups for other users
2. ⬜ Tutorial steps: on the first visit, a guided tour highlights one part of the screen at a time (e.g. the Add button, a row's Pay, the Payday tab, Cards, Settings) with Next / Back / Skip, like Driver.js (`driver.js`, driverjs.com). Shown once (a localStorage flag), can be replayed from Settings; styled with the app's tokens in light and dark; works offline (bundled, no CDN)

### Small issues backlog

Minor issues found in reviews and checks that were left for later. Add each new one here when it's deferred (with the milestone that found it), and tick it off when fixed. Milestone 8 clears whatever is left.

- [x] Swipe: the teal Pay panel disappears on release while the row is still sliding back (M3)
- [x] Payment sheet: title and body change during the close animation after Save or Delete (M3)
- [x] Payment sheet: focus drops to the page when the delete confirm step opens or closes (M3)
- [x] Payment sheet: Escape, scrim tap or X on the confirm step closes the whole sheet instead of going back to the edit form (M3)
- [x] Payment sheet: Save with no changes still writes the row and bumps `updatedAt` (extra sync work in M7) (M3)
- [x] Tests: no component tests for the archived-account chip (`accountChoices`) or the swipe pointer flow (M3)
- [x] DESIGN.md: record swipe to pay and the in-sheet confirm step (M3)
- [x] Android: check on a device whether a swipe starting near the left edge triggers gesture-nav Back; if it does, start the swipe area past ~32px (M3)
- [x] Home: a group holding only "Statement not entered" rows shows a ₱0.00 total in its header; hide the total there (M4)
- [x] Card face: the subtitle repeats the card type when the name already has it ("BDO Visa" / "Visa") (M4)
- [x] DESIGN.md: record the needs-statement row, the card type → bank list and the installment progress row (M4)
- [x] Accounts: an auto-filled debit short name like "Security Bank debit" passes the 12-character limit and widens the pay-sheet chips (M4)
- [x] Accounts: changing a debit card's type after picking a bank not offered for the new type keeps the old bank and saves it (M4)
- [x] Add card: cards saved before M4 show their full name in the Bank field when edited (M4)
- [x] Payday: paying a carried-over bill drops it from the list without raising the Paid total, so the progress bar doesn't move (M5)
- [x] Settings > Paydays: the per-payday counts and copy ignore cards, which now have a payday setting too (M5)
- [x] Android: `npm run android:debug` runs `./gradlew`, which fails under Windows cmd; use `gradlew.bat` there (M6) — closed: APKs are built on GitHub now
- [ ] Android: reminders not yet checked on a device (permission prompt, exact time, tap opens the screen, reboot keeps them) (M6)
- [x] Reminders: the store watch is deep over every payment row; watching array identity or a version counter is enough (M6)
- [x] Reminders: a payday near the 60-day window's end counts only bills inside the occurrence horizon, so its amount can be low until the app reopens (M6)
- [x] Reminders: after one denial Android reports prompt-with-rationale, so "Turn on" comes back; keep 'denied' after an explicit no (M6)
- [x] Switches (AddSheet, RemindersView): the white knob and its shadow are raw values not recorded in DESIGN.md (M6)
- [x] DESIGN.md: record the Reminders screen and the switch row (M6)
- [x] Sync: pull stops (doesn't lose rows) if 1,000+ rows ever share one `synced_at`; a `(synced_at, id)` keyset would remove the case (M7)
- [x] Sync: App.vue triggers `soon()` from every non-read store action via a deny-list; an allow-list of write actions would be clearer (M7)
- [ ] Sync: not yet tested against the live Supabase project end to end on a second device (M7)
- [x] Payday: a row assigned to an earlier payday by a 15th/30th override shows under "From earlier paydays" even when it isn't late yet (M5)

### Phone checklist (M8)

Only a real phone can answer these. Install the latest `payapa-release-apk` from GitHub Actions, then:

- [ ] Reminders: the notification permission prompt appears once; a reminder arrives at the set time; tapping it opens that bill, card or the Payday tab; reminders survive restarting the phone; "Allow exact time" opens Android's Alarms & reminders setting
- [x] Swipe: a swipe that starts near the left edge of the screen doesn't trigger the Back gesture (if it does, start the swipe area past ~32px)
- [ ] Sync: sign in on a second device (or the browser) and see the same bills, cards and payments arrive; an edit on one shows on the other after it syncs
- [ ] Update: installing a newer release APK over this one keeps all data
- [x] Icon: the Peso P shows on the home screen, in the themed (Android 13) style and on the splash
- [ ] Icon: the Peso P shows in the notification bar (with a test reminder)

## Working agreements

- Keep the app usable offline; nothing should block on the network.
- Keep changes scoped: when changing UI, update `DESIGN.md` only if a new token, size, or component becomes part of the system.
- Commit messages: imperative summary line, short body.
- Minor issues you defer go in the Small issues backlog above, not only in a chat message.
