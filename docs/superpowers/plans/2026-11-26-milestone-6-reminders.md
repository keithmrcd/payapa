# Milestone 6: Reminders Implementation Plan

**Spec:** `docs/superpowers/specs/2026-11-26-milestone-6-reminders-design.md`
**Execution:** inline, tests first; `npm test` after each task.

## Task 1: `buildReminders` (src/lib/reminders.js)
`buildReminders({ occurrences, cards, cardStatements, paydays }, today, { time, statements, payday, days = 60, max = 120 }) → [{ id, at: 'YYYY-MM-DDTHH:mm', title, body, route }]`
- Due: per unpaid, non-needsStatement occurrence, per offset in its source's `reminderOffsets` (items and cards; missing → [3,1,0]); at = due − offset; titles "… is due in N days" / "due tomorrow" / "due today"; body amount (variable "About …"; card left + minimum when not met) and `dayDate(due)`.
- Statement: per active card, next statement dates in window, skipped if that month is entered. Route `/cards/:id`.
- Payday: each payday date in window via `paydayFor`/`nextPaydayAfter`, body from `paydaySummary(...).left`, skipped at 0. Route `/payday`.
- Only `at` strictly after now (`today` + current time passed in as `now`), within `days`; sorted by time; capped at `max`; ids = stable 31-bit hash of `kind:ref:offset`.

## Task 2: preferences
`prefs.js`: `remindAt` ('09:00'), `statementReminders` (true), `paydayReminders` (true) refs with setters, localStorage in try/catch.

## Task 3: card reminders saved
AddSheet: card save writes `reminderOffsets`; edit loads them.

## Task 4: `notify.js` + wiring
- `syncReminders(plugin, list)`: cancel pending ids it owns, schedule list (`schedule.at`, `allowWhileIdle`, `extra.route`). Tested with a fake plugin.
- Native only (`Capacitor.isNativePlatform()`): App.vue reschedules after load, on visibility, and on store changes (debounced 1 s); tap listener routes. Permission asked the first time there's something to schedule.
- Android small icon `ic_stat_payapa` vector drawable; capacitor.config `LocalNotifications.smallIcon`.

## Task 5: Settings → Reminders screen
Route `/settings/reminders`; status + Turn on, time, two switches, exact-time line. Browser: "Available in the Android app". Settings row shows the time.

## Finish
Verify at 390×844 light/dark, build debug APK, CLAUDE.md (structure, milestone 6), final review.
