import { defineStore } from 'pinia'

// Which sheet is open. Sheets live once in App.vue; screens just call these.
export const useUi = defineStore('ui', {
  state: () => ({ addOpen: false, editing: null, payFor: null, editPayment: null, toast: null }),
  actions: {
    openAdd() { this.editing = null; this.addOpen = true },
    /** `{ type: 'item' | 'card', id }`: opens the form pre-filled, skipping the type chooser. */
    openEdit(target) { this.editing = target; this.addOpen = true },
    closeAdd() { this.addOpen = false; this.editing = null },
    openPay(occurrence) { this.editPayment = null; this.payFor = occurrence },
    closePay() { this.payFor = null },
    /** A `money.history` row: opens the pay sheet in edit mode. */
    openPayment(row) { this.payFor = null; this.editPayment = row },
    closePayment() { this.editPayment = null },
    showToast(text, undo) {
      this.toast = { text, undo, id: Date.now() }
      const id = this.toast.id
      setTimeout(() => { if (this.toast?.id === id) this.toast = null }, 5000)
    },
  },
})
