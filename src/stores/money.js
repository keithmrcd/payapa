import { defineStore } from 'pinia'
import { buildDemo, iso } from '@/data/demo'

const toDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const todayIso = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()) }
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5)

/** Payday period containing `date`: the 15th covers 15–29, the 30th covers 30–14. */
export function paydayFor(dateIso) {
  const d = toDate(dateIso)
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate()
  const end = (yy, mm) => iso(yy, mm, 30) // iso() clamps Feb to its last day
  const lastDay = new Date(y, m + 1, 0).getDate()
  const endDay = Math.min(30, lastDay)
  if (day >= 15 && day < endDay) return { bucket: '15', date: iso(y, m, 15), from: iso(y, m, 15), to: iso(y, m, endDay - 1) }
  if (day >= endDay) return { bucket: '30', date: end(y, m), from: end(y, m), to: iso(y, m + 1, 14) }
  return { bucket: '30', date: end(y, m - 1), from: end(y, m - 1), to: iso(y, m, 14) }
}
export function nextPaydayAfter(p) {
  return paydayFor(iso(...(() => { const d = toDate(p.to); return [d.getFullYear(), d.getMonth(), d.getDate() + 1] })()))
}

export const useMoney = defineStore('money', {
  state: () => ({ ...buildDemo(), today: todayIso() }),

  getters: {
    account: (s) => (id) => s.accounts.find((a) => a.id === id),

    /** Every due occurrence from last month to two months out, with paid status. */
    occurrences(s) {
      const t = toDate(s.today)
      const out = []
      const paidFor = (ref) => s.payments.filter((p) => p.ref === ref).reduce((n, p) => n + p.amount, 0)

      for (const it of s.items) {
        for (let mo = -1; mo <= 1; mo++) {
          const due = iso(t.getFullYear(), t.getMonth() + mo, it.dueDay)
          const ref = `item:${it.id}:${due}`
          const paid = paidFor(ref)
          out.push(occ(s, { ref, type: 'item', id: it.id, name: it.name, kind: it.kind, category: it.category, due, amount: it.amount, minimum: null, paid, account: it.account, variable: it.variable }))
        }
      }
      for (const c of s.cards) {
        const ref = `card:${c.id}:${c.statement.due}`
        out.push(occ(s, { ref, type: 'card', id: c.id, name: c.name, kind: c.type, category: c.type, due: c.statement.due, amount: c.statement.balance, minimum: c.statement.minimum, paid: paidFor(ref), account: c.account, last4: c.last4, tone: c.tone }))
      }
      return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : b.amount - a.amount))
    },

    home() {
      const t = this.today
      const monthStart = t.slice(0, 8) + '01'
      const open = this.occurrences.filter((o) => o.status !== 'paid')
      return {
        overdue: open.filter((o) => o.due < t && o.due >= monthStart),
        week: open.filter((o) => o.due >= t && daysBetween(t, o.due) <= 7),
        later: open.filter((o) => daysBetween(t, o.due) > 7 && daysBetween(t, o.due) <= 21),
        paid: this.occurrences.filter((o) => o.status === 'paid' && o.due.slice(0, 7) === t.slice(0, 7)),
      }
    },

    paydays() {
      const cur = paydayFor(this.today)
      return [cur, nextPaydayAfter(cur)]
    },

    periodSummary() {
      return (p) => {
        const list = this.occurrences.filter((o) => o.due >= p.from && o.due <= p.to)
        const due = list.reduce((n, o) => n + o.amount, 0)
        const paid = list.reduce((n, o) => n + Math.min(o.paid, o.amount), 0)
        return { list, due, paid, left: Math.max(0, due - paid) }
      }
    },

    history() {
      return [...this.payments].sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1)).map((p) => {
        const [type, id] = p.ref.split(':')
        const src = type === 'item' ? this.items.find((i) => i.id === id) : this.cards.find((c) => c.id === id)
        return { ...p, type, sourceId: id, name: src?.name ?? 'Deleted item', category: type === 'item' ? src?.category : src?.type, kind: type === 'item' ? src?.kind : src?.type }
      })
    },
  },

  actions: {
    markPaid(o, { amount, paidOn, account, referenceNo }) {
      this.payments.push({ id: 'p' + Date.now(), ref: o.ref, amount, paidOn, account, referenceNo: referenceNo || undefined })
    },
    undoPayment(id) {
      this.payments = this.payments.filter((p) => p.id !== id)
    },
  },
})

function occ(s, input) {
  let o = input
  // A variable bill (electricity, water) is settled by any payment: the real amount replaces the estimate.
  const settled = o.variable ? o.paid > 0 : o.paid >= o.amount
  if (o.variable && settled) o = { ...o, amount: o.paid }
  const status = settled ? 'paid' : o.paid === 0 ? 'unpaid' : o.minimum && o.paid >= o.minimum ? 'minimum' : 'partial'
  const daysLeft = daysBetween(s.today, o.due)
  return { ...o, key: o.ref, status, daysLeft, overdue: !settled && daysLeft < 0, left: Math.max(0, o.amount - o.paid) }
}
