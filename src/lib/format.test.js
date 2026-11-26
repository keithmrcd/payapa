import { describe, it, expect } from 'vitest'
import { scheduleLabel, remindersLabel, timeLabel, syncLabel } from './format'

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

describe('timeLabel', () => {
  it('shows a 24-hour time as 12-hour', () => {
    expect(timeLabel('09:00')).toBe('9:00 AM')
    expect(timeLabel('00:30')).toBe('12:30 AM')
    expect(timeLabel('12:00')).toBe('12:00 PM')
    expect(timeLabel('19:30')).toBe('7:30 PM')
  })
})

describe('syncLabel', () => {
  const now = new Date('2026-11-26T10:00:00.000Z')
  it('says when it last synced', () => {
    expect(syncLabel('ok', '2026-11-26T09:59:40.000Z', now)).toBe('Synced just now')
    expect(syncLabel('ok', '2026-11-26T09:58:00.000Z', now)).toBe('Synced 2 min ago')
    expect(syncLabel('ok', '2026-11-26T07:00:00.000Z', now)).toBe('Synced 3 hr ago')
    expect(syncLabel('ok', '2026-11-24T10:00:00.000Z', now)).toBe('Synced 2 days ago')
  })
  it('names every other state in plain words', () => {
    expect(syncLabel('syncing')).toBe('Syncing…')
    expect(syncLabel('idle')).toBe('Waiting to sync')
    expect(syncLabel('offline')).toBe('Offline, will sync later')
    expect(syncLabel('auth')).toBe('Sign in again to keep backing up')
    expect(syncLabel('error')).toBe('Couldn’t sync. Will try again.')
    expect(syncLabel('off')).toBe('Off')
    expect(syncLabel('unavailable')).toBe('Not available in this build')
  })
})
