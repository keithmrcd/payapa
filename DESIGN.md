---
name: Payapa
description: Calm, due-first bill and payday tracker for Filipino salary earners
colors:
  brand: "#0b6b63"
  brand-deep: "#08524c"
  brand-soft: "#e2f0ed"
  brand-text: "#0b6b63"
  brand-ink: "#ffffff"
  on-brand-2: "#bfe2dc"
  ground: "#f3f2ef"
  surface: "#ffffff"
  surface-2: "#f7f6f3"
  hairline: "#e9e7e2"
  ink: "#15181c"
  ink-2: "#5d626a"
  ink-3: "#8b9098"
  due: "#9a5b00"
  due-soft: "#fdf1dc"
  late: "#b4342c"
  late-soft: "#fbe9e7"
  paid: "#1d7a50"
  paid-soft: "#e1f3e9"
  brand-dark: "#0f6f67"
  brand-deep-dark: "#0a524c"
  brand-soft-dark: "#143a36"
  brand-text-dark: "#8ad8cd"
  on-brand-2-dark: "#d3efea"
  ground-dark: "#0f0d0b"
  surface-dark: "#1c1917"
  surface-2-dark: "#24201d"
  hairline-dark: "#312c28"
  ink-dark: "#f2efec"
  ink-2-dark: "#b2aba4"
  ink-3-dark: "#857e77"
  due-dark: "#f0b550"
  due-soft-dark: "#3a2b12"
  late-dark: "#f08a80"
  late-soft-dark: "#3d1d1a"
  paid-dark: "#63c897"
  paid-soft-dark: "#16301f"
typography:
  amount-entry:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  display-amount:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  block-amount:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  currency-glyph:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
  headline:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  card-amount:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline-detail:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  sheet-title:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.4
  button-label:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
  card-name:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    letterSpacing: "-0.025em"
  input:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  section:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.375
  amount-row:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  subtitle:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  label-lg:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  body-secondary:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  label-sm:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
  label-tab:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
rounded:
  focus: "10px"
  segment: "12px"
  tile: "14px"
  field-group: "16px"
  tile-lg: "18px"
  group: "20px"
  card-face: "22px"
  block: "24px"
  sheet: "28px"
  pill: "9999px"
spacing:
  gutter: "16px"
  block-padding: "20px"
  group-gap: "28px"
  row-min: "72px"
  field-row: "56px"
  tap-min: "44px"
  tab-bar: "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.button-label}"
    rounded: "{rounded.field-group}"
    height: "56px"
  button-primary-active:
    backgroundColor: "{colors.brand-deep}"
  button-pay:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  button-pay-overdue:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field-group}"
    height: "52px"
  choice-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  choice-pill-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
  filter-pill-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    height: "36px"
  status-chip-overdue:
    backgroundColor: "{colors.late-soft}"
    textColor: "{colors.late}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 10px"
  status-chip-partial:
    backgroundColor: "{colors.due-soft}"
    textColor: "{colors.due}"
    rounded: "{rounded.pill}"
    height: "24px"
  status-chip-paid:
    backgroundColor: "{colors.paid-soft}"
    textColor: "{colors.paid}"
    rounded: "{rounded.pill}"
    height: "24px"
  group-list:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.group}"
  summary-block:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.block}"
    padding: "20px"
  category-tile:
    rounded: "{rounded.tile}"
    size: "44px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-3}"
    typography: "{typography.label-tab}"
    height: "64px"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
---

# Design System: Payapa

## Overview

**Creative North Star: "The Settled Ledger"**

Payapa plays the consumer-finance category straight, at the polish of the best Southeast Asian and European money apps. A warm stone ground holds white grouped surfaces with soft corners; one deep teal carries the brand, and it is spent where money gets moved or summarised: the payday block on Home, primary actions, the active tab, selected choices. Everything else is ink on white. The app reads as calm because the palette is quiet and the status colours are rationed: amber means "due within three days or only partly paid", red means "overdue" and appears almost only as text.

Density is phone-native and list-led. Screens open with a large bold title, then a single summary block, then grouped lists of rows. Each row is the same object everywhere: a tinted category tile, a name, a due line, a tabular amount, and a trailing action. Hierarchy comes from Manrope's weight range (500 to 800) and from tonal layering, not from colour or ornament. Dark mode follows the system and re-maps every role onto warm stone darks; the teal block barely changes so the brand reads identically in both.

The world rejects the corporate-bank arrangement (dense menus, hero banners, promo tiles) and anything playful (mascots, confetti, streaks).

**Key Characteristics:**
- Warm stone ground, white grouped surfaces, one deep teal brand colour.
- Solar Bold Duotone icons inside softly tinted category tiles.
- Tabular figures on every amount; amounts are the boldest thing in a row.
- Amber and red are status bands, never decoration.
- Concentric soft corners from 12px to 28px; pills for every small control.
- Near-flat surfaces; coloured glow only under brand-coloured objects.

## Colors

A quiet warm-neutral palette with one saturated brand teal and three rationed status hues.

### Primary
- **Deep Lagoon Teal** (brand): the payday summary block, primary buttons, the raised Add slot, filled Pay on overdue rows, selected account and date pills, the sheet's switch when on. Pressed state darkens to **Lagoon Deep** (brand-deep).
- **Lagoon Mist** (brand-soft): the resting fill of every non-overdue Pay button, and text selection.
- **Lagoon Text** (brand-text): teal used as text and icon colour (active tab, Pay label). In dark mode it lifts to a pale aqua (brand-text-dark) so it stays legible on stone.
- **Foam** (on-brand-2): secondary text on the teal block (captions, "of ... paid"), and the Undo action on the ink toast.

### Status
- **Due Amber** (due / due-soft): due-date text within three days, and Partly paid / Min paid chips.
- **Overdue Brick** (late / late-soft): the overdue due-line text, the Overdue group title, the Overdue chip, form error text.
- **Settled Green** (paid / paid-soft): paid check icons, the Paid chip, the paid bar and Paid figure on Payday.

### Neutral
- **Stone Ground** (ground): the page behind everything; also the colour of the header and tab-bar blur.
- **Paper White** (surface): grouped lists, detail blocks, sheets, the tab bar.
- **Linen** (surface-2): field groups inside sheets, the mark-paid summary strip, pressed rows, empty progress tracks.
- **Seam** (hairline): row dividers, sheet grabber, unselected pill border, tab-bar top border.
- **Ink / Ink 2 / Ink 3** (ink, ink-2, ink-3): primary text; secondary text and due lines; placeholders, chevrons, inactive tabs, paid amounts.

### Category hues
Category tiles carry their own hue (purple electricity, cyan water, blue internet and cloud, teal-green phone, olive loan, magenta video, green music, navy credit card, slate pay-later, grey generic bill), set per category in the tile component rather than as global tokens.

### Named Rules
**The One Teal Rule.** Teal is the only brand colour. It marks money summaries and the action that moves money; it is never a background for content lists or a decorative accent.

**The Status Band Rule.** Amber, red and green are reserved for due-soon, overdue and paid. Category hues stay out of the amber and red bands so a tile never reads as a warning.

**The Red Is Text Rule.** Overdue is said in red text (due line, group title) and the small overdue chip; red never fills a row, a block or a button. Overdue urgency is expressed by promoting the Pay button to filled teal.

## Typography

**Display Font:** Manrope Variable (self-hosted via @fontsource-variable, falling back to system-ui)
**Body Font:** Manrope Variable
**Label Font:** Manrope Variable

**Character:** One geometric-humanist family doing everything; weight does the hierarchy work. Big amounts sit at 800 with tight tracking, names at 600, metadata at 500.

### Hierarchy
The shipped size ramp is 11, 12, 13, 14, 15, 16, 17, 18, 24, 26, 30, 32, 34 and 44px. Every step below is in use; there are no other sizes.

- **Amount entry** (800, 44px, 1.25, tabular): the editable amount in the mark-paid sheet.
- **Display amount** (800, 34px, line-height 1, -0.025em, tabular): the amount left before payday on the teal block.
- **Block amount** (800, 32px, line-height 1, -0.025em, tabular): the hero amount in the Payday and item-detail blocks.
- **Currency glyph** (700, 30px, Ink 3): the peso sign beside the amount entry.
- **Headline** (800, 26px, 1.25, -0.02em): tab screen titles and the Home greeting. The statement balance on card faces uses the same step, with tabular figures.
- **Headline detail** (800, 24px, 1.25, -0.02em): the item name under the large tile on item detail.
- **Sheet title** (700, 18px, tight tracking): bottom sheet titles.
- **Title** (700, 17px): pushed-screen nav bar title, and the name in the Settings profile block.
- **Button label** (700, 16px): full-width primary buttons. 16px is also the card-face name (800, tight) and the input floor (600): no field renders below 16px, so focusing one never zooms.
- **Section** (700, 15px, tight tracking): group titles ("Overdue", "Next 7 days"), sentence case, with an optional 13px tabular total aligned right.
- **Body** (600, 15px, 1.375): row names (clamped to two lines), settings labels, detail values.
- **Amount in row** (700, 15px, tabular, -0.01em): right-aligned row amounts; Ink 3 once paid.
- **Subtitle** (500, 14px, Ink 2): subtitles under screen titles, secondary body, empty states, the caption under the display amount.
- **Label large** (700, 14px): filter, choice and segment pills, the sign-in button, error text (600).
- **Body secondary** (500, 13px, Ink 2): due lines, block captions, helper text.
- **Label** (700, 13px): Pay buttons and field captions above choice groups.
- **Label small** (700, 12px): status chips, the days-to-payday pill, card-face labels (600 at 70% opacity) and card-face status pills (800, 11px).
- **Tab label** (700, 11px): bottom tab labels.

### Named Rules
**The Tabular Money Rule.** Every peso amount, total and count of money uses tabular figures with -0.01em tracking, so columns align down a list.

**The Weight Ladder Rule.** Hierarchy is 500 / 600 / 700 / 800 in one family. No second typeface, no uppercase labels, no letter-spaced captions.

## Layout

A single column capped at 576px and centred, with 16px side gutters. Tab screens open with a title row (title plus 14px subtitle, or greeting plus settings button), then one summary block, then grouped lists separated by 28px. Rows are at least 72px tall (68px in History), field rows 56px, and every tappable target is at least 44px. Pushed screens get a 56px sticky header with a back chevron and a centred title on a blurred stone ground.

The tab bar is 64px plus the safe area, fixed to the bottom, five equal columns: Home, Payday, a raised Add slot in the centre, Cards, History. Content reserves 112px at the bottom on tab screens. Sheets rise from the bottom, cap at 92% of the viewport height, and pad content 20px. The app respects safe-area insets top and bottom, disables pinch and double-tap zoom, and keeps inputs at 16px or larger so focus never zooms.

## Elevation & Depth

Depth is tonal first: white surfaces on a stone ground, Linen insets inside white sheets. Grouped lists carry only a hairline-faint shadow. Real lift is reserved for objects in the brand or card colour, which get a soft glow tinted from their own fill, and for overlays, which get a dark ambient shadow over a 42% ink scrim.

### Shadow Vocabulary
- **Group whisper** (`0 1px 2px rgba(20,20,15,.04)`): grouped list containers.
- **Segment lift** (`0 1px 3px rgba(0,0,0,.08)`): the selected segment in a segmented control.
- **Brand glow** (`0 10px 28px -12px color-mix(in oklab, var(--brand) 70%, transparent)`): the Home summary block.
- **Add glow** (`0 6px 16px -4px color-mix(in oklab, var(--brand) 55%, transparent), 0 1px 2px rgba(0,0,0,.1)`): the raised Add slot.
- **Card glow** (`0 12px 24px -14px <card dark stop at 80%>, 0 1px 2px rgba(0,0,0,.1)`): credit-card and pay-later faces.
- **Sheet** (`0 -8px 40px rgba(0,0,0,.18)`): bottom sheets.
- **Toast** (`0 10px 30px rgba(0,0,0,.25)`): the ink toast.
- **Knob** (`0 1px 3px rgba(0,0,0,.2)`): the white knob of the switch.

### Named Rules
**The Coloured Glow Rule.** Only an object filled with brand or card colour casts a tinted glow, sampled from its own fill. Neutral surfaces stay effectively flat; never put a grey drop shadow on a white card to make it "pop".

## Shapes

Soft, continuous corners at every scale, nested so the outer container is always rounder than what it holds: sheet top (28px) over blocks (24px) over card faces (22px) over grouped lists (20px) over field groups and primary buttons (16px) over tiles (14px, 18px large, 12px small) and segments (12px). Every small control (Pay, chips, filter and choice pills, progress bars) is a full pill. Row dividers are 1px hairlines inset to start after the category tile, never full-bleed. No outlines on containers; borders appear only on unselected choice pills and the tab bar's top edge. The keyboard focus ring is a 2px teal outline offset 2px with 10px corners.

**The Concentric Corners Rule.** A container's radius is larger than any radius inside it.

## Components

### Buttons
- **Shape:** primary actions use gently rounded rectangles (16px), full width, 56px tall (52px inside detail blocks); row actions are pills.
- **Primary:** teal fill, white 16px bold label. Pressed: Lagoon Deep. Disabled: 40% opacity.
- **Pay (row action):** 36px pill, 13px bold. Lagoon Mist fill with teal text by default; filled teal with white text on overdue rows. Press scales to 0.97.
- **Secondary:** white surface, 15px bold ink label with a duotone icon (Edit, Archive), 16px corners, sitting in a two-column grid.
- **Add slot:** 52px rounded square (18px), teal, a white Solar Linear plus at 28px (stroke 2.4), Add glow. Press scales it to 0.95 and darkens it.

### Chips
- **Status chip:** 24px pill, 12px bold: Paid (green on green-soft), Min paid and Partly paid (amber on amber-soft), Overdue (red on red-soft), Unpaid (Ink 2 on Linen).
- **Choice pills** (account, date paid): 40px outlined pills; selected becomes filled teal with a teal border.
- **Filter pills** (History): 36px; selected is ink fill with stone text, unselected white with Ink 2 text.
- **Segmented control** (Payday window, payment size): a Linen or ink-tinted track with 4px inset; the selected segment is white with Segment lift.

### Cards / Containers
- **Grouped list:** white, 20px corners, Group whisper, optional sentence-case title and right-aligned tabular total above it.
- **Detail block:** white, 24px corners, 20px padding; a 13px caption and optional status chip, a 32px display amount, a 14px status line, then the primary action.
- **Card face:** credit-card ratio (1.66, or 1.9 compact), 22px corners, two-stop 150-degree gradient per card tone with a white radial sheen at top left, white text (dark text on the light lime tone), status pill top right, statement balance bottom left, due date bottom right.

### Inputs / Fields
- **Field group:** Linen inset, 16px corners, rows of 56px with a 112px Ink 2 label on the left and a right-aligned 16px 600-weight value; inset hairlines between rows. Focus tints the whole row 5% teal; caret is teal; placeholders are Ink 3.
- **Switch:** 52 by 32 pill, hairline track turning teal when on, white knob that slides with the expo ease.
- **Error:** 14px semibold red text under the field, announced as an alert.

### Navigation
- **Tab bar:** white at 95% with blur, hairline top border, five columns. Tabs are a 26px Bold Duotone icon over an 11px bold label; active is Lagoon Text with the icon's secondary tone at 40% opacity, inactive Ink 3 at 32%.
- **Pushed header:** sticky, stone at 90% with blur, 28px Linear back chevron in a 44px hit area, centred 17px bold title.
- **Bottom sheet:** white, 28px top corners, 36 by 4 grabber, 18px bold title with a Close Circle duotone button, slides up over 0.38s with the expo ease and leaves over 0.22s.
- **Toast:** ink pill-rectangle (16px corners) above the tab bar with stone text and a Foam Undo action; enters with a 16px rise.

### Payday Summary Block (signature)
The first object on Home: teal block, 24px corners, 20px padding, a soft white radial highlight at top right, Brand glow. Top row: Foam caption naming the next payday, with a translucent white pill counting days. Then the 34px amount left, a Foam caption, an 8px white progress bar on a 18% white track showing the share paid, and a bottom row with the compact paid-of-due figure and a "Payday plan" link with a Linear chevron. The whole block links to Payday.

### Occurrence Row (signature)
Category tile (44px, 14px corners), then a 15px semibold name that clamps to two lines, then a 13px single-line due line, a right-aligned tabular amount, and Pay or a green paid check. The due line uses one date format on every screen, with no "Due" prefix before a date. Within 7 days it shows weekday and date ("Fri, Nov 27"); further out, month and day ("Dec 12"). Relative words replace the date only at the edges: "Due today", "Due tomorrow", "4 days late", "Paid". Status follows as " · " suffixes ("Nov 27 · Min paid", "· Min ₱500", "· Estimate", "· from Maya"). The date turns amber within three days and bold red when overdue. Home and Payday use this row; History rows follow the same anatomy with the paid date and account.

### Category Tile (signature)
A rounded square tinted 13% of its category hue into the surface (24% in dark mode), holding a Solar Bold Duotone icon in the full hue; in dark mode the icon is brightened (brightness 1.45, saturate 0.9) to hold contrast on stone. Sizes 36px, 44px and 56px.

## Do's and Don'ts

### Do:
- **Do** lead every list screen with what is due soonest, overdue first, in white grouped lists on the stone ground.
- **Do** use Solar Bold Duotone for every object icon; Solar Linear is only for navigation chevrons and the plus in the centre Add slot.
- **Do** write every row date the same way: "Fri, Nov 27" within 7 days, "Dec 12" beyond, with status as a " · " suffix and no "Due" prefix before a date.
- **Do** put tabular figures on every amount and make the amount the boldest text in its row.
- **Do** escalate an overdue item by filling its Pay button teal and turning its due line red, nothing more.
- **Do** keep radii concentric: sheet 28px, block 24px, group 20px, field group 16px, tile 14px.
- **Do** map every colour role to its warm stone dark counterpart; dark mode follows the system setting.

### Don't:
- **Don't** add a second brand colour, or use teal as decoration on content that does not summarise or move money.
- **Don't** give a category tile an amber, orange or red hue; those bands belong to due-soon and overdue.
- **Don't** fill rows, blocks or buttons with red.
- **Don't** add hero banners, promo tiles, dense menus or anything that reads as a corporate bank app.
- **Don't** add mascots, confetti, streaks or celebratory motion.
- **Don't** add uppercase or letter-spaced labels above titles; section titles are sentence-case 15px bold.
- **Don't** cast grey drop shadows on white surfaces; depth on neutrals is tonal.
