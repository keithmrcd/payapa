---
version: 1
slug: "src-app-vue"
primary_target: "src/App.vue"
related_targets: ["src/views"]
---

# Payapa app screens

Scope: every v1 screen of the app (Home, Payday, Cards, History, Settings, item detail, card detail, add sheet, mark-paid sheet). Mode: Operate.

Audience and job: the owner on his phone, checking what's due soonest and logging payments made in other apps. Success: overdue and next-due items are readable in one glance; marking paid takes one tap plus confirm.

Constraints: plain English copy; Solar Icons duotone; must not feel like a corporate bank app or playful/cute; no zoom; 16px inputs; demo data is synthetic until Dexie lands (milestone 2).

## Direction contract

THESIS: The category standard for consumer finance, played straight at Maya/GoTyme/Wallet/Monzo polish. It refuses the corporate-bank arrangement (dense menus, hero banners, promo tiles) and leads with a due-soonest list.

OWN-WORLD: Light, warm-neutral ground (stone), white grouped surfaces with soft 20px radii, one deep teal brand colour carrying the header balance block and primary actions, Solar bold-duotone icons in tinted category tiles, tabular figures for every amount, amber for due-soon and a muted red only on overdue text.

STORY: The user sees what is overdue and due this week, understands how much the next payday must cover, and marks items paid in two taps.

FIRST VIEWPORT: Home. Top: greeting row with settings. Teal summary block: due this month total, paid progress bar, next payday chip. Below: Overdue group, then Next 7 days, then Later this month, each row = category tile, name, due date, amount, Pay button. Floating add button above a 4-tab bar.

FORM: Standing exit, the category canon (user chose it over the rolled direction); not on the ordered list. seed:9e7c6212d9cab476

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
