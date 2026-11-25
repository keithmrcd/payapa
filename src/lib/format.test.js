import { describe, it, expect } from 'vitest'
import { scheduleLabel, remindersLabel } from './format'

const v = (over) => ({ recurrence: 'monthly', dueDay: 20, dueMonth: null, interval: 1, effectiveFrom: '2026-01-20', ...over })

describe('scheduleLabel', () => {
  it('monthly', () => expect(scheduleLabel(v())).toBe('monthly on the 20th'))
  it('yearly', () => expect(scheduleLabel(v({ recurrence: 'yearly', dueMonth: 2, dueDay: 5 }))).toBe('yearly on Mar 5'))
  it('weekly', () => {
    expect(scheduleLabel(v({ recurrence: 'weekly', interval: 2 }))).toBe('every 2 weeks')
    expect(scheduleLabel(v({ recurrence: 'weekly', interval: 1 }))).toBe('every week')
  })
  it('once', () => expect(scheduleLabel(v({ recurrence: 'once', effectiveFrom: '2026-12-05' }))).toBe('once on Dec 5'))
})

describe('remindersLabel', () => {
  it('formats offsets', () => {
    expect(remindersLabel([3, 1, 0])).toBe('3 days, 1 day, on the day')
    expect(remindersLabel([1, 0])).toBe('1 day, on the day')
    expect(remindersLabel([0])).toBe('On the day')
    expect(remindersLabel([])).toBe('Off')
    expect(remindersLabel(undefined)).toBe('Off')
    expect(remindersLabel([2, 0])).toBe('2 days, on the day')
  })
})
