import { describe, it, expect } from 'vitest'
import { buildOccurrences, paydaySummary } from './occurrences'
import { paydayFor } from './payday'

// Today Nov 26: the current payday is Nov 15 (covers Nov 15–29); Oct 30 covered Oct 30–Nov 14.
const today = '2026-11-26'
const current = paydayFor(today)
const next = paydayFor('2026-11-30')
const item = (id, dueDay, amount, startDate = '2026-11-01') => ({
  id, name: id, kind: 'bill', category: 'electricity', accountId: 'a1', paydayBucket: 'auto', startDate, archivedAt: null,
  schedule: [{ effectiveFrom: startDate, recurrence: 'monthly', dueDay, amount, variable: false }],
})
const card = (over = {}) => ({ id: 'c1', name: 'BDO Visa', type: 'credit_card', accountId: 'a1', statementDay: 2, dueDay: 27, createdAt: '2026-01-01T00:00:00Z', ...over })
const stmt = (id, statementDate, dueDate, statementBalance, minimumDue = 0) => ({ id, cardId: 'c1', statementDate, dueDate, statementBalance, minimumDue })
const pay = (ref, amount) => ({ id: `p-${ref}-${amount}`, ref, amount, paidOn: today, accountId: 'a1' })
const occ = (o) => buildOccurrences({ items: [], cards: [], cardStatements: [], payments: [], ...o }, today)

describe('paydaySummary', () => {
  it('lists only its own payday without carry', () => {
    const s = paydaySummary(occ({ items: [item('meralco', 10, 210000), item('pldt', 20, 169900)] }), current)
    expect(s.own.map((o) => o.name)).toEqual(['pldt'])
    expect(s.earlier).toEqual([])
    expect(s.due).toBe(169900)
  })

  it('carries an unpaid bill from an earlier payday into the current one', () => {
    const s = paydaySummary(occ({ items: [item('meralco', 10, 210000), item('pldt', 20, 169900)] }), current, { carry: true })
    expect(s.earlier.map((o) => o.due)).toEqual(['2026-11-10'])
    expect(s.carried).toBe(210000)
    expect(s.due).toBe(379900)
    expect(s.left).toBe(379900)
  })

  it('does not carry a paid bill', () => {
    const o = occ({ items: [item('meralco', 10, 210000)], payments: [pay('item:meralco:2026-11-10', 210000)] })
    expect(paydaySummary(o, current, { carry: true }).earlier).toEqual([])
  })

  it('counts a partly paid carried bill by what is left', () => {
    const o = occ({ items: [item('meralco', 10, 210000)], payments: [pay('item:meralco:2026-11-10', 10000)] })
    const s = paydaySummary(o, current, { carry: true })
    expect(s.carried).toBe(200000)
    expect(s.paid).toBe(10000)
    expect(s.left).toBe(200000)
  })

  it('carries oldest first', () => {
    const s = paydaySummary(occ({ items: [item('meralco', 10, 210000, '2026-10-01')] }), current, { carry: true })
    expect(s.earlier.map((o) => o.due)).toEqual(['2026-10-10', '2026-11-10'])
  })

  it('never carries into the next payday', () => {
    const s = paydaySummary(occ({ items: [item('meralco', 10, 210000)] }), next)
    expect(s.earlier).toEqual([])
  })

  it('carries the latest card statement while it is below the minimum', () => {
    const cardStatements = [stmt('s1', '2026-10-02', '2026-10-27', 1000000, 50000)]
    const s = paydaySummary(occ({ cards: [card()], cardStatements, payments: [pay('card:c1:2026-10-27', 20000)] }), current, { carry: true })
    expect(s.earlier.filter((o) => !o.needsStatement).map((o) => o.ref)).toEqual(['card:c1:2026-10-27'])
  })

  it('does not carry a minimum-paid statement', () => {
    const cardStatements = [stmt('s1', '2026-10-02', '2026-10-27', 1000000, 50000), stmt('s2', '2026-11-02', '2026-11-27', 0)]
    const s = paydaySummary(occ({ cards: [card()], cardStatements: cardStatements.slice(0, 1), payments: [pay('card:c1:2026-10-27', 50000)] }), current, { carry: true })
    expect(s.earlier.filter((o) => !o.needsStatement)).toEqual([])
  })

  it('does not carry a statement once a newer one is entered (its balance rolls into the new SOA)', () => {
    const cardStatements = [stmt('s1', '2026-10-02', '2026-10-27', 1000000, 50000), stmt('s2', '2026-11-02', '2026-11-27', 1200000, 60000)]
    const s = paydaySummary(occ({ cards: [card()], cardStatements }), current, { carry: true })
    expect(s.earlier).toEqual([])
    expect(s.own.map((o) => o.ref)).toEqual(['card:c1:2026-11-27'])
  })

  it('counts statements not entered yet, in its own payday and carried', () => {
    const s = paydaySummary(occ({ cards: [card()] }), current, { carry: true })
    expect(s.own.filter((o) => o.needsStatement)).toHaveLength(1)
    expect(s.missing).toBe(1)
    expect(s.due).toBe(0)
  })
})

describe('card payday setting', () => {
  it('a card set to the 30th payday lands there, statement and missing rows alike', () => {
    // Due Nov 27 would be the 15th payday; forced to the 30th it's the Oct 30 payday (latest 30th on or before the due date).
    const o = occ({ cards: [card({ paydayBucket: '30' })], cardStatements: [stmt('s1', '2026-10-02', '2026-10-27', 100000)] })
    expect(o.find((x) => x.statementId === 's1').payday).toBe('2026-09-30')
    expect(o.find((x) => x.needsStatement).payday).toBe('2026-10-30')
  })
  it('a card with no setting is automatic', () => {
    expect(occ({ cards: [card()] }).find((x) => x.needsStatement).payday).toBe('2026-11-15')
  })
})
