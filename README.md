# Payapa

Bills, subscriptions, credit cards, and pay-later tracker. Vue 3 + Vite + Pinia + Tailwind, packaged as an Android APK with Capacitor.

**Status:** milestone 1 (scaffold) — bottom-tab shell, payday logic, add sheet. No data yet.

## Run in the browser

```bash
npm install
npm run dev
```

Open the URL on your phone (same Wi-Fi) with `npm run dev -- --host`.

## Build the Android app

Needs Android Studio (it brings the Android SDK) and JDK 21.

```bash
npm run android:sync    # build web + copy into android/
npm run android:open    # open in Android Studio → Run on your phone
npm run android:debug   # or build app-debug.apk from the command line
```

The debug APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.
Pushing to `main` on GitHub also builds it (see `.github/workflows/android-debug.yml`).

## Release signing (do this once, keep the key forever)

```bash
keytool -genkey -v -keystore payapa-release.jks -alias payapa -keyalg RSA -keysize 2048 -validity 10000
```

1. Store `payapa-release.jks` **outside** this repo and back it up in two places (password manager + offline drive).
2. Copy `android/keystore.properties.example` to `android/keystore.properties` and fill it in. It's git-ignored.
3. Raise `versionCode` in `android/app/build.gradle` on every release.
4. `cd android && ./gradlew assembleRelease`

If the key is lost, Android refuses updates signed with a new key: you'd have to uninstall, losing unsynced local data.

## Zoom is off

Viewport `user-scalable=no` in `index.html`, `touch-action` rules and 16px inputs in `src/style.css`.

## Structure

```
src/
  App.vue              header, bottom tabs, + button
  router/index.js      Home, Payday, Cards, History, Settings
  views/               one file per screen
  components/          AppIcon, EmptyState, AddSheet
  lib/paydays.js       15th / 30th payday rules
  lib/money.js         centavos → ₱ formatting
```
