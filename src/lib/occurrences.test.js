import { describe, it, expect } from 'vitest'
import { buildOccurrences, homeGroups } from './occurrences'

const today = '2026-11-25'
const monthly = (over = {}) => ({
  id: 'i1', name: 'Rent', kind: 'bill', category: 'rent', accountId: 'a1', paydayBucket: 'auto',
  startDate: '2026-11-20', archivedAt: null,
  schedule: [{ effectiveFrom: '2026-11-20', recurrence: 'monthly', dueDay: 20, amount: 500000, variable: false }],
  ...over,
})
const pay = (ref, amount) => ({ id: 'p' + ref + amount, ref, amount, paidOn: '2026-11-01', accountId: 'a1' })
const build = (o) => buildOccurrences({ items: [], cards: [], cardStatements: [], payments: [], ...o }, today)

describe('buildOccurrences', () => {
  it('items generate through two months out', () => {
    expect(build({ items: [monthly()] }).map((o) => o.due)).toEqual(['2026-11-20', '2026-12-20', '2027-01-20'])
  })

  it('archived items are skipped', () => {
    expect(build({ items: [monthly({ archivedAt: '2026-11-01T00:00:00Z' })] })).toEqual([])
  })

  it('variable bill settles on any payment', () => {
    const it = monthly({ schedule: [{ effectiveFrom: '2026-11-20', recurrence: 'monthly', dueDay: 20, amount: 341250, variable: true }] })
    const o = build({ items: [it], payments: [pay('item:i1:2026-11-20', 298870)] })[0]
    expect(o.status).toBe('paid')
    expect(o.amount).toBe(298870)
  })

  it('card without statement has no occurrence', () => {
    const cards = [{ id: 'c1', name: 'BPI', type: 'credit', accountId: 'a1' }]
    expect(build({ cards }).filter((o) => o.type === 'card')).toEqual([])
  })

  it('card with statement', () => {
    const cards = [{ id: 'c1', name: 'BPI', type: 'credit', accountId: 'a1', last4: '1234' }]
    const cardStatements = [{ id: 's1', cardId: 'c1', statementDate: '2026-12-02', dueDate: '2026-12-27', statementBalance: 1248000, minimumDue: 62400 }]
    const o = build({ cards, cardStatements, payments: [pay('card:c1:2026-12-27', 62400)] }).find((x) => x.type === 'card')
    expect(o.status).toBe('minimum')
    expect(o.ref).toBe('card:c1:2026-12-27')
    expect(o.amount).toBe(1248000)
    expect(o.minimum).toBe(62400)
  })

  it('ignores deleted payments', () => {
    const o = build({ items: [monthly()], payments: [{ ...pay('item:i1:2026-11-20', 500000), deletedAt: 'x' }] })[0]
    expect(o.status).toBe('unpaid')
  })

  it('override payday', () => {
    const it = monthly({ paydayBucket: '15', startDate: '2026-11-10', schedule: [{ effectiveFrom: '2026-11-10', recurrence: 'monthly', dueDay: 10, amount: 100, variable: false }] })
    expect(build({ items: [it] }).find((o) => o.due === '2026-12-10').payday).toBe('2026-11-15')
  })
})

describe('homeGroups', () => {
  it('overdue reaches back', () => {
    const it = monthly({ startDate: '2026-08-10', schedule: [{ effectiveFrom: '2026-08-10', recurrence: 'monthly', dueDay: 10, amount: 100, variable: false }] })
    const payments = ['2026-08-10', '2026-10-10', '2026-11-10'].map((d) => pay(`item:i1:${d}`, 100))
    const g = homeGroups(build({ items: [it], payments }), today)
    expect(g.overdue.map((o) => o.due)).toEqual(['2026-09-10'])
  })
})
