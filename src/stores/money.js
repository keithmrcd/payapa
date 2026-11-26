import { defineStore } from 'pinia'
import { db, save, softDelete, loadAll } from '@/db'
import { seedAccounts } from '@/db/seed'
import { todayIso, daysBetween, addDays } from '@/lib/dates'
import { paydayFor, nextPaydayAfter } from '@/lib/payday'
import { withScheduleEdit, loanEndDate } from '@/lib/recurrence'
import { buildOccurrences, homeGroups, editBase, paydaySummary } from '@/lib/occurrences'
import { latestClosedCycle, installmentAnchor, installmentProgress, firstStatementFromPaid } from '@/lib/cards'

export { daysBetween, paydayFor, nextPaydayAfter }

// Dexie holds the data; this store keeps an in-memory copy for the screens.
// Every action writes Dexie first and patches state only after the write succeeds,
// so a failed write (quota, private mode) never shows as saved.

const byCreated = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1)
const now = () => new Date().toISOString()
// Row bookkeeping belongs to the store and db layer; callers can't set it.
const clean = ({ id, userId, createdAt, updatedAt, deletedAt, ...rest } = {}) => rest

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

    /**
     * The date a schedule edit to this item takes effect (see editBase). The edit form pre-fills,
     * item detail shows, and updateItem compares against the version in force on this date.
     * Null for archived items and for a one-off with nothing left.
     */
    editBaseDate: (s) => (id) => {
      const item = s.items.find((i) => i.id === id)
      if (!item || item.archivedAt) return null
      return editBase(item, s.payments, s.today).date
    },

    home() {
      return homeGroups(this.occurrences, this.today)
    },

    paydays() {
      const cur = paydayFor(this.today)
      return [cur, nextPaydayAfter(cur)]
    },

    /** What a payday covers; the current payday (the one today falls in) also carries late bills. */
    periodSummary() {
      return (p) => paydaySummary(this.occurrences, p, { carry: p.date === this.paydays[0].date })
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
      return this._put('items', 'items', { notes: '', archivedAt: null, ...clean(fields), id: undefined })
    },
    /**
     * Schedule changes apply from the edit base date, so a due date with payments never moves
     * and paid months keep their amounts. startDate moves only while the item has no payments.
     */
    async updateItem(id, changes) {
      const item = this._find('items', id)
      const { startDate, ...next } = clean(changes)
      const hasPayments = this.payments.some((p) => p.ref.startsWith(`item:${id}:`))
      // A new first due on a single-version item with no payments moves the version's start with it.
      if (startDate && startDate !== item.startDate && item.schedule.length === 1 && !hasPayments) {
        const r = withScheduleEdit(item, next, null)
        return this._put('items', 'items', { ...r, startDate, schedule: [{ ...r.schedule[0], effectiveFrom: startDate }] })
      }
      const { date, first } = editBase(item, this.payments, this.today)
      let base = date
      // A finished loan has no next due: a new version takes effect after its last one, changing nothing paid.
      if (base == null && item.schedule.at(-1).recurrence !== 'once') base = addDays(loanEndDate(item) ?? this.today, 1)
      return this._put('items', 'items', withScheduleEdit(item, next, base, { first }))
    },
    async archiveItem(id) {
      return this._put('items', 'items', { ...this._find('items', id), archivedAt: now() })
    },
    async unarchiveItem(id) {
      return this._put('items', 'items', { ...this._find('items', id), archivedAt: null })
    },

    // Credit cards and pay-later accounts
    // No card number is ever kept: last4 is always saved as null (and cleared on edit).
    async addCard(fields) {
      return this._put('cards', 'cards', { archivedAt: null, ...clean(fields), last4: null, id: undefined })
    },
    async updateCard(id, changes) {
      return this._put('cards', 'cards', { ...this._find('cards', id), ...clean(changes), last4: null, id })
    },
    async archiveCard(id) {
      return this._put('cards', 'cards', { ...this._find('cards', id), archivedAt: now() })
    },
    async unarchiveCard(id) {
      return this._put('cards', 'cards', { ...this._find('cards', id), archivedAt: null })
    },

    // Accounts (where money is paid from)
    async addAccount(fields) {
      return this._put('accounts', 'accounts', { archivedAt: null, ...clean(fields), id: undefined })
    },
    async updateAccount(id, changes) {
      return this._put('accounts', 'accounts', { ...this._find('accounts', id), ...clean(changes), id })
    },
    async archiveAccount(id) {
      return this._put('accounts', 'accounts', { ...this._find('accounts', id), archivedAt: now() })
    },

    async unarchiveAccount(id) {
      return this._put('accounts', 'accounts', { ...this._find('accounts', id), archivedAt: null })
    },

    // Statements (one per card per month, entered from the SOA)
    _statementRef(s) { return `card:${s.cardId}:${s.dueDate}` },
    /** One statement per card per month, and no two sharing a due date (payments are keyed by it). */
    _clash(cardId, id, statementDate, dueDate) {
      const month = statementDate.slice(0, 7)
      return this.cardStatements.some((s) => s.cardId === cardId && s.id !== id && (s.statementDate.slice(0, 7) === month || s.dueDate === dueDate))
    },
    statementPayments(id) {
      const s = this._find('cardStatements', id)
      return this.payments.filter((p) => p.ref === this._statementRef(s))
    },
    async addStatement(cardId, { statementDate, dueDate, statementBalance, minimumDue }) {
      if (this._clash(cardId, null, statementDate, dueDate)) throw new Error('duplicate')
      return this._put('card_statements', 'cardStatements', { cardId, statementDate, dueDate, statementBalance, minimumDue: minimumDue || 0 })
    },
    /** Payments are keyed by the due date, so it stays put once the statement has any. */
    async updateStatement(id, { statementDate, dueDate, statementBalance, minimumDue }) {
      const row = this._find('cardStatements', id)
      const locked = this.statementPayments(id).length > 0
      if (this._clash(row.cardId, id, statementDate, locked ? row.dueDate : dueDate)) throw new Error('duplicate')
      return this._put('card_statements', 'cardStatements', {
        ...row, statementDate, dueDate: locked ? row.dueDate : dueDate, statementBalance, minimumDue: minimumDue || 0,
      })
    },
    /** Soft-deletes the statement and its payments. Returns both as they were, for restoreStatement (Undo). */
    async deleteStatement(id) {
      const statement = this._find('cardStatements', id)
      const payments = this.statementPayments(id)
      for (const p of payments) await softDelete('payments', p.id)
      await softDelete('card_statements', id)
      const gone = new Set(payments.map((p) => p.id))
      this.payments = this.payments.filter((p) => !gone.has(p.id))
      this.cardStatements = this.cardStatements.filter((s) => s.id !== id)
      return { statement, payments }
    },
    async restoreStatement({ statement, payments }) {
      await this._put('card_statements', 'cardStatements', { ...statement, deletedAt: null })
      for (const p of payments) await this._put('payments', 'payments', { ...p, deletedAt: null })
    },

    // Installment plans (progress only; the SOA balance already includes each month)
    async addInstallment(cardId, { description, monthlyAmount, months, paid }) {
      const card = this._find('cards', cardId)
      const anchor = installmentAnchor(card, this.cardStatements, this.today).date
      return this._put('installments', 'installments', {
        cardId, description, monthlyAmount, months, firstStatementDate: firstStatementFromPaid(card, anchor, paid || 0),
      })
    },
    /** A changed "paid so far" moves the first statement; an unchanged one leaves it alone. */
    async updateInstallment(id, { description, monthlyAmount, months, paid }) {
      const row = this._find('installments', id)
      const card = this._find('cards', row.cardId)
      let { firstStatementDate } = row
      if (paid != null && paid !== installmentProgress(row, card, this.today).paid) {
        firstStatementDate = firstStatementFromPaid(card, latestClosedCycle(card, this.today).statementDate, paid)
      }
      return this._put('installments', 'installments', { ...row, description, monthlyAmount, months, firstStatementDate })
    },
    async deleteInstallment(id) {
      const row = this._find('installments', id)
      await softDelete('installments', id)
      this.installments = this.installments.filter((i) => i.id !== id)
      return row
    },
    async restoreInstallment(row) {
      return this._put('installments', 'installments', { ...row, deletedAt: null })
    },

    // Payments
    async markPaid(o, { amount, paidOn, account, referenceNo, note }) {
      return this._put('payments', 'payments', {
        ref: o.ref, amount, paidOn, accountId: account ?? null, referenceNo: referenceNo || null, note: note || null,
      })
    },
    /** Change what was paid, when, from where. The payment stays on the same bill (`ref` never changes). */
    async updatePayment(id, { amount, paidOn, account, referenceNo, note }) {
      return this._put('payments', 'payments', {
        ...this._find('payments', id), amount, paidOn, accountId: account ?? null, referenceNo: referenceNo || null, note: note || null,
      })
    },
    /** Soft-deletes the payment. Returns the row as it was, for restorePayment (Undo). */
    async deletePayment(id) {
      const row = this._find('payments', id)
      await softDelete('payments', id)
      this.payments = this.payments.filter((p) => p.id !== id)
      return row
    },
    async restorePayment(row) {
      return this._put('payments', 'payments', { ...row, deletedAt: null })
    },
    async undoPayment(id) {
      await this.deletePayment(id)
    },
  },
})
