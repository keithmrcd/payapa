// History screen helpers: filters, month groups, row text. Rows are `money.history` entries.

import { shortDate, monthName } from './format'

/** Accounts with at least one payment (archived ones too, so old payments stay findable), in `accounts` order. */
export function accountsWithPayments(accounts, rows) {
  const used = new Set(rows.map((r) => r.account))
  return accounts.filter((a) => used.has(a.id))
}

/** The selected account if it still has a pill, else 'all' (its last payment was deleted). */
export function effectiveAccount(selected, pills) {
  return selected !== 'all' && pills.some((a) => a.id === selected) ? selected : 'all'
}

export function filterHistory(rows, { kind = 'all', account = 'all' } = {}) {
  return rows.filter((r) => (kind === 'all' || r.kind === kind) && (account === 'all' || r.account === account))
}

/** Rows grouped by paid month, keeping input order, with each month's total. */
export function groupByMonth(rows) {
  const g = new Map()
  for (const r of rows) {
    const k = r.paidOn.slice(0, 7)
    if (!g.has(k)) g.set(k, [])
    g.get(k).push(r)
  }
  return [...g.entries()].map(([k, list]) => ({ k, label: monthName(k + '-01'), list, total: list.reduce((n, r) => n + r.amount, 0) }))
}

/** "Nov 19 · BDO · Ref R1 · note", skipping parts that are missing. */
export function paymentMeta(p, accountShort) {
  return [shortDate(p.paidOn), accountShort, p.referenceNo && `Ref ${p.referenceNo}`, p.note].filter(Boolean).join(' · ')
}
