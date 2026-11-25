import { describe, it, expect } from 'vitest'
import { dueDates, loanEndDate, loanProgress, withScheduleEdit, currentVersion } from './recurrence'

const make = (over = {}, ver = {}) => ({
  id: 'i1', name: 'Bill', kind: 'bill', startDate: '2026-01-01', totalPayments: null, paidBefore: 0,
  schedule: [{ effectiveFrom: over.startDate ?? '2026-01-01', recurrence: 'monthly', dueDay: 1, dueMonth: null, interval: 1, amount: 100000, variable: false, ...ver }],
  ...over,
})
const dates = (item, to) => dueDates(item, to).map((d) => d.due)

describe('dueDates', () => {
  it('monthly clamps day 31', () => {
    const item = make({ startDate: '2026-01-31' }, { dueDay: 31 })
    expect(dates(item, '2026-04-30')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })
  it('yearly Feb 29', () => {
    const item = make({ startDate: '2028-02-29' }, { recurrence: 'yearly', dueMonth: 1, dueDay: 29 })
    expect(dates(item, '2030-03-01')).toEqual(['2028-02-29', '2029-02-28', '2030-02-28'])
  })
  it('every 2 weeks', () => {
    const item = make({ startDate: '2026-11-02' }, { recurrence: 'weekly', interval: 2 })
    expect(dates(item, '2026-12-01')).toEqual(['2026-11-02', '2026-11-16', '2026-11-30'])
  })
  it('once', () => {
    const item = make({ startDate: '2026-12-05' }, { recurrence: 'once' })
    expect(dates(item, '2027-06-01')).toEqual(['2026-12-05'])
    expect(dates(item, '2026-12-05')).toEqual(['2026-12-05'])
    expect(dates(item, '2026-12-04')).toEqual([])
  })
  it('nothing before startDate', () => {
    const item = make({ startDate: '2026-11-25' }, { dueDay: 10 })
    expect(dates(item, '2027-01-31')[0]).toBe('2026-12-10')
  })
  it('edit applies from the next unpaid occurrence', () => {
    const item = make({ startDate: '2026-09-20' }, { dueDay: 20 })
    const edited = withScheduleEdit(item, { dueDay: 22, amount: 120000 }, '2026-11-20')
    expect(dueDates(edited, '2026-12-31').map(({ due, amount }) => ({ due, amount }))).toEqual([
      { due: '2026-09-20', amount: 100000 },
      { due: '2026-10-20', amount: 100000 },
      { due: '2026-11-22', amount: 120000 },
      { due: '2026-12-22', amount: 120000 },
    ])
    expect(item.schedule.length).toBe(1)
  })
  it('name-only edit adds no version', () => {
    const item = make({ startDate: '2026-09-20' }, { dueDay: 20 })
    const edited = withScheduleEdit(item, { name: 'X' }, '2026-11-20')
    expect(edited.schedule.length).toBe(1)
    expect(edited.name).toBe('X')
  })
  it('a new monthly version starts in the same month as effectiveFrom', () => {
    const item = make({ startDate: '2026-09-20' }, { dueDay: 20 })
    const edited = withScheduleEdit(item, { dueDay: 10 }, '2026-11-20')
    expect(dates(edited, '2027-01-31')).toEqual(['2026-09-20', '2026-10-20', '2026-11-10', '2026-12-10', '2027-01-10'])
  })
  it('a new yearly version starts in the same year as effectiveFrom', () => {
    const item = make({ startDate: '2026-03-05' }, { recurrence: 'yearly', dueMonth: 2, dueDay: 5 })
    const edited = withScheduleEdit(item, { dueMonth: 1, dueDay: 20 }, '2027-03-05')
    expect(dates(edited, '2028-12-31')).toEqual(['2026-03-05', '2027-02-20', '2028-02-20'])
  })
  it('a second edit with the same effectiveFrom replaces the version', () => {
    const item = make({ startDate: '2026-09-20' }, { dueDay: 20 })
    const a = withScheduleEdit(item, { amount: 120000 }, '2026-11-20')
    const b = withScheduleEdit(a, { amount: 130000 }, '2026-11-20')
    expect(b.schedule.length).toBe(2)
    expect(b.schedule[1].amount).toBe(130000)
  })
})

describe('loans', () => {
  it('loan end', () => {
    const item = make({ startDate: '2026-12-10', totalPayments: 24, paidBefore: 9 }, { dueDay: 10 })
    expect(loanEndDate(item)).toBe('2028-02-10')
    expect(dueDates(item, '2030-01-01').length).toBe(15)
    expect(loanProgress(item, 2)).toEqual({ paid: 11, total: 24 })
  })
  it('loan with all payments made has no occurrences', () => {
    const item = make({ startDate: '2026-12-10', totalPayments: 12, paidBefore: 12 }, { dueDay: 10 })
    expect(dueDates(item, '2030-01-01')).toEqual([])
    expect(loanProgress(item, 0)).toEqual({ paid: 12, total: 12 })
    expect(loanEndDate(item)).toBeNull()
  })
  it('a 360-payment weekly loan ends where expected', () => {
    const item = make({ startDate: '2026-01-05', totalPayments: 360, paidBefore: 0 }, { recurrence: 'weekly', interval: 1 })
    expect(loanEndDate(item)).toBe('2032-11-22')
  })
  it('loanProgress is null for non-loans', () => {
    expect(loanProgress(make(), 1)).toBeNull()
  })
  it('non-loans have no end date', () => {
    expect(loanEndDate(make())).toBeNull()
  })
})

describe('currentVersion', () => {
  const item = { schedule: [{ effectiveFrom: '2026-01-01', amount: 1 }, { effectiveFrom: '2026-12-01', amount: 2 }] }
  it('picks the last version in force', () => {
    expect(currentVersion(item, '2026-11-25').amount).toBe(1)
    expect(currentVersion(item, '2026-12-01').amount).toBe(2)
  })
  it('falls back to the first for an item that starts later', () => {
    expect(currentVersion(item, '2025-01-01').amount).toBe(1)
  })
})

describe('withScheduleEdit edge cases', () => {
  it('first: edits schedule[0] in place and moves startDate within its month', () => {
    const item = make({ startDate: '2026-11-20' }, { dueDay: 20 })
    const edited = withScheduleEdit(item, { dueDay: 10 }, '2026-11-20', { first: true })
    expect(edited.startDate).toBe('2026-11-10')
    expect(edited.schedule).toEqual([{ ...item.schedule[0], dueDay: 10, effectiveFrom: '2026-11-10' }])
    expect(dates(edited, '2027-01-31')).toEqual(['2026-11-10', '2026-12-10', '2027-01-10'])
  })
  it('first: a yearly item moves within its year, weekly and once keep the date', () => {
    const y = make({ startDate: '2027-03-05' }, { recurrence: 'yearly', dueMonth: 2, dueDay: 5 })
    expect(withScheduleEdit(y, { dueMonth: 1, dueDay: 20 }, '2027-03-05', { first: true }).startDate).toBe('2027-02-20')
    const w = make({ startDate: '2026-11-02' }, { recurrence: 'weekly', interval: 1 })
    expect(withScheduleEdit(w, { interval: 2 }, '2026-11-02', { first: true }).startDate).toBe('2026-11-02')
    const o = make({ startDate: '2026-12-05' }, { recurrence: 'once' })
    const oe = withScheduleEdit(o, { amount: 5 }, '2026-12-05', { first: true })
    expect([oe.startDate, oe.schedule.length, oe.schedule[0].amount]).toEqual(['2026-12-05', 1, 5])
  })
  it('first: an off-cycle startDate never moves before the first occurrence', () => {
    const m = make({ startDate: '2026-11-25' }, { dueDay: 5 })
    const me = withScheduleEdit(m, { amount: 5 }, '2026-12-05', { first: true })
    expect(me.startDate).toBe('2026-12-05')
    expect(dates(me, '2027-01-31')).toEqual(['2026-12-05', '2027-01-05'])
    const y = make({ startDate: '2026-11-25' }, { recurrence: 'yearly', dueMonth: 2, dueDay: 5 })
    const ye = withScheduleEdit(y, { amount: 5 }, '2027-03-05', { first: true })
    expect(ye.startDate).toBe('2027-03-05')
    expect(dates(ye, '2028-12-31')).toEqual(['2027-03-05', '2028-03-05'])
  })
  it('first: collapses later versions into the one edited version', () => {
    const item = make({ startDate: '2026-11-20' }, { dueDay: 20 })
    const two = withScheduleEdit(item, { amount: 120000 }, '2026-12-20')
    const one = withScheduleEdit(two, { amount: 130000 }, '2026-11-20', { first: true })
    expect(one.schedule).toEqual([{ ...item.schedule[0], amount: 130000, effectiveFrom: '2026-11-20' }])
  })
  it('null base merges into the last version without a new date', () => {
    const item = make({ startDate: '2026-11-10' }, { recurrence: 'once', amount: 150000 })
    const edited = withScheduleEdit(item, { amount: 155000 }, null)
    expect(edited.schedule).toEqual([{ ...item.schedule[0], amount: 155000 }])
    expect(dueDates(edited, '2027-12-31')).toEqual([{ due: '2026-11-10', amount: 155000, variable: false }])
  })
})

describe('dueDates guard', () => {
  it('throws instead of looping when a non-loan has no end date', () => {
    expect(() => dueDates(make(), null)).toThrow()
    expect(() => dueDates(make(), undefined)).toThrow()
  })
})
