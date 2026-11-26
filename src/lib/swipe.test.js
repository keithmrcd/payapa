import { describe, it, expect, vi } from 'vitest'
import { swipeAxis, swipeRelease, clickGuard, swipeGesture } from './swipe'

describe('swipeAxis', () => {
  it('waits until the finger has moved 10px', () => {
    expect(swipeAxis(6, 3)).toBe('idle')
    expect(swipeAxis(9, -9)).toBe('idle')
  })
  it('lets the page scroll when the move is mostly vertical', () => {
    expect(swipeAxis(12, 20)).toBe('scroll')
    expect(swipeAxis(15, 11)).toBe('scroll')
  })
  it('ignores leftward moves', () => {
    expect(swipeAxis(-30, 0)).toBe('scroll')
  })
  it('tracks a rightward, mostly flat move', () => {
    expect(swipeAxis(20, 5)).toBe('track')
  })
})

describe('swipeRelease', () => {
  it('cancels a slow drag short of 96px', () => {
    expect(swipeRelease({ dx: 95, ms: 600 })).toBe('cancel')
  })
  it('pays at 96px', () => {
    expect(swipeRelease({ dx: 96, ms: 600 })).toBe('pay')
  })
  it('pays on a quick flick of at least 48px', () => {
    expect(swipeRelease({ dx: 60, ms: 80 })).toBe('pay')
  })
  it('cancels a quick but tiny flick', () => {
    expect(swipeRelease({ dx: 40, ms: 40 })).toBe('cancel')
  })
})

describe('clickGuard', () => {
  it('blocks the click that follows a swipe, once', async () => {
    const g = clickGuard()
    g.swiped()
    g.released()
    expect(g.consume()).toBe(true)
    expect(g.consume()).toBe(false)
  })
  it('does not block a later click when no click followed the swipe (touch)', async () => {
    vi.useFakeTimers()
    const g = clickGuard()
    g.swiped()
    g.released()
    vi.runAllTimers()
    expect(g.consume()).toBe(false)
    vi.useRealTimers()
  })
  it('never blocks without a swipe', () => {
    const g = clickGuard()
    g.released()
    expect(g.consume()).toBe(false)
  })
})

describe('swipeGesture (the row’s pointer flow)', () => {
  const run = (steps) => {
    const g = swipeGesture()
    const out = []
    for (const [kind, x, y, t] of steps) out.push(g[kind]({ x, y, t }))
    return out
  }
  it('a slow drag past the threshold opens the pay sheet, following the finger', () => {
    const out = run([['down', 0, 0, 0], ['move', 20, 2, 50], ['move', 100, 3, 200], ['up', 100, 3, 900]])
    expect(out[1]).toMatchObject({ capture: true, offset: 20 })
    expect(out[2].offset).toBe(96 + (100 - 96) * 0.35)
    expect(out[3]).toEqual({ pay: true, swiped: true })
  })
  it('a short drag snaps back without paying, but still eats the click', () => {
    const out = run([['down', 0, 0, 0], ['move', 30, 0, 50], ['up', 30, 0, 900]])
    expect(out[2]).toEqual({ pay: false, swiped: true })
  })
  it('a vertical move is a scroll: nothing moves and the click goes through', () => {
    const out = run([['down', 0, 0, 0], ['move', 2, 30, 50], ['move', 80, 40, 100], ['up', 80, 40, 200]])
    expect(out[1].offset).toBe(undefined)
    expect(out[2].offset).toBe(undefined)
    expect(out[3]).toEqual({ pay: false, swiped: false })
  })
  it('a leftward drag never goes below zero', () => {
    const out = run([['down', 50, 0, 0], ['move', 70, 0, 50], ['move', 10, 0, 100]])
    expect(out[2].offset).toBe(0)
  })
})
