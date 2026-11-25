import { defineStore } from 'pinia'

// Which sheet is open. Sheets live once in App.vue; screens just call these.
export const useUi = defineStore('ui', {
  state: () => ({ addOpen: false, editing: null, payFor: null, toast: null }),
  actions: {
    openAdd() { this.editing = null; this.addOpen = true },
    /** `{ type: 'item' | 'card', id }`: opens the form pre-filled, skipping the type chooser. */
    openEdit(target) { this.editing = target; this.addOpen = true },
    closeAdd() { this.addOpen = false; this.editing = null },
    openPay(occurrence) { this.payFor = occurrence },
    closePay() { this.payFor = null },
    showToast(text, undo) {
      this.toast = { text, undo, id: Date.now() }
      const id = this.toast.id
      setTimeout(() => { if (this.toast?.id === id) this.toast = null }, 5000)
    },
  },
})
