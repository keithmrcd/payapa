import { describe, it, expect } from 'vitest'
import { buildReminders, reminderId } from './reminders'
import { buildOccurrences } from './occurrences'

const today = '2026-11-26'
const now = '2026-11-26T10:00' // after 9:00, so today's 9:00 reminders are already past
const prefs = { time: '09:00', statements: true, payday: true }
const item = (over = {}) => ({
  id: 'meralco', name: 'Meralco', kind: 'bill', category: 'electricity', accountId: 'a1', paydayBucket: 'auto',
  startDate: '2026-11-30', archivedAt: null, reminderOffsets: [3, 1, 0],
  schedule: [{ effectiveFrom: '2026-11-30', recurrence: 'monthly', dueDay: 30, amount: 210000, variable: false }],
  ...over,
})
const card = (over = {}) => ({ id: 'c1', name: 'BDO Visa', type: 'credit_card', statementDay: 2, dueDay: 27, createdAt: '2026-01-01T00:00:00Z', archivedAt: null, ...over })
const stmt = (statementDate, dueDate, statementBalance, minimumDue) => ({ id: `s-${statementDate}`, cardId: 'c1', statementDate, dueDate, statementBalance, minimumDue })
function build(state = {}, p = {}) {
  const s = { items: [], cards: [], cardStatements: [], payments: [], ...state }
  return buildReminders({ ...s, occurrences: buildOccurrences(s, today) }, today, now, { ...prefs, ...p })
}
const due = (list) => list.filter((r) => r.kind === 'due')

describe('due reminders', () => {
  it('3 days, 1 day and on the day, at the reminder time', () => {
    const r = due(build({ items: [item()] })).filter((x) => x.at < '2026-12-01')
    expect(r.map((x) => [x.at, x.title])).toEqual([
      ['2026-11-27T09:00', 'Meralco is due in 3 days'],
      ['2026-11-29T09:00', 'Meralco is due tomorrow'],
      ['2026-11-30T09:00', 'Meralco is due today'],
    ])
    expect(r[0].body).toBe('₱2,100.00 · Mon, Nov 30')
    expect(r[0].route).toBe('/items/meralco')
  })
  it('follows the item offsets, and none when reminders are off', () => {
    expect(due(build({ items: [item({ reminderOffsets: [0] })] })).filter((x) => x.at < '2026-12-01')).toHaveLength(1)
    expect(due(build({ items: [item({ reminderOffsets: [] })] }))).toEqual([])
  })
  it('skips times already past', () => {
    const r = due(build({ items: [item({ startDate: '2026-11-29', schedule: [{ effectiveFrom: '2026-11-29', recurrence: 'monthly', dueDay: 29, amount: 100, variable: false }] })] }))
    expect(r[0].at).toBe('2026-11-28T09:00') // 3 days before (Nov 26 09:00) is past
  })
  it('paid occurrences get no reminders', () => {
    const payments = [{ id: 'p', ref: 'item:meralco:2026-11-30', amount: 210000, paidOn: today, accountId: 'a1' }]
    expect(due(build({ items: [item()], payments })).filter((x) => x.at < '2026-12-01')).toEqual([])
  })
  it('a variable bill says About', () => {
    const it2 = item({ schedule: [{ effectiveFrom: '2026-11-30', recurrence: 'monthly', dueDay: 30, amount: 210000, variable: true }] })
    expect(due(build({ items: [it2] }))[0].body).toBe('About ₱2,100.00 · Mon, Nov 30')
  })
  it('a card shows what is left and the minimum until it is met', () => {
    const cardStatements = [stmt('2026-12-02', '2026-12-27', 1842000, 150000)]
    const r = due(build({ cards: [card()], cardStatements }))
    expect(r[0].title).toBe('BDO Visa is due in 3 days')
    expect(r[0].body).toBe('₱18,420.00 · Minimum ₱1,500.00 · Sun, Dec 27')
    expect(r[0].route).toBe('/cards/c1')
    const paidMin = due(build({ cards: [card()], cardStatements, payments: [{ id: 'p', ref: 'card:c1:2026-12-27', amount: 150000, paidOn: today, accountId: 'a1' }] }))
    expect(paidMin[0].body).toBe('₱16,920.00 · Sun, Dec 27')
  })
  it('cards use their own offsets, default 3, 1, on the day', () => {
    const cardStatements = [stmt('2026-12-02', '2026-12-27', 100000, 0)]
    expect(due(build({ cards: [card()], cardStatements }))).toHaveLength(3)
    expect(due(build({ cards: [card({ reminderOffsets: [1] })], cardStatements }))).toHaveLength(1)
  })
  it('statement-not-entered rows get no due reminder', () => {
    expect(due(build({ cards: [card()] }))).toEqual([])
  })
})

describe('statement reminders', () => {
  it('on each coming statement date not yet entered', () => {
    const r = build({ cards: [card()] }).filter((x) => x.kind === 'statement')
    expect(r.map((x) => x.at)).toEqual(['2026-12-02T09:00', '2027-01-02T09:00'])
    expect(r[0].title).toBe('BDO Visa statement is out')
    expect(r[0].body).toBe('Enter it from your SOA to see what’s due.')
    expect(r[0].route).toBe('/cards/c1')
  })
  it('skips a month already entered, and can be turned off', () => {
    const cardStatements = [stmt('2026-12-02', '2026-12-27', 100000, 0)]
    expect(build({ cards: [card()], cardStatements }).filter((x) => x.kind === 'statement').map((x) => x.at)).toEqual(['2027-01-02T09:00'])
    expect(build({ cards: [card()] }, { statements: false }).filter((x) => x.kind === 'statement')).toEqual([])
  })
  it('archived cards get nothing', () => {
    expect(build({ cards: [card({ archivedAt: 'x' })] })).toEqual([])
  })
})

describe('payday reminders', () => {
  it('each payday with something left, saying how much', () => {
    const r = build({ items: [item()] }).filter((x) => x.kind === 'payday')
    expect(r[0]).toMatchObject({ at: '2026-11-30T09:00', title: 'Payday today', body: '₱2,100.00 to pay from this salary.', route: '/payday' })
    expect(r.every((x) => x.body.startsWith('₱2,100.00'))).toBe(true) // Dec 30 covers the Dec 30 bill; Dec 15 has nothing and is skipped
    expect(r.map((x) => x.at)).toEqual(['2026-11-30T09:00', '2026-12-30T09:00'])
  })
  it('can be turned off', () => {
    expect(build({ items: [item()] }, { payday: false }).filter((x) => x.kind === 'payday')).toEqual([])
  })
})

describe('the list', () => {
  it('stays within 60 days, sorted, capped, with stable unique ids', () => {
    const list = build({ items: [item(), item({ id: 'pldt', name: 'PLDT' })], cards: [card()] })
    expect(list.every((r) => r.at > now && r.at < '2027-01-26')).toBe(true)
    expect([...list].sort((a, b) => (a.at < b.at ? -1 : 1))).toEqual(list)
    expect(new Set(list.map((r) => r.id)).size).toBe(list.length)
    expect(build({ items: [item()] }, { max: 2 })).toHaveLength(2)
    expect(reminderId('due:item:meralco:2026-11-30:3')).toBe(reminderId('due:item:meralco:2026-11-30:3'))
    expect(reminderId('x')).toBeGreaterThan(0)
    expect(reminderId('x')).toBeLessThan(2 ** 31)
  })
  it('uses the reminder time', () => {
    expect(due(build({ items: [item()] }, { time: '19:30' }))[0].at).toBe('2026-11-27T19:30')
  })
})
