import { describe, it, expect } from 'vitest'
import { iso, toDate, todayIso, daysBetween, addDays, addMonths } from './dates'

describe('iso', () => {
  it('clamps to month end', () => {
    expect(iso(2026, 1, 31)).toBe('2026-02-28')
    expect(iso(2028, 1, 30)).toBe('2028-02-29')
    expect(iso(2026, 12, 5)).toBe('2027-01-05')
  })
})

describe('addMonths', () => {
  it('clamps to the month end and restores the day', () => {
    expect(addMonths('2026-01-31', 1, 31)).toBe('2026-02-28')
    expect(addMonths('2026-02-28', 1, 31)).toBe('2026-03-31')
  })
  it('handles negative offsets and year rollover', () => {
    expect(addMonths('2026-01-15', -1, 15)).toBe('2025-12-15')
    expect(addMonths('2026-11-15', 3, 15)).toBe('2027-02-15')
  })
})

describe('toDate / todayIso / daysBetween / addDays', () => {
  it('round-trips local dates', () => {
    const d = toDate('2026-03-09')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 9])
    expect(todayIso(new Date(2026, 2, 9, 23, 59))).toBe('2026-03-09')
  })
  it('counts days across month ends', () => {
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3)
    expect(daysBetween('2026-03-02', '2026-02-27')).toBe(-3)
  })
  it('adds days across boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
