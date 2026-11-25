// Dates are local YYYY-MM-DD strings. Never use toISOString() for these.

const pad = (n) => String(n).padStart(2, '0')

export function iso(y, m, d) {
  // m is 0-based and may overflow (12 → next January); day clamps to month end
  const first = new Date(y, m, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return `${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(Math.min(d, last))}`
}

export const toDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

export const todayIso = (now = new Date()) => iso(now.getFullYear(), now.getMonth(), now.getDate())

export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5)

export function addDays(dateIso, n) {
  const d = toDate(dateIso)
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) // Date rolls over; iso() only clamps
  return iso(t.getFullYear(), t.getMonth(), t.getDate())
}

/** `dateIso` shifted by `n` months, landing on `day` (clamped to the month's last day). */
export function addMonths(dateIso, n, day) {
  const d = toDate(dateIso)
  return iso(d.getFullYear(), d.getMonth() + n, day)
}
