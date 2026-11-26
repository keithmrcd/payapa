import { describe, it, expect } from 'vitest'
import { swipeAxis, swipeRelease } from './swipe'

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
