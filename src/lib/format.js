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
