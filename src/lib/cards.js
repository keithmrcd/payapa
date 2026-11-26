// Card cycles (statement date → due date) and installment progress. Pure functions.

import { iso, toDate, todayIso, addMonths } from './dates'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthIndex = (date) => { const d = toDate(date); return d.getFullYear() * 12 + d.getMonth() }

/** The cycle whose statement falls in month `m0` (0-based) of `y`. Due is the first due day after the statement. */
export function cycleFor(card, y, m0) {
  const statementDate = iso(y, m0, card.statementDay)
  const dueDate = card.dueDay > card.statementDay ? iso(y, m0, card.dueDay) : iso(y, m0 + 1, card.dueDay)
  return { statementDate, dueDate, key: statementDate.slice(0, 7) }
}

/** The most recent cycle whose statement date is on or before today. */
export function latestClosedCycle(card, today) {
  const t = toDate(today)
  const c = cycleFor(card, t.getFullYear(), t.getMonth())
  return c.statementDate <= today ? c : cycleFor(card, t.getFullYear(), t.getMonth() - 1)
}

export function nextCycle(card, cycle) {
  const d = toDate(cycle.statementDate)
  return cycleFor(card, d.getFullYear(), d.getMonth() + 1)
}

/** The local date the card was added, or null when unknown. */
export const addedOn = (card) => (card.createdAt ? todayIso(new Date(card.createdAt)) : null)

/** Live statements of one card, newest statement date first. */
export const statementsFor = (cardId, cardStatements) =>
  cardStatements
    .filter((s) => s.cardId === cardId && !s.deletedAt)
    .sort((a, b) => (a.statementDate < b.statementDate ? 1 : a.statementDate > b.statementDate ? -1 : 0))

/** First statement of a plan that is `paid` months in as of the statement on `anchorDate`. */
export const firstStatementFromPaid = (card, anchorDate, paid) =>
  paid > 0 ? addMonths(anchorDate, -(paid - 1), card.statementDay) : addMonths(anchorDate, 1, card.statementDay)

/**
 * The SOA "already paid" is read from: the latest entered statement when it is the closed cycle's or the
 * one before (the SOA in hand during the needs-statement window), else the latest closed cycle.
 */
export function installmentAnchor(card, cardStatements, today) {
  const closed = latestClosedCycle(card, today).statementDate
  const entered = statementsFor(card.id, cardStatements)[0]?.statementDate
  const date = entered && monthIndex(closed) - monthIndex(entered) <= 1 ? entered : closed
  return { date, label: MONTHS[toDate(date).getMonth()] }
}

/** Months on statements so far (one per statement date from the first), capped at the plan's months. */
export function installmentProgress(plan, card, today) {
  const closed = latestClosedCycle(card, today).statementDate
  const paid = Math.min(plan.months, Math.max(0, monthIndex(closed) - monthIndex(plan.firstStatementDate) + 1))
  return { paid, months: plan.months, left: (plan.months - paid) * plan.monthlyAmount, done: paid >= plan.months }
}
