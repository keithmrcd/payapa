import { iso, toDate } from './dates'

/** Payday period containing `dateIso`: the 15th covers 15–29, the 30th covers 30–14. */
export function paydayFor(dateIso) {
  const d = toDate(dateIso)
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate()
  const end = (yy, mm) => iso(yy, mm, 30) // iso() clamps Feb to its last day
  const lastDay = new Date(y, m + 1, 0).getDate()
  const endDay = Math.min(30, lastDay)
  if (day >= 15 && day < endDay) return { bucket: '15', date: iso(y, m, 15), from: iso(y, m, 15), to: iso(y, m, endDay - 1) }
  if (day >= endDay) return { bucket: '30', date: end(y, m), from: end(y, m), to: iso(y, m + 1, 14) }
  return { bucket: '30', date: end(y, m - 1), from: end(y, m - 1), to: iso(y, m, 14) }
}

export function nextPaydayAfter(p) {
  const d = toDate(p.to)
  return paydayFor(iso(d.getFullYear(), d.getMonth(), d.getDate() + 1))
}

/**
 * Payday that funds an item due on `dueIso`. 'auto' uses the bucket rule; '15' or '30'
 * forces that bucket: the latest payday of it on or before the due date.
 */
export function paydayForDue(dueIso, override = 'auto') {
  if (override !== '15' && override !== '30') return paydayFor(dueIso)
  const d = toDate(dueIso)
  const y = d.getFullYear(), m = d.getMonth()
  const paydayOf = (mm) => iso(y, mm, override === '15' ? 15 : 30)
  const thisMonth = paydayOf(m)
  return paydayFor(thisMonth <= dueIso ? thisMonth : paydayOf(m - 1))
}
