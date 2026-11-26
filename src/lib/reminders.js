// Which local notifications to schedule: due reminders, statement reminders and payday mornings.
// Pure: the caller hands this list to notify.js, which talks to the plugin.

import { addDays, iso, toDate } from './dates'
import { peso, dayDate } from './format'
import { paydayFor, nextPaydayAfter } from './payday'
import { latestClosedCycle, nextCycle } from './cards'
import { paydaySummary } from './occurrences'

const DEFAULT_OFFSETS = [3, 1, 0]

/** A stable positive 31-bit id (FNV-1a), so rescheduling the same reminder replaces it. */
export function reminderId(key) {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193)
  return (h >>> 1) || 1
}

const dueTitle = (name, n) => (n === 0 ? `${name} is due today` : n === 1 ? `${name} is due tomorrow` : `${name} is due in ${n} days`)

function dueBody(o) {
  const parts = [o.variable ? `About ${peso(o.left)}` : peso(o.left)]
  if (o.type === 'card' && o.minimum && o.paid < o.minimum) parts.push(`Minimum ${peso(o.minimum - o.paid)}`)
  parts.push(dayDate(o.due))
  return parts.join(' · ')
}

/**
 * Reminders after `now` ('YYYY-MM-DDTHH:mm') and within `days` of `today`, soonest first, at most `max`.
 * prefs: { time: 'HH:mm', statements: bool, payday: bool }.
 */
export function buildReminders({ occurrences, items = [], cards = [], cardStatements = [] }, today, now, prefs) {
  const { time = '09:00', statements = true, payday = true, days = 60, max = 120 } = prefs
  const end = addDays(today, days)
  const out = []
  const add = (kind, key, date, title, body, route) => {
    const at = `${date}T${time}`
    if (at <= now || date > end) return
    out.push({ id: reminderId(`${kind}:${key}`), kind, at, title, body, route })
  }

  const offsetsOf = (o) => {
    const src = o.type === 'item' ? items.find((i) => i.id === o.id) : cards.find((c) => c.id === o.id)
    return Array.isArray(src?.reminderOffsets) ? src.reminderOffsets : DEFAULT_OFFSETS
  }
  for (const o of occurrences) {
    if (o.status === 'paid' || o.needsStatement) continue
    for (const n of offsetsOf(o)) {
      add('due', `${o.ref}:${n}`, addDays(o.due, -n), dueTitle(o.name, n), dueBody(o), `/${o.type === 'item' ? 'items' : 'cards'}/${o.id}`)
    }
  }

  if (statements) {
    for (const c of cards) {
      if (c.archivedAt || !c.statementDay || !c.dueDay) continue
      const entered = new Set(cardStatements.filter((s) => s.cardId === c.id && !s.deletedAt).map((s) => s.statementDate.slice(0, 7)))
      for (let cyc = latestClosedCycle(c, today); cyc.statementDate <= end; cyc = nextCycle(c, cyc)) {
        if (entered.has(cyc.key)) continue
        add('statement', `${c.id}:${cyc.key}`, cyc.statementDate, `${c.name} statement is out`, 'Enter it from your SOA to see what’s due.', `/cards/${c.id}`)
      }
    }
  }

  if (payday) {
    // Occurrences are computed through the end of the month two months out (buildOccurrences); a payday whose
    // bills run past that would be counted short, so it waits for a later reschedule.
    const t = toDate(today)
    const horizon = iso(t.getFullYear(), t.getMonth() + 2, 31)
    for (let p = paydayFor(today); p.date <= end && p.to <= horizon; p = nextPaydayAfter(p)) {
      const { left } = paydaySummary(occurrences, p)
      if (left > 0) add('payday', p.date, p.date, 'Payday today', `${peso(left)} to pay from this salary.`, '/payday')
    }
  }

  return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).slice(0, max)
}
