# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile web app packaged as an Android APK with Capacitor. Its own design language, not Android-native; it may later run on iOS or in a browser.

## Users

Primary: the owner (Kit), a salaried employee in the Philippines paid on the 15th and 30th, who juggles bills, subscriptions, credit cards, and pay-later accounts across several banks and e-wallets. Later: other Filipino salary earners in the same situation, possibly through the Play Store.

Typical moment: on the phone, checking what's due before or right after payday, or marking something paid right after paying it in a bank or e-wallet app.

## Product Purpose

Show what's due, what's paid, and what each payday has to cover, so no due date is missed and each salary's obligations are clear. Success: zero missed due dates, and knowing at a glance how much of the next payday is already spoken for.

## Positioning

Built around the Filipino twice-a-month payday (15th and 30th) and local payment reality: credit card statement cycles, pay-later apps with installments (Atome, SPayLater, TikTok Shop PayLater), and payments made from BDO, GoTyme, MariBank, GCash, Maya, or cash. Not a general budgeting app; it tracks obligations, not every expense.

## Operating Context

- Payments happen in other apps (bank, e-wallet); Payapa only records them by hand.
- Card statement balances and minimum dues are typed in from the monthly SOA.
- Paydays always land on the date (15th, and 30th or the month's last day), weekends included.
- Reminders arrive as local notifications before due dates.

## Capabilities and Constraints

- v1 screens: Home (due this month, overdue, next 7 days, later), Payday (15th/30th buckets with due/paid/left), Cards (credit cards and pay-later accounts, cycles, installments), History (payments by month), Settings, item and card detail, add/edit sheet, mark-paid sheet.
- Item kinds: bill, subscription, loan, card, pay-later account. Recurrence: monthly, yearly, every N weeks, one-off.
- Card status: Unpaid, Minimum paid, Partial, Paid in full.
- Currency: Philippine peso, stored in centavos.
- Data: Supabase as the main database, a local Dexie copy as the offline fallback, CSV export.
- No pinch or double-tap zoom. Inputs at least 16px.
- Stack: Vue 3, Vite, Pinia, Vue Router, Tailwind CSS v4, Capacitor 8.

## Brand Commitments

- Name: Payapa (Filipino for calm, at peace; starts with "Pay").
- Interface copy is plain English.
- Visual direction: the category standard for consumer finance, played straight at full polish (chosen over alternative visual worlds). Craft bar: Maya, GoTyme, Apple Wallet and Cash, Monzo, Revolut.
- Icons: Solar Icons (solar-icons.dev, `@solar-icons/vue`), duotone styles.
- Must not feel like a corporate bank app, and must not feel playful or cute (no mascots, confetti, or streaks).

## Evidence on Hand

No users, testimonials, or usage data yet. Example account and provider names (BDO, GoTyme, Atome, SPayLater) are the owner's real setup, not endorsements.

## Product Principles

1. Payday context: every amount is understood against the next salary.
2. Due-first: opening the app shows what's due soonest, overdue first.
3. Calm, not alarming: overdue items are clear without making the app feel stressful.
4. Logging a payment takes seconds: one tap from the item, with the amount pre-filled.
5. Honest numbers: amounts the user typed are never estimated or rounded away.
6. Works offline: nothing blocks on the network.
