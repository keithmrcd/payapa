// Occurrences (what is due, paid, overdue) computed from items, cards, statements and payments.

import { iso, toDate, daysBetween, addDays } from './dates'
import { dueDates } from './recurrence'
import { paydayForDue } from './payday'

/** Finish an occurrence: paid total, status, days left. A variable bill is settled by any payment. */
function finish(input, today) {
  let o = input
  const settled = o.variable ? o.paid > 0 : o.paid >= o.amount
  if (o.variable && settled) o = { ...o, amount: o.paid }
  const status = settled ? 'paid' : o.paid === 0 ? 'unpaid' : o.minimum && o.paid >= o.minimum ? 'minimum' : 'partial'
  const daysLeft = daysBetween(today, o.due)
  return { ...o, key: o.ref, status, daysLeft, overdue: !settled && daysLeft < 0, left: Math.max(0, o.amount - o.paid) }
}

/** Items from `startDate` through the end of the month two months out; cards from their latest statement. */
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
    let st = null
    for (const s of cardStatements) {
      if (s.cardId !== c.id || s.deletedAt) continue
      if (!st || s.dueDate > st.dueDate) st = s
    }
    if (!st) continue
    const ref = `card:${c.id}:${st.dueDate}`
    out.push(finish({
      ref, type: 'card', id: c.id, name: c.name, kind: c.type, category: c.type,
      due: st.dueDate, amount: st.statementBalance, minimum: st.minimumDue, paid: paidFor(ref),
      account: c.accountId, last4: c.last4, tone: c.tone, payday: paydayForDue(st.dueDate).date,
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
