import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUi } from './ui'

beforeEach(() => setActivePinia(createPinia()))

describe('ui store', () => {
  // The toast sits above sheets; a leftover one would cover the sheet's buttons.
  it('opening any sheet clears the toast', () => {
    const ui = useUi()
    for (const open of [() => ui.openPay({ ref: 'r' }), () => ui.openPayment({ id: 'p' }), () => ui.openAdd(), () => ui.openEdit({ type: 'item', id: 'i' })]) {
      ui.showToast('Saved', () => {})
      open()
      expect(ui.toast).toBe(null)
    }
  })

  it('pay and edit-payment modes replace each other', () => {
    const ui = useUi()
    ui.openPay({ ref: 'r' })
    ui.openPayment({ id: 'p' })
    expect(ui.payFor).toBe(null)
    ui.openPay({ ref: 'r' })
    expect(ui.editPayment).toBe(null)
  })

  it('openStatement clears the toast and closes the pay sheet', () => {
    const ui = useUi()
    ui.openPay({ ref: 'r' })
    ui.showToast('Saved', () => {})
    ui.openStatement({ cardId: 'c1' })
    expect(ui.toast).toBe(null)
    expect(ui.payFor).toBe(null)
    expect(ui.statementFor).toEqual({ cardId: 'c1' })
    ui.closeStatement()
    expect(ui.statementFor).toBe(null)
  })

  it('openInstallment clears the toast', () => {
    const ui = useUi()
    ui.showToast('Saved', () => {})
    ui.openInstallment({ cardId: 'c1' })
    expect(ui.toast).toBe(null)
    expect(ui.installmentFor).toEqual({ cardId: 'c1' })
    ui.closeInstallment()
    expect(ui.installmentFor).toBe(null)
  })

  it('openAdd({ cards: true }) opens the card-only list', () => {
    const ui = useUi()
    ui.openAdd({ cards: true })
    expect(ui.addCardsOnly).toBe(true)
    ui.closeAdd()
    ui.openAdd()
    expect(ui.addCardsOnly).toBe(false)
  })
})
