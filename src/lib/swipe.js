// Swipe right to pay: when a drag counts as a swipe, and when letting go opens the pay sheet.

export const LOCK = 10 // px moved before deciding between swipe and scroll
export const THRESHOLD = 96 // px dragged that always opens the sheet
const FLICK_MIN = 48 // px a quick flick must still cover
const FLICK_SPEED = 0.5 // px per ms

/** 'idle' until the finger moves LOCK px; then 'track' for a rightward, mostly flat move, else 'scroll'. */
export function swipeAxis(dx, dy) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < LOCK) return 'idle'
  return dx > 0 && Math.abs(dx) > 1.5 * Math.abs(dy) ? 'track' : 'scroll'
}

/** On release: 'pay' past THRESHOLD or on a quick flick, else 'cancel'. */
export function swipeRelease({ dx, ms }) {
  if (dx >= THRESHOLD) return 'pay'
  return dx >= FLICK_MIN && dx / Math.max(ms, 1) >= FLICK_SPEED ? 'pay' : 'cancel'
}
