import { defineStore } from 'pinia'
import { db, save, softDelete, loadAll } from '@/db'
import { seedAccounts } from '@/db/seed'
import { todayIso, daysBetween, addDays } from '@/lib/dates'
import { paydayFor, nextPaydayAfter } from '@/lib/payday'
import { dueDates, withScheduleEdit } from '@/lib/recurrence'
import { buildOccurrences, homeGroups } from '@/lib/occurrences'

export { daysBetween, paydayFor, nextPaydayAfter }

// Dexie holds the data; this store keeps an in-memory copy for the screens.
// Every action writes Dexie first and patches state only after the write succeeds,
// so a failed write (quota, private mode) never shows as saved.

const byCreated = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1)
const now = () => new Date().toISOString()

export const useMoney = defineStore('money', {
  state: () => ({
    ready: false,
    today: todayIso(),
    accounts: [],
    items: [],
    cards: [],
    installments: [],
    cardStatements: [],
    payments: [],
  }),

  getters: {
    account: (s) => (id) => s.accounts.find((a) => a.id === id),
    activeAccounts: (s) => s.accounts.filter((a) => !a.archivedAt),
    activeItems: (s) => s.items.filter((i) => !i.archivedAt),
    activeCards: (s) => s.cards.filter((c) => !c.archivedAt),

    occurrences: (s) => buildOccurrences(s, s.today),

    home() {
      return homeGroups(this.occurrences, this.today)
    },

    paydays() {
      const cur = paydayFor(this.today)
      return [cur, nextPaydayAfter(cur)]
    },

    periodSummary() {
      return (p) => {
        const list = this.occurrences.filter((o) => o.payday === p.date)
        const due = list.reduce((n, o) => n + o.amount, 0)
        const paid = list.reduce((n, o) => n + Math.min(o.paid, o.amount), 0)
        return { list, due, paid, left: Math.max(0, due - paid) }
      }
    },

    // Archived items and cards stay in state, so their payments keep their names here.
    history() {
      return [...this.payments].sort((a, b) => (a.paidOn < b.paidOn ? 1 : a.paidOn > b.paidOn ? -1 : 0)).map((p) => {
        const [type, id] = p.ref.split(':')
        const src = type === 'item' ? this.items.find((i) => i.id === id) : this.cards.find((c) => c.id === id)
        return { ...p, account: p.accountId, type, sourceId: id, name: src?.name ?? 'Deleted item', category: type === 'item' ? src?.category : src?.type, kind: type === 'item' ? src?.kind : src?.type }
      })
    },
  },

  actions: {
    /** Open the database, seed first-run accounts, load every live row. Never clears or reseeds data. */
    async load() {
      await db.open()
      await seedAccounts()
      const all = await loadAll()
      this.$patch({
        accounts: all.accounts.sort(byCreated),
        items: all.items.sort(byCreated),
        cards: all.cards.sort(byCreated),
        installments: all.installments,
        cardStatements: all.cardStatements,
        payments: all.payments,
        today: todayIso(),
        ready: true,
      })
    },

    refreshToday() {
      const t = todayIso()
      if (t !== this.today) this.today = t
    },

    async _put(table, key, row) {
      const saved = await save(table, row)
      const list = this[key]
      const i = list.findIndex((r) => r.id === saved.id)
      if (i === -1) list.push(saved)
      else list.splice(i, 1, saved)
      return saved
    },
    _find(key, id) {
      const row = this[key].find((r) => r.id === id)
      if (!row) throw new Error(`No ${key} row ${id}`)
      return row
    },

    // Items (bills, subscriptions, loans)
    async addItem(fields) {
      return this._put('items', 'items', { notes: '', archivedAt: null, ...fields, id: undefined })
    },
    /** Schedule changes apply from the earliest unpaid occurrence, so paid months keep their amounts. */
    async updateItem(id, changes) {
      const item = this._find('items', id)
      const unpaid = this.occurrences.find((o) => o.type === 'item' && o.id === id && o.status !== 'paid')
      const from = unpaid?.due ?? dueDates(item, addDays(this.today, 800)).find((d) => d.due >= this.today)?.due ?? this.today
      return this._put('items', 'items', withScheduleEdit(item, changes, from))
    },
    async archiveItem(id) {
      return this._put('items', 'items', { ...this._find('items', id), archivedAt: now() })
    },
    async unarchiveItem(id) {
      return this._put('items', 'items', { ...this._find('items', id), archivedAt: null })
    },

    // Credit cards and pay-later accounts
    async addCard(fields) {
      return this._put('cards', 'cards', { archivedAt: null, ...fields, id: undefined })
    },
    async updateCard(id, changes) {
      return this._put('cards', 'cards', { ...this._find('cards', id), ...changes, id })
    },
    async archiveCard(id) {
      return this._put('cards', 'cards', { ...this._find('cards', id), archivedAt: now() })
    },
    async unarchiveCard(id) {
      return this._put('cards', 'cards', { ...this._find('cards', id), archivedAt: null })
    },

    // Accounts (where money is paid from)
    async addAccount(fields) {
      return this._put('accounts', 'accounts', { archivedAt: null, ...fields, id: undefined })
    },
    async updateAccount(id, changes) {
      return this._put('accounts', 'accounts', { ...this._find('accounts', id), ...changes, id })
    },
    async archiveAccount(id) {
      return this._put('accounts', 'accounts', { ...this._find('accounts', id), archivedAt: now() })
    },

    // Payments
    async markPaid(o, { amount, paidOn, account, referenceNo }) {
      return this._put('payments', 'payments', {
        ref: o.ref, amount, paidOn, accountId: account ?? null, referenceNo: referenceNo || null, note: null,
      })
    },
    async undoPayment(id) {
      await softDelete('payments', id)
      this.payments = this.payments.filter((p) => p.id !== id)
    },
  },
})
