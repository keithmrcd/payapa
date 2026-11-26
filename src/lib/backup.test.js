import { describe, it, expect } from 'vitest'
import { shouldNudge } from './backup'

describe('backup nudge', () => {
  it('nudges a guest once, only where sync exists', () => {
    expect(shouldNudge({ signedIn: false, available: true, nudged: false })).toBe(true)
    expect(shouldNudge({ signedIn: false, available: true, nudged: true })).toBe(false)
    expect(shouldNudge({ signedIn: true, available: true, nudged: false })).toBe(false)
    expect(shouldNudge({ signedIn: false, available: false, nudged: false })).toBe(false)
  })
})
