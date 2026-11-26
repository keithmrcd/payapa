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
})
