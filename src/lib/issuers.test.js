import { describe, it, expect } from 'vitest'
import { NETWORKS, PAY_LATER, banksFor, cardName, networkLabel, debitBanksFor, debitName } from './issuers'

describe('issuers', () => {
  it('lists the five card types', () => {
    expect(NETWORKS.map((n) => n.label)).toEqual(['Visa', 'Mastercard', 'American Express', 'JCB', 'UnionPay'])
  })
  it('American Express is BDO only', () => {
    expect(banksFor('amex')).toEqual(['BDO'])
  })
  it('every card type has a bank and none lists "Other"', () => {
    for (const n of NETWORKS) {
      expect(banksFor(n.key).length).toBeGreaterThan(0)
      expect(banksFor(n.key).some((b) => /other/i.test(b))).toBe(false)
    }
    expect(banksFor('nope')).toEqual([])
  })
  it('Maya is a Visa issuer', () => {
    expect(banksFor('visa')).toContain('Maya')
  })
  it('pay-later providers', () => {
    expect(PAY_LATER).toEqual(['Atome', 'SPayLater', 'TikTok Shop PayLater'])
  })
  it('names a card from bank and type', () => {
    expect(cardName('BDO', 'visa')).toBe('BDO Visa')
    expect(cardName('Atome', null)).toBe('Atome')
  })
  it('labels a card by its type', () => {
    expect(networkLabel({ type: 'credit_card' })).toBe('Credit card')
    expect(networkLabel({ type: 'credit_card', network: 'amex' })).toBe('American Express')
    expect(networkLabel({ type: 'pay_later' })).toBe('Pay later')
  })
  it('debit banks add GoTyme for Visa', () => {
    expect(debitBanksFor('visa')).toContain('GoTyme')
    expect(debitBanksFor('visa')).toContain('Maya')
    expect(new Set(debitBanksFor('visa')).size).toBe(debitBanksFor('visa').length)
    expect(debitBanksFor('jcb')).toEqual(banksFor('jcb'))
  })
  it('names a debit card', () => {
    expect(debitName('GoTyme', 'visa')).toBe('GoTyme Visa debit')
  })
})
