// Due dates of a bill, subscription or loan, computed from its schedule versions.
// Each version applies from its `effectiveFrom` up to (not including) the next one's.

import { iso, toDate, addDays } from './dates'

const SCHEDULE_FIELDS = ['recurrence', 'dueDay', 'dueMonth', 'interval', 'amount', 'variable']
const FAR_FUTURE = '9999-12-31'

/** Due dates of one version, from `from` through `to` inclusive. */
function versionDates(v, from, to) {
  const out = []
  const step = v.interval || 1
  const start = toDate(v.effectiveFrom)
  const push = (due) => { if (due >= from && due <= to) out.push(due) }

  if (v.recurrence === 'once') {
    push(v.effectiveFrom)
  } else if (v.recurrence === 'weekly') {
    for (let due = v.effectiveFrom; due <= to; due = addDays(due, 7 * step)) push(due)
  } else if (v.recurrence === 'yearly') {
    for (let k = 0; ; k += step) {
      const due = iso(start.getFullYear() + k, v.dueMonth, v.dueDay)
      if (due > to) break
      push(due)
    }
  } else {
    for (let k = 0; ; k += step) {
      const due = iso(start.getFullYear(), start.getMonth() + k, v.dueDay)
      if (due > to) break
      push(due)
    }
  }
  return out
}

const loanCount = (item) => (item.totalPayments ? Math.max(0, item.totalPayments - (item.paidBefore || 0)) : null)

/** Every due date from `startDate` through `toIso`, as `{ due, amount, variable }`. */
export function dueDates(item, toIso) {
  const limit = loanCount(item)
  const out = []
  item.schedule.forEach((v, i) => {
    const next = item.schedule[i + 1]
    const from = v.effectiveFrom > item.startDate ? v.effectiveFrom : item.startDate
    const to = next ? addDays(next.effectiveFrom, -1) : FAR_FUTURE
    const end = to < toIso ? to : toIso
    for (const due of versionDates(v, from, end)) {
      out.push({ due, amount: v.amount, variable: !!v.variable })
    }
  })
  return limit === null ? out : out.slice(0, limit)
}

/** Due date of the last loan payment, or null when this isn't a loan or it is already paid off. */
export function loanEndDate(item) {
  const limit = loanCount(item)
  if (!limit) return null
  const all = dueDates(item, FAR_FUTURE)
  return all[all.length - 1]?.due ?? null
}

export function loanProgress(item, paidCount) {
  const total = item.totalPayments
  return { paid: Math.min((item.paidBefore || 0) + paidCount, total), total }
}

/**
 * Apply an edit. Schedule fields start a new version effective `nextUnpaidDue`;
 * everything else merges onto the item. Never mutates `item`.
 */
export function withScheduleEdit(item, changes, nextUnpaidDue) {
  const scheduleChanges = {}
  const rest = {}
  for (const [k, val] of Object.entries(changes)) {
    if (SCHEDULE_FIELDS.includes(k)) scheduleChanges[k] = val
    else rest[k] = val
  }
  const prev = [...item.schedule].reverse().find((v) => v.effectiveFrom <= nextUnpaidDue) ?? item.schedule[0]
  const changed = SCHEDULE_FIELDS.some((k) => k in scheduleChanges && scheduleChanges[k] !== prev[k])
  if (!changed) return { ...item, ...rest, schedule: item.schedule.map((v) => ({ ...v })) }

  const version = { ...prev, ...scheduleChanges, effectiveFrom: nextUnpaidDue }
  const schedule = item.schedule
    .filter((v) => v.effectiveFrom !== nextUnpaidDue)
    .map((v) => ({ ...v }))
  schedule.push(version)
  schedule.sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))
  return { ...item, ...rest, schedule }
}
