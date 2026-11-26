import { describe, it, expect } from 'vitest'
import { backAction, EXIT_WINDOW_MS } from './back'
import { registerSheet, closeTopSheet } from './sheets'

describe('backAction (Android Back, from either edge or the button)', () => {
  const base = { sheetOpen: false, atHome: false, canGoBack: true, now: 10000, lastBackAt: null }
  it('closes an open sheet first', () => {
    expect(backAction({ ...base, sheetOpen: true, atHome: true })).toBe('close-sheet')
  })
  it('goes back to the previous screen', () => {
    expect(backAction(base)).toBe('go-back')
  })
  it('goes Home from a screen with no history (opened from a notification)', () => {
    expect(backAction({ ...base, canGoBack: false })).toBe('go-home')
  })
  it('on Home, the first Back warns and a second one soon after exits', () => {
    expect(backAction({ ...base, atHome: true })).toBe('warn-exit')
    expect(backAction({ ...base, atHome: true, lastBackAt: 10000 - EXIT_WINDOW_MS + 1 })).toBe('exit')
    expect(backAction({ ...base, atHome: true, lastBackAt: 10000 - EXIT_WINDOW_MS - 1 })).toBe('warn-exit')
  })
})

describe('open sheets', () => {
  it('Back closes the most recently opened sheet', () => {
    const closed = []
    const offA = registerSheet(() => closed.push('a'))
    const offB = registerSheet(() => closed.push('b'))
    expect(closeTopSheet()).toBe(true)
    expect(closed).toEqual(['b'])
    offB(); offA()
    expect(closeTopSheet()).toBe(false)
  })
})
