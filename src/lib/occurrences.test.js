import { describe, it, expect } from 'vitest'
import { buildOccurrences, homeGroups, currentStatement, groupTotal } from './occurrences'

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

  const o = (due, status = 'unpaid') => ({ due, status })

  it('buckets unpaid by days left', () => {
    const g = homeGroups(['2026-11-25', '2026-12-02', '2026-12-03', '2026-12-16', '2026-12-17'].map((d) => o(d)), today)
    expect(g.overdue).toEqual([])
    expect(g.week.map((x) => x.due)).toEqual(['2026-11-25', '2026-12-02'])
    expect(g.later.map((x) => x.due)).toEqual(['2026-12-03', '2026-12-16'])
  })

  it('a paid overdue occurrence is not overdue', () => {
    const g = homeGroups([o('2026-11-10', 'paid'), o('2026-11-11')], today)
    expect(g.overdue.map((x) => x.due)).toEqual(['2026-11-11'])
  })

  it('paid holds only this month', () => {
    const g = homeGroups([o('2026-10-20', 'paid'), o('2026-11-05', 'paid'), o('2026-11-30')], today)
    expect(g.paid.map((x) => x.due)).toEqual(['2026-11-05'])
  })
})

describe('buildOccurrences extras', () => {
  it('loan yields remaining payments only', () => {
    const loan = monthly({ totalPayments: 3, paidBefore: 1 })
    expect(build({ items: [loan] }).map((x) => x.due)).toEqual(['2026-11-20', '2026-12-20'])
  })

  it('every live statement is an occurrence; an older unpaid one goes overdue', () => {
    const cards = [{ id: 'c1', name: 'BPI', type: 'credit', accountId: 'a1' }]
    const st = (id, dueDate, extra = {}) => ({ id, cardId: 'c1', statementDate: '2026-01-01', dueDate, statementBalance: 100, minimumDue: 10, ...extra })
    const cardStatements = [st('s1', '2026-11-27'), st('s2', '2026-12-27'), st('s3', '2027-01-27', { deletedAt: 'x' })]
    const occs = buildOccurrences({ items: [], cards, cardStatements, payments: [] }, '2026-12-01').filter((x) => x.type === 'card')
    expect(occs.map((x) => x.ref)).toEqual(['card:c1:2026-11-27', 'card:c1:2026-12-27'])
    expect(occs[0].overdue).toBe(true)
    expect(occs[0].statementId).toBe('s1')
  })
})

describe('needs-statement rows', () => {
  const visa = (extra = {}) => ({ id: 'c1', name: 'BDO Visa', type: 'credit_card', accountId: 'a1', statementDay: 2, dueDay: 27, createdAt: new Date(2026, 9, 1).toISOString(), ...extra })
  const at = (day, o) => buildOccurrences({ items: [], cards: [], cardStatements: [], payments: [], ...o }, day).filter((x) => x.type === 'card')
  const stmt = (statementDate, dueDate, extra = {}) => ({ id: 's' + statementDate, cardId: 'c1', statementDate, dueDate, statementBalance: 500000, minimumDue: 50000, ...extra })

  it('needs-statement row after the statement date passes', () => {
    const [o] = at('2026-12-03', { cards: [visa()] })
    expect(o).toMatchObject({ needsStatement: true, due: '2026-12-27', statementDate: '2026-12-02', status: 'statement', amount: 0, left: 0, overdue: false })
    expect(o.ref).toBe('card:c1:2026-12-27:statement')
  })
  it('no needs-statement row once that cycle is entered', () => {
    const occs = at('2026-12-03', { cards: [visa()], cardStatements: [stmt('2026-12-02', '2026-12-27')] })
    expect(occs.map((x) => !!x.needsStatement)).toEqual([false])
  })
  it('a deleted statement does not count as entered', () => {
    const occs = at('2026-12-03', { cards: [visa()], cardStatements: [stmt('2026-12-02', '2026-12-27', { deletedAt: 'x' })] })
    expect(occs.map((x) => !!x.needsStatement)).toEqual([true])
  })
  it('goes overdue after its due date', () => {
    const card = visa({ statementDay: 20, dueDay: 5 })
    const [o] = at('2027-01-10', { cards: [card] })
    expect(o).toMatchObject({ needsStatement: true, due: '2027-01-05', overdue: true })
  })
  it('no needs-statement row for a cycle due before the card was added', () => {
    const card = (d) => visa({ dueDay: 20, createdAt: new Date(2026, 11, d, 9).toISOString() })
    expect(at('2026-12-22', { cards: [card(21)] })).toEqual([])
    expect(at('2026-12-22', { cards: [card(10)] })).toHaveLength(1)
  })
  it('archived cards and cards without days get no row', () => {
    expect(at('2026-12-03', { cards: [visa({ archivedAt: 'x' })] })).toEqual([])
    expect(at('2026-12-03', { cards: [visa({ statementDay: null })] })).toEqual([])
  })
  it('a needs-statement row counts nothing and is never paid', () => {
    const g = homeGroups(buildOccurrences({ items: [], cards: [visa()], cardStatements: [], payments: [] }, '2026-12-22'), '2026-12-22')
    expect(g.paid).toEqual([])
    expect(g.week.map((o) => o.needsStatement)).toEqual([true])
  })
  it('currentStatement prefers the earliest unpaid, then needs-statement, then latest', () => {
    const pay = (ref, amount) => ({ id: ref, ref, amount, paidOn: '2026-11-01' })
    const nov = stmt('2026-11-02', '2026-11-27'), oct = stmt('2026-10-02', '2026-10-27')
    const occ = (payments, statements = [oct, nov]) => buildOccurrences({ items: [], cards: [visa()], cardStatements: statements, payments }, '2026-12-03')
    expect(currentStatement(occ([]), 'c1').due).toBe('2026-10-27')
    const allPaid = [pay('card:c1:2026-10-27', 500000), pay('card:c1:2026-11-27', 500000)]
    expect(currentStatement(occ(allPaid), 'c1').needsStatement).toBe(true)
    const decEntered = [oct, nov, stmt('2026-12-02', '2026-12-27')]
    const paidAll3 = [...allPaid, pay('card:c1:2026-12-27', 500000)]
    expect(currentStatement(occ(paidAll3, decEntered), 'c1').due).toBe('2026-12-27')
    expect(currentStatement(occ([]), 'zz')).toBe(undefined)
  })
})

describe('groupTotal', () => {
  it('is empty for a group of only statements not entered yet', () => {
    expect(groupTotal([{ needsStatement: true, left: 0 }])).toBe(null)
    expect(groupTotal([{ needsStatement: true, left: 0 }, { left: 500 }])).toBe(500)
    expect(groupTotal([])).toBe(null)
  })
})
