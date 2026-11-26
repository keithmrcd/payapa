import { describe, it, expect, vi } from 'vitest'
import { syncReminders, toNotification, nowStamp, permission, shouldAsk } from './notify'

const fakePlugin = (pending = [], display = 'granted') => ({
  getPending: vi.fn(async () => ({ notifications: pending })),
  cancel: vi.fn(async () => {}),
  schedule: vi.fn(async () => ({ notifications: [] })),
  checkPermissions: vi.fn(async () => ({ display })),
  requestPermissions: vi.fn(async () => ({ display: 'granted' })),
})
const r = { id: 7, kind: 'due', at: '2026-11-27T09:00', title: 'Meralco is due in 3 days', body: '₱2,100.00 · Mon, Nov 30', route: '/items/meralco' }

describe('notify', () => {
  it('maps a reminder to a local notification at local time', () => {
    const n = toNotification(r)
    expect(n).toMatchObject({ id: 7, title: r.title, body: r.body, smallIcon: 'ic_stat_payapa', extra: { route: '/items/meralco' } })
    expect(n.schedule.allowWhileIdle).toBe(true)
    expect(n.schedule.at.getTime()).toBe(new Date(2026, 10, 27, 9, 0).getTime())
  })

  it('nowStamp is local YYYY-MM-DDTHH:mm', () => {
    expect(nowStamp(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05T07:03')
  })

  it('sync cancels everything pending, then schedules the new list', async () => {
    const plugin = fakePlugin([{ id: 1 }, { id: 2 }])
    await syncReminders(plugin, [r])
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }, { id: 2 }] })
    expect(plugin.schedule).toHaveBeenCalledTimes(1)
    expect(plugin.schedule.mock.calls[0][0].notifications.map((n) => n.id)).toEqual([7])
    expect(plugin.cancel.mock.invocationCallOrder[0]).toBeLessThan(plugin.schedule.mock.invocationCallOrder[0])
  })

  it('sync with nothing pending or nothing to schedule makes no empty calls', async () => {
    const plugin = fakePlugin([])
    await syncReminders(plugin, [])
    expect(plugin.cancel).not.toHaveBeenCalled()
    expect(plugin.schedule).not.toHaveBeenCalled()
  })

  it('permission asks only when allowed to and not yet decided', async () => {
    const undecided = fakePlugin([], 'prompt')
    expect(await permission(undecided, { ask: false })).toBe('prompt')
    expect(undecided.requestPermissions).not.toHaveBeenCalled()
    expect(await permission(undecided, { ask: true })).toBe('granted')
    const denied = fakePlugin([], 'denied')
    expect(await permission(denied, { ask: true })).toBe('denied')
    expect(denied.requestPermissions).not.toHaveBeenCalled()
  })

  it('asks for exact alarms only when Android already allows them, so the settings screen never pops up', async () => {
    expect(toNotification(r).isExactNotification).toBe(false)
    expect(toNotification(r, { exact: true }).isExactNotification).toBe(true)
    const plugin = fakePlugin([])
    await syncReminders(plugin, [r], { exact: false })
    expect(plugin.schedule.mock.calls[0][0].notifications[0].isExactNotification).toBe(false)
  })

  it('Turn on asks even with nothing to remind; on its own it asks once, when there is something', () => {
    expect(shouldAsk('prompt', { ask: true, count: 0, askedBefore: true })).toBe(true)
    expect(shouldAsk('prompt', { ask: false, count: 3, askedBefore: false })).toBe(true)
    expect(shouldAsk('prompt', { ask: false, count: 3, askedBefore: true })).toBe(false)
    expect(shouldAsk('prompt', { ask: false, count: 0, askedBefore: false })).toBe(false)
    expect(shouldAsk('granted', { ask: true, count: 3, askedBefore: false })).toBe(false)
  })

  it('after an explicit no, a later prompt-with-rationale still counts as denied', async () => {
    const p = fakePlugin([], 'prompt-with-rationale')
    expect(await permission(p, { deniedBefore: true })).toBe('denied')
    expect(await permission(p, { ask: true, deniedBefore: true })).toBe('denied')
    expect(p.requestPermissions).not.toHaveBeenCalled()
    expect(await permission(fakePlugin([], 'granted'), { deniedBefore: true })).toBe('granted')
  })
})
