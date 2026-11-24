// Paydays are the 15th and the last day of the month (30th, or 28th/29th in Feb, 31st→30th rule below).
// Salary always lands on the date, weekends included (spec: Payday view).

const lastDay = (y, m) => new Date(y, m + 1, 0).getDate()

/** The "30th" payday for a month: the 30th, or the month's last day if shorter. */
export const endPayday = (y, m) => new Date(y, m, Math.min(30, lastDay(y, m)))

/** Next payday on or after `from`. */
export function nextPayday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const y = d.getFullYear(), m = d.getMonth()
  const mid = new Date(y, m, 15)
  if (d <= mid) return { date: mid, bucket: '15' }
  const end = endPayday(y, m)
  if (d <= end) return { date: end, bucket: '30' }
  return { date: new Date(y, m + 1, 15), bucket: '15' } // the 31st → next month's 15th
}

/** Which payday bucket covers a due day: 15th–29th → "15", 30th–14th → "30". */
export const bucketForDueDay = (day) => (day >= 15 && day <= 29 ? '15' : '30')

export const daysUntil = (date, from = new Date()) => {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((date - a) / 864e5)
}
