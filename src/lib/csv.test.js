import { describe, it, expect } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('header and rows', () => {
    expect(toCsv([{ a: 1, b: 'x' }], ['a', 'b'])).toBe('a,b\r\n1,x\r\n')
  })
  it('escapes commas quotes and newlines', () => {
    expect(toCsv([{ a: 'Meralco, "home"\nunit 4' }], ['a'])).toBe('a\r\n"Meralco, ""home""\nunit 4"\r\n')
  })
  it('null and undefined are empty', () => {
    expect(toCsv([{ a: null }], ['a'])).toBe('a\r\n\r\n')
    expect(toCsv([{}], ['a'])).toBe('a\r\n\r\n')
  })
})
