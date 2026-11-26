# Milestone 8: Polish and release

Discussed in chat on Nov 26, 2026. Builds and signing already run on GitHub (`.github/workflows/android.yml`); the release key exists and is backed up.

## Why

Make Payapa something the owner installs and keeps: its own icon instead of Capacitor's, a release build that updates in place, the small issues gathered since milestone 3 cleared, and a gentle push for guests to back up. Nothing new in what the app does.

## Goals

1. **App identity: the Peso P icon** (option A, picked by the owner), everywhere the app shows:
   - Android launcher: adaptive icon (teal background + ₱ foreground as vector drawables), a monochrome layer for Android 13 themed icons, and PNG fallbacks for Android 7.0–7.1 (`mipmap-*` `ic_launcher` / `ic_launcher_round`, 48–192 px).
   - Splash: the legacy `splash.png` set (Capacitor's logo today) replaced by the ₱ on teal; Android 12+ draws its splash from the launcher icon.
   - Notification icon `ic_stat_payapa`: the bell becomes the one-colour ₱.
   - Browser: `public/favicon.svg` (Vite's bolt today) becomes the ₱ icon.
   - PNGs are rendered from one SVG source (`assets/icon/payapa-icon.svg`) by a small script (Chrome via playwright-core, already used for checks); no Android Studio.
2. **Soft "Sign in to back it up"** for guests (agreed instead of requiring sign-in):
   - After a guest's first add of a bill, card or payment: toast "Saved on this phone. Sign in to back it up."
   - Home, while signed out and holding any bill or card: one quiet row above the lists, "Not backed up yet" with a "Sign in" button that opens the sign-in sheet. Hidden when sync isn't available in the build.
3. **Clear the code items in the Small issues backlog** (M3–M7), each with a test where it's logic. Listed in the plan.
4. **DESIGN.md**: record what M3–M7 added (swipe to pay, in-sheet confirm, needs-statement row, card type → bank list, installment row, Reminders screen, switch row, sign-in sheet, Guest card, sync screen, the backup row), and tokens for the switch knob.
5. **Release 1.0.0**: `versionCode` 2, `versionName` "1.0.0"; the GitHub release APK is the one to install.
6. **Phone checklist** for the owner (the backlog items only a device can answer): reminders (permission, time, tap, reboot), swipe from the left edge vs gesture Back, sign in on a second device and see data arrive, install the release over itself (data kept).

Non-goals: tutorial steps and Google sign-in (future plan items 2 and 1), Play Store listing, new features.

## Approaches

- **Chosen:** icon as vector drawables + PNGs rendered from one SVG with a local script; the APK comes from GitHub as today.
- Not chosen: Android Studio's Image Asset tool (the owner doesn't want it installed); `@capacitor/assets` (pulls sharp and a large toolchain, and regenerates splash/icon files we'd rather hand-tune).

## Calls made while designing

- The Peso P keeps the mockup's proportions: white ₱ stroke, the two bars in the soft teal `#bfe3dc`, background brand teal `#0b6b63`. The monochrome and notification versions are the same shape in one colour.
- The guest toast shows once (localStorage flag `payapa.backupNudged`); the Home row stays while signed out with data, because that's when data is at risk.
- Backlog items found on a device move to the phone checklist; the build-script item (`./gradlew` on Windows) is closed as no longer needed, since builds run on GitHub.

## Left to the builder

Exact PNG rendering details, the order of backlog fixes, DESIGN.md wording.
