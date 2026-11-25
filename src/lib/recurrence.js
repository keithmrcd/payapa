// Due dates of a bill, subscription or loan, computed from its schedule versions.
// Each version applies from its `effectiveFrom` up to (not including) the next one's.

import { iso, toDate, addDays } from './dates'

const SCHEDULE_FIELDS = ['recurrence', 'dueDay', 'dueMonth', 'interval', 'amount', 'variable']

/**
 * Due dates of one version on or after `from` and strictly after `after` (when set),
 * through `to` (null = no end; then `limit` must stop it).
 * Monthly and yearly series start in the cycle of `effectiveFrom`; weekly continues from it.
 */
function versionDates(v, from, after, to, limit) {
  const out = []
  const step = Math.max(1, v.interval || 1)
  const start = toDate(v.effectiveFrom)
  const ok = (due) => due >= from && (after == null || due > after)
  const past = (due) => to != null && due > to

  if (v.recurrence === 'once') {
    if (ok(v.effectiveFrom) && !past(v.effectiveFrom) && limit > 0) out.push(v.effectiveFrom)
    return out
  }
  for (let k = 0; out.length < limit; k += step) {
    let due
    if (v.recurrence === 'weekly') due = addDays(v.effectiveFrom, 7 * k)
    else if (v.recurrence === 'yearly') due = iso(start.getFullYear() + k, v.dueMonth, v.dueDay)
    else due = iso(start.getFullYear(), start.getMonth() + k, v.dueDay)
    if (past(due)) break
    if (ok(due)) out.push(due)
  }
  return out
}

const loanCount = (item) => (item.totalPayments ? Math.max(0, item.totalPayments - (item.paidBefore || 0)) : null)

/** Dues through `toIso` (null = no end; loans only), at most `limit` of them. */
function generate(item, toIso, limit) {
  const out = []
  let last = null
  item.schedule.forEach((v, i) => {
    const next = item.schedule[i + 1]
    const to = next ? addDays(next.effectiveFrom, -1) : toIso
    const remaining = limit - out.length
    for (const due of versionDates(v, item.startDate, last, to, remaining)) {
      last = due
      if (toIso == null || due <= toIso) out.push({ due, amount: v.amount, variable: !!v.variable })
    }
  })
  return out.slice(0, limit)
}

/** Every due date from `startDate` through `toIso`, as `{ due, amount, variable }`. */
export function dueDates(item, toIso) {
  const limit = loanCount(item)
  if (limit == null && toIso == null) throw new Error('dueDates needs an end date for items that are not loans')
  return generate(item, toIso, limit ?? Infinity)
}

/** Due date of the last loan payment, or null when this isn't a loan or it is already paid off. */
export function loanEndDate(item) {
  const limit = loanCount(item)
  if (!limit) return null
  return generate(item, null, limit).at(-1)?.due ?? null
}

/** The schedule version in force on `today` (else the first, for an item that starts later). */
export const currentVersion = (item, today) =>
  [...item.schedule].reverse().find((v) => v.effectiveFrom <= today) ?? item.schedule[0]

export function loanProgress(item, paidCount) {
  const total = item.totalPayments
  if (!total) return null
  return { paid: Math.min((item.paidBefore || 0) + paidCount, total), total }
}

// First date of a version in the cycle (month / year) of `date`; weekly and once keep `date`.
function firstInCycle(v, date) {
  const d = toDate(date)
  if (v.recurrence === 'monthly') return iso(d.getFullYear(), d.getMonth(), v.dueDay)
  if (v.recurrence === 'yearly') return iso(d.getFullYear(), v.dueMonth, v.dueDay)
  return date
}

/**
 * Apply an edit. Schedule fields start a new version effective `base` (the edit base date);
 * everything else merges onto the item. Never mutates `item`.
 * - `base` null (a one-off with nothing left): schedule changes merge into the last version.
 * - `first` (base is the first occurrence and nothing is paid): schedule[0] changes in place,
 *   and startDate moves to the new schedule's first date in the old startDate's cycle.
 */
export function withScheduleEdit(item, changes, base, { first = false } = {}) {
  const scheduleChanges = {}
  const rest = {}
  for (const [k, val] of Object.entries(changes)) {
    if (SCHEDULE_FIELDS.includes(k)) scheduleChanges[k] = val
    else rest[k] = val
  }
  const copy = () => item.schedule.map((v) => ({ ...v }))
  const prev = base == null ? item.schedule.at(-1) : first ? item.schedule[0] : currentVersion(item, base)
  const changed = SCHEDULE_FIELDS.some((k) => k in scheduleChanges && scheduleChanges[k] !== prev[k])
  if (!changed) return { ...item, ...rest, schedule: copy() }

  if (base == null) {
    const schedule = copy()
    schedule[schedule.length - 1] = { ...prev, ...scheduleChanges }
    return { ...item, ...rest, schedule }
  }
  if (first) {
    const v = { ...prev, ...scheduleChanges }
    v.effectiveFrom = firstInCycle(v, item.startDate)
    const schedule = copy()
    schedule[0] = v
    return { ...item, ...rest, startDate: v.effectiveFrom, schedule }
  }

  const version = { ...prev, ...scheduleChanges, effectiveFrom: base }
  const schedule = copy().filter((v) => v.effectiveFrom !== base)
  schedule.push(version)
  schedule.sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))
  return { ...item, ...rest, schedule }
}
