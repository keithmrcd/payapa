import { describe, it, expect } from 'vitest'
import { accountsWithPayments, effectiveAccount, filterHistory, groupByMonth, paymentMeta, samePayment, accountChoices } from './history'

const A = { id: 'a', short: 'BDO', archivedAt: null }
const B = { id: 'b', short: 'Old', archivedAt: '2026-01-01T00:00:00Z' }
const C = { id: 'c', short: 'GCash', archivedAt: null }
const row = (over) => ({ id: Math.random().toString(36), paidOn: '2026-11-19', amount: 100, kind: 'bill', account: 'a', ...over })

describe('history helpers', () => {
  it('accountsWithPayments keeps archived accounts that have payments, in accounts order', () => {
    const rows = [row({ account: 'c' }), row({ account: 'b' }), row({ account: 'c' })]
    expect(accountsWithPayments([A, B, C], rows).map((a) => a.id)).toEqual(['b', 'c'])
  })

  it('effectiveAccount falls back to all when the account has no payments left', () => {
    expect(effectiveAccount('b', [{ id: 'a' }])).toBe('all')
    expect(effectiveAccount('a', [{ id: 'a' }])).toBe('a')
    expect(effectiveAccount('all', [])).toBe('all')
  })

  it('filterHistory combines type and account', () => {
    const rows = [row({ id: '1' }), row({ id: '2', kind: 'subscription' }), row({ id: '3', account: 'c' })]
    expect(filterHistory(rows, { kind: 'bill', account: 'a' }).map((r) => r.id)).toEqual(['1'])
    expect(filterHistory(rows, { kind: 'all', account: 'a' }).map((r) => r.id)).toEqual(['1', '2'])
    expect(filterHistory(rows, { kind: 'all', account: 'all' })).toHaveLength(3)
  })

  it('groupByMonth totals each month', () => {
    const rows = [row({ amount: 100 }), row({ amount: 250, paidOn: '2026-11-02' }), row({ amount: 70, paidOn: '2026-10-30' })]
    const g = groupByMonth(rows)
    expect(g.map((m) => [m.k, m.label, m.total, m.list.length])).toEqual([
      ['2026-11', 'November 2026', 350, 2],
      ['2026-10', 'October 2026', 70, 1],
    ])
  })

  it('paymentMeta joins date, account, ref, and note', () => {
    expect(paymentMeta({ paidOn: '2026-11-19', referenceNo: 'R1', note: 'cash-in' }, 'BDO')).toBe('Nov 19 · BDO · Ref R1 · cash-in')
    expect(paymentMeta({ paidOn: '2026-11-19', referenceNo: null, note: null }, undefined)).toBe('Nov 19')
  })
})

describe('samePayment', () => {
  const row = { amount: 210000, paidOn: '2026-11-20', account: 'a1', referenceNo: null, note: 'hi' }
  it('is true when nothing changed (blank and missing count as the same)', () => {
    expect(samePayment(row, { amount: 210000, paidOn: '2026-11-20', account: 'a1', referenceNo: '', note: 'hi' })).toBe(true)
  })
  it('is false when any field changed', () => {
    expect(samePayment(row, { amount: 210001, paidOn: '2026-11-20', account: 'a1', referenceNo: '', note: 'hi' })).toBe(false)
    expect(samePayment(row, { amount: 210000, paidOn: '2026-11-20', account: 'a2', referenceNo: '', note: 'hi' })).toBe(false)
    expect(samePayment(row, { amount: 210000, paidOn: '2026-11-20', account: 'a1', referenceNo: 'X1', note: 'hi' })).toBe(false)
  })
})

describe('accountChoices', () => {
  const active = [{ id: 'a1', short: 'BDO' }, { id: 'a2', short: 'GCash' }]
  it('lists active accounts', () => {
    expect(accountChoices(active, null).map((a) => a.id)).toEqual(['a1', 'a2'])
  })
  it('puts an archived account first when the payment being edited used it', () => {
    const old = { id: 'x', short: 'Old bank', archivedAt: '2026-01-01T00:00:00Z' }
    expect(accountChoices(active, old).map((a) => a.id)).toEqual(['x', 'a1', 'a2'])
    expect(accountChoices(active, { id: 'a1', archivedAt: null }).map((a) => a.id)).toEqual(['a1', 'a2'])
  })
})
