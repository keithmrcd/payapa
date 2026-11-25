import { describe, it, expect } from 'vitest'
import { paydayFor, nextPaydayAfter, paydayForDue } from './payday'

describe('paydayFor', () => {
  it('buckets due dates', () => {
    expect(paydayFor('2026-12-20')).toMatchObject({ bucket: '15', date: '2026-12-15' })
    expect(paydayFor('2026-12-10')).toMatchObject({ bucket: '30', date: '2026-11-30' })
    expect(paydayFor('2026-12-30')).toMatchObject({ bucket: '30', date: '2026-12-30' })
    expect(paydayFor('2027-02-28')).toMatchObject({ bucket: '30', date: '2027-02-28' })
    expect(paydayFor('2027-03-01')).toMatchObject({ bucket: '30', date: '2027-02-28' })
  })
})

describe('nextPaydayAfter', () => {
  it('moves to the following period', () => {
    expect(nextPaydayAfter(paydayFor('2026-12-20'))).toMatchObject({ bucket: '30', date: '2026-12-30' })
  })
})

describe('paydayForDue', () => {
  it('overrides to the latest payday of that bucket on or before the due date', () => {
    expect(paydayForDue('2026-12-10', '15').date).toBe('2026-11-15')
    expect(paydayForDue('2026-12-20', '30').date).toBe('2026-11-30')
    expect(paydayForDue('2026-12-20', '15').date).toBe('2026-12-15')
    expect(paydayForDue('2026-12-03', '15').date).toBe('2026-11-15')
  })
  it('auto equals paydayFor', () => {
    expect(paydayForDue('2026-12-10', 'auto')).toEqual(paydayFor('2026-12-10'))
  })
})
