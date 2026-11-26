import { defineStore } from 'pinia'

// Which sheet is open. Sheets live once in App.vue; screens just call these.
// Opening a sheet clears the toast: it sits above sheets and would cover their buttons.
export const useUi = defineStore('ui', {
  state: () => ({ addOpen: false, editing: null, payFor: null, editPayment: null, statementFor: null, toast: null }),
  actions: {
    openAdd() { this.toast = null; this.editing = null; this.addOpen = true },
    /** `{ type: 'item' | 'card', id }`: opens the form pre-filled, skipping the type chooser. */
    openEdit(target) { this.toast = null; this.editing = target; this.addOpen = true },
    closeAdd() { this.addOpen = false; this.editing = null },
    openPay(occurrence) { this.toast = null; this.editPayment = null; this.payFor = occurrence },
    closePay() { this.payFor = null },
    /** A `money.history` row: opens the pay sheet in edit mode. */
    openPayment(row) { this.toast = null; this.payFor = null; this.editPayment = row },
    closePayment() { this.editPayment = null },
    /** `{ cardId, statementId? }`: enter a card's statement, or edit one when `statementId` is given. */
    openStatement(target) { this.toast = null; this.payFor = null; this.editPayment = null; this.statementFor = target },
    closeStatement() { this.statementFor = null },
    showToast(text, undo) {
      this.toast = { text, undo, id: Date.now() }
      const id = this.toast.id
      setTimeout(() => { if (this.toast?.id === id) this.toast = null }, 5000)
    },
  },
})
