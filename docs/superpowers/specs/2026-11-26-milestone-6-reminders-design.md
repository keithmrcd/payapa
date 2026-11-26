# Milestone 6: Reminders

Approved in chat on Nov 26, 2026: due-date reminders, plus (1) statement reminders and (2) a payday-morning reminder. No overdue follow-up.

## Why

PRODUCT.md's success measure is zero missed due dates. Today nothing reaches the owner unless they open the app. Reminders are local notifications scheduled on the phone (`@capacitor/local-notifications`, already installed), so they work offline and need no server.

## What gets scheduled

All at the reminder time (Settings, default 9:00 AM), for the next 60 days, never in the past.

| Kind | When | Title | Body |
|---|---|---|---|
| Due | each offset of an unpaid bill or card statement (3 days, 1 day, on the day, per its "Remind me") | "Meralco is due in 3 days" / "due tomorrow" / "due today" | "₱2,100.00 · Mon, Nov 30". Variable bill: "About ₱2,100.00". Card: what's left, plus "Minimum ₱1,500.00" when the minimum isn't met yet |
| Statement | each card's coming statement dates, unless that month's statement is already entered | "BDO Visa statement is out" | "Enter it from your SOA to see what's due." |
| Payday | each 15th / 30th payday | "Payday today" | "₱12,480.00 to pay from this salary." Skipped when nothing is left |

- Paid occurrences get no reminders. "Statement not entered" rows get no due reminder (the statement reminder covers them).
- A card's due reminders use the card's own "Remind me" (fix: the card form shows it today but never saves it; it's saved as `reminderOffsets` like items).
- Tapping a notification opens the app on that item, card, or the Payday tab.

## When it reschedules

On app start, when the app comes back to the foreground, and after any data change (debounced ~1 s). Each time it cancels what it scheduled before and schedules the fresh list, so paying a bill removes its pending reminders and edits take effect. Capped at 120 notifications (Android allows ~500 per app).

## Settings → Reminders (new screen; the row already exists)

- Notifications: On / Off status, with a "Turn on" button that asks permission (Android 13+), or explains to enable it in phone settings once denied.
- Reminder time: one time for every reminder, every half hour from 6:00 AM to 10:00 PM (default 9:00 AM).
- Statement reminders: on/off. Payday reminder: on/off. (All three in localStorage `payapa.reminders` as one object; default on.)
- Exact time: when Android hasn't allowed exact alarms, a line "Reminders may arrive a few minutes late" with "Allow exact time" (opens the system setting). Reminders ask for exact alarms only when already allowed; otherwise the plugin would open that system screen on every schedule (found in review).

Permission is first asked the first time the app opens with something to remind about; never at first launch on an empty app.

## Approaches

- **Chosen:** a pure `buildReminders(state, today, prefs)` in `src/lib/reminders.js` returns the notification list (tested in Vitest); a thin `src/lib/notify.js` talks to the plugin (cancel + schedule, permission, tap listener), native only.
- Not chosen: per-occurrence notification IDs updated incrementally. Fewer plugin calls, but every edit path would have to know which reminders it affects; full reschedule is simpler and cheap at this size.
- Not chosen: repeating notifications (`schedule.every: 'month'`). They can't skip paid months or follow statements.

## Calls made while designing

- One reminder time for everything, in Settings. The data model keeps `reminderTime` per item ('09:00') but the UI doesn't offer per-item times in v1.
- Notification IDs: stable 31-bit hashes of `kind:ref:offset`, so a re-schedule of the same reminder replaces it.
- In the browser (dev), scheduling is skipped; the Reminders screen still renders and says "Android app only".
- The payday amount for a future payday is that payday's own bills (no carry-over); it's recomputed whenever the app opens, so on the day it's close to what the Payday tab shows.

## Not in scope

Overdue follow-ups, snooze/actions on the notification, per-item reminder times, sync of reminder settings.
