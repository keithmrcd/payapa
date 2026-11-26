import { describe, it, expect } from 'vitest'
import {
  cycleFor, latestClosedCycle, nextCycle, addedOn, statementsFor,
  firstStatementFromPaid, installmentAnchor, installmentProgress,
} from './cards'

const card = (statementDay, dueDay, extra = {}) => ({ id: 'c1', statementDay, dueDay, ...extra })

describe('cycles', () => {
  it('due lands the same month when the due day is after the statement day', () => {
    expect(cycleFor(card(2, 27), 2026, 10)).toEqual({ statementDate: '2026-11-02', dueDate: '2026-11-27', key: '2026-11' })
  })
  it('due lands next month when the due day is on or before the statement day', () => {
    expect(cycleFor(card(20, 5), 2026, 11).dueDate).toBe('2027-01-05')
    expect(cycleFor(card(20, 20), 2026, 10).dueDate).toBe('2026-12-20')
  })
  it('statement day 31 clamps in February', () => {
    expect(cycleFor(card(31, 20), 2027, 1).statementDate).toBe('2027-02-28')
  })
  it('latestClosedCycle uses this month once the statement date has passed', () => {
    expect(latestClosedCycle(card(10, 1), '2026-11-10').statementDate).toBe('2026-11-10')
    expect(latestClosedCycle(card(10, 1), '2026-11-09').statementDate).toBe('2026-10-10')
    expect(latestClosedCycle(card(10, 1), '2026-01-05').statementDate).toBe('2025-12-10')
  })
  it('nextCycle is one month later', () => {
    expect(nextCycle(card(31, 20), cycleFor(card(31, 20), 2027, 0)).statementDate).toBe('2027-02-28')
  })
  it('addedOn is the local date of createdAt', () => {
    expect(addedOn({ createdAt: new Date(2026, 10, 3, 23, 30).toISOString() })).toBe('2026-11-03')
    expect(addedOn({})).toBe(null)
  })
  it('statementsFor lists live statements newest first', () => {
    const rows = [
      { id: 'a', cardId: 'c1', statementDate: '2026-10-10' },
      { id: 'b', cardId: 'c1', statementDate: '2026-11-10' },
      { id: 'c', cardId: 'c1', statementDate: '2026-12-10', deletedAt: 'x' },
      { id: 'd', cardId: 'c2', statementDate: '2026-11-10' },
    ]
    expect(statementsFor('c1', rows).map((s) => s.id)).toEqual(['b', 'a'])
  })
})

describe('installments', () => {
  it('installment progress counts statement months and caps at months', () => {
    const plan = { firstStatementDate: '2026-09-10', months: 12, monthlyAmount: 499900 }
    expect(installmentProgress(plan, card(10, 1), '2026-11-26')).toEqual({ paid: 3, months: 12, left: 9 * 499900, done: false })
    expect(installmentProgress({ ...plan, months: 2 }, card(10, 1), '2026-11-26')).toEqual({ paid: 2, months: 2, left: 0, done: true })
    expect(installmentProgress({ ...plan, firstStatementDate: '2026-12-10' }, card(10, 1), '2026-11-26').paid).toBe(0)
  })
  it('anchor is the latest entered statement, not the closed cycle', () => {
    const c = card(10, 1)
    const anchor = installmentAnchor(c, [{ id: 's', cardId: 'c1', statementDate: '2026-10-10' }], '2026-11-26')
    expect(anchor).toEqual({ date: '2026-10-10', label: 'Oct' })
    const first = firstStatementFromPaid(c, anchor.date, 2)
    expect(first).toBe('2026-09-10')
    expect(installmentProgress({ firstStatementDate: first, months: 12, monthlyAmount: 100 }, c, '2026-11-26').paid).toBe(3)
  })
  it('anchor falls back to the latest closed cycle with no statements', () => {
    expect(installmentAnchor(card(10, 1), [], '2026-11-26')).toEqual({ date: '2026-11-10', label: 'Nov' })
  })
  it('already paid 0 starts on the next statement after the anchor', () => {
    expect(firstStatementFromPaid(card(10, 1), '2026-11-10', 0)).toBe('2026-12-10')
  })

  it('anchor never uses a statement older than the cycle before the closed one', () => {
    const c = card(10, 1)
    expect(installmentAnchor(c, [{ id: 's', cardId: 'c1', statementDate: '2026-06-10' }], '2026-11-26')).toEqual({ date: '2026-11-10', label: 'Nov' })
  })
})
