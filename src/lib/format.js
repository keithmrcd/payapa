const php = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 })
const phpWhole = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })

/** Centavos → "₱3,412.50". Whole pesos drop the ".00" when `compact`. */
export const peso = (c = 0, { compact = false } = {}) =>
  compact && c % 100 === 0 ? phpWhole.format(c / 100) : php.format(c / 100)

const toDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const shortDate = (s) => toDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const dayDate = (s) => toDate(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
export const longDate = (s) => toDate(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
export const monthName = (s) => toDate(s).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export function dueLabel(o) {
  if (o.status === 'paid') return `Paid`
  const n = o.daysLeft
  if (n < -1) return `${-n} days late`
  if (n === -1) return '1 day late'
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  if (n <= 7) return dayDate(o.due)
  return shortDate(o.due)
}

export const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][((n % 100) - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th')

/** A schedule version as words: "monthly on the 20th", "yearly on Mar 5", "every 2 weeks", "once on Dec 5". */
export function scheduleLabel(v) {
  if (v.recurrence === 'weekly') return v.interval > 1 ? `every ${v.interval} weeks` : 'every week'
  if (v.recurrence === 'yearly') return `yearly on ${shortDate(`2028-${String(v.dueMonth + 1).padStart(2, '0')}-${String(v.dueDay).padStart(2, '0')}`)}`
  if (v.recurrence === 'once') return `once on ${shortDate(v.effectiveFrom)}`
  return `monthly on the ${ordinal(v.dueDay)}`
}

/** Reminder offsets (days before due) as words: "3 days, 1 day, on the day". */
export function remindersLabel(offsets) {
  if (!offsets?.length) return 'Off'
  const parts = [...offsets].sort((a, b) => b - a).map((d) => (d === 0 ? 'on the day' : `${d} ${d === 1 ? 'day' : 'days'}`))
  const text = parts.join(', ')
  return text[0].toUpperCase() + text.slice(1)
}

/** "19:30" → "7:30 PM". */
export function timeLabel(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** The Backup and sync status line. `lastSynced` is an ISO instant. */
export function syncLabel(status, lastSynced, now = new Date()) {
  if (status === 'ok' && lastSynced) {
    const s = Math.max(0, (now - new Date(lastSynced)) / 1000)
    if (s < 60) return 'Synced just now'
    if (s < 3600) return `Synced ${Math.floor(s / 60)} min ago`
    if (s < 86400) return `Synced ${Math.floor(s / 3600)} hr ago`
    const d = Math.floor(s / 86400)
    return `Synced ${d} ${d === 1 ? 'day' : 'days'} ago`
  }
  return {
    ok: 'Synced', syncing: 'Syncing…', idle: 'Waiting to sync', offline: 'Offline, will sync later',
    auth: 'Sign in again to keep backing up', error: 'Couldn’t sync. Will try again.', off: 'Off', unavailable: 'Not available in this build',
  }[status] ?? ''
}
