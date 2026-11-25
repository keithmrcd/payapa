import { describe, it, expect } from 'vitest'
import { dueDates, loanEndDate, loanProgress, withScheduleEdit } from './recurrence'

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
