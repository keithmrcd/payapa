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

/**
 * Stops the click a mouse swipe fires on release from also opening the row's link.
 * Touch swipes fire no click, so the block expires right after release; a later
 * keyboard or assistive-tech click is never swallowed.
 */
export function clickGuard() {
  let armed = false
  return {
    swiped() { armed = true },
    released() { if (armed) setTimeout(() => { armed = false }) },
    consume() {
      const was = armed
      armed = false
      return was
    },
  }
}

/**
 * The row's pointer flow as plain steps, so it can be tested without a DOM.
 * down/move/up take { x, y, t }; move returns { capture, offset } while tracking; up returns { pay, swiped }.
 */
export function swipeGesture() {
  let g = null
  return {
    down({ x, y, t }) { g = { x, y, t, axis: 'idle', dx: 0 }; return {} },
    move({ x, y }) {
      if (!g || g.axis === 'scroll') return {}
      const dx = x - g.x
      let capture = false
      if (g.axis === 'idle') {
        g.axis = swipeAxis(dx, y - g.y)
        if (g.axis !== 'track') return {}
        capture = true
      }
      g.dx = Math.max(0, dx)
      // Past the threshold the row follows with resistance, up to 160px.
      const offset = g.dx <= THRESHOLD ? g.dx : Math.min(160, THRESHOLD + (g.dx - THRESHOLD) * 0.35)
      return { capture, offset }
    },
    up({ t }) {
      const swiped = g?.axis === 'track'
      const pay = swiped && swipeRelease({ dx: g.dx, ms: t - g.t }) === 'pay'
      g = null
      return { pay, swiped }
    },
    cancel() { g = null },
  }
}
