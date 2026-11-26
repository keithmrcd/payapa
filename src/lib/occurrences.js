// Occurrences (what is due, paid, overdue) computed from items, cards, statements and payments.

import { iso, toDate, daysBetween, addDays } from './dates'
import { dueDates } from './recurrence'
import { paydayForDue } from './payday'
import { latestClosedCycle, addedOn } from './cards'

/**
 * Finish an occurrence: paid total, status, days left. A variable bill is settled by any payment.
 * A card cycle whose statement isn't entered yet has status 'statement' and is never settled.
 */
function finish(input, today) {
  let o = input
  if (o.needsStatement) {
    const daysLeft = daysBetween(today, o.due)
    return { ...o, key: o.ref, status: 'statement', daysLeft, overdue: daysLeft < 0, left: 0 }
  }
  const settled = o.variable ? o.paid > 0 : o.paid >= o.amount
  if (o.variable && settled) o = { ...o, amount: o.paid }
  const status = settled ? 'paid' : o.paid === 0 ? 'unpaid' : o.minimum && o.paid >= o.minimum ? 'minimum' : 'partial'
  const daysLeft = daysBetween(today, o.due)
  return { ...o, key: o.ref, status, daysLeft, overdue: !settled && daysLeft < 0, left: Math.max(0, o.amount - o.paid) }
}

/** Items from `startDate` through the end of the month two months out; cards from every statement, plus a missing one. */
export function buildOccurrences({ items = [], cards = [], cardStatements = [], payments = [] }, today) {
  const t = toDate(today)
  const horizon = iso(t.getFullYear(), t.getMonth() + 2, 31)
  const paidByRef = new Map()
  for (const p of payments) {
    if (p.deletedAt) continue
    paidByRef.set(p.ref, (paidByRef.get(p.ref) || 0) + p.amount)
  }
  const paidFor = (ref) => paidByRef.get(ref) || 0
  const out = []

  for (const it of items) {
    if (it.archivedAt) continue
    for (const d of dueDates(it, horizon)) {
      const ref = `item:${it.id}:${d.due}`
      out.push(finish({
        ref, type: 'item', id: it.id, name: it.name, kind: it.kind, category: it.category,
        due: d.due, amount: d.amount, minimum: null, paid: paidFor(ref),
        account: it.accountId, variable: d.variable, payday: paydayForDue(d.due, it.paydayBucket).date,
      }, today))
    }
  }

  for (const c of cards) {
    if (c.archivedAt) continue
    const base = { type: 'card', id: c.id, name: c.name, kind: c.type, category: c.type, account: c.accountId, tone: c.tone }
    const entered = new Set()
    for (const s of cardStatements) {
      if (s.cardId !== c.id || s.deletedAt) continue
      entered.add(s.statementDate.slice(0, 7))
      const ref = `card:${c.id}:${s.dueDate}`
      out.push(finish({
        ...base, ref, statementId: s.id, statementDate: s.statementDate, needsStatement: false,
        due: s.dueDate, amount: s.statementBalance, minimum: s.minimumDue, paid: paidFor(ref), payday: paydayForDue(s.dueDate, c.paydayBucket).date,
      }, today))
    }
    // The latest closed cycle with no statement yet, unless it was due before the card was added.
    if (!c.statementDay || !c.dueDay) continue
    const cyc = latestClosedCycle(c, today)
    const added = addedOn(c)
    if (entered.has(cyc.key) || (added && cyc.dueDate < added)) continue
    out.push(finish({
      ...base, ref: `card:${c.id}:${cyc.dueDate}:statement`, statementDate: cyc.statementDate, needsStatement: true,
      due: cyc.dueDate, amount: 0, minimum: null, paid: 0, payday: paydayForDue(cyc.dueDate, c.paydayBucket).date,
    }, today))
  }

  return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : b.amount - a.amount))
}

/**
 * Where a schedule edit takes effect: the first occurrence after the last one with any payment
 * (paid or partly paid), else the first occurrence; past the generated window, the next due date
 * on or after today. Null for a one-off (or finished loan) with nothing left.
 * `first` is true when that date is the item's first due date and nothing has been paid.
 * A schedule change from here never moves a due date that has payments.
 */
export function editBase(item, payments, today) {
  const occs = buildOccurrences({ items: [{ ...item, archivedAt: null }], payments }, today)
  let last = -1
  occs.forEach((o, i) => { if (o.paid > 0) last = i })
  const lastPaid = last >= 0 ? occs[last].due : null
  const date = occs[last + 1]?.due ??
    dueDates(item, addDays(today, 800)).find((d) => d.due >= today && (lastPaid == null || d.due > lastPaid))?.due ??
    null
  const anyPaid = payments.some((p) => !p.deletedAt && p.ref.startsWith(`item:${item.id}:`))
  const first = date != null && !anyPaid && dueDates(item, date)[0]?.due === date
  return { date, first }
}

export function homeGroups(occurrences, today) {
  const open = occurrences.filter((o) => o.status !== 'paid')
  const days = (o) => daysBetween(today, o.due)
  return {
    overdue: open.filter((o) => o.due < today),
    week: open.filter((o) => days(o) >= 0 && days(o) <= 7),
    later: open.filter((o) => days(o) > 7 && days(o) <= 21),
    paid: occurrences.filter((o) => o.status === 'paid' && o.due.slice(0, 7) === today.slice(0, 7)),
  }
}

/** The statement a card's face and detail show: earliest unpaid entered, else the missing one, else the latest. */
export function currentStatement(occurrences, cardId) {
  const mine = occurrences.filter((o) => o.type === 'card' && o.id === cardId)
  const entered = mine.filter((o) => !o.needsStatement).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
  return entered.find((o) => o.status !== 'paid') ?? mine.find((o) => o.needsStatement) ?? entered.at(-1)
}

/**
 * What one payday has to cover. With `carry` (the current payday), anything still unpaid from earlier
 * paydays is added as `earlier`, oldest first. A card statement carries only while it's below its
 * minimum and is the card's newest: once a newer SOA is entered, its balance rolls into that one.
 */
export function paydaySummary(occurrences, payday, { carry = false } = {}) {
  const own = occurrences.filter((o) => o.payday === payday.date)
  const newest = new Map()
  for (const o of occurrences) {
    if (o.type === 'card' && !o.needsStatement && (!newest.has(o.id) || o.due > newest.get(o.id))) newest.set(o.id, o.due)
  }
  const late = (o) => {
    if (o.status === 'paid') return false
    if (o.type !== 'card' || o.needsStatement) return true
    return (o.status === 'unpaid' || o.status === 'partial') && newest.get(o.id) === o.due
  }
  const earlier = carry ? occurrences.filter((o) => o.payday < payday.date && late(o)) : []
  const all = [...earlier, ...own]
  const due = all.reduce((n, o) => n + o.amount, 0)
  const paid = all.reduce((n, o) => n + Math.min(o.paid, o.amount), 0)
  return {
    own, earlier, due, paid, left: Math.max(0, due - paid),
    carried: earlier.reduce((n, o) => n + o.left, 0),
    missing: all.filter((o) => o.needsStatement).length,
  }
}
