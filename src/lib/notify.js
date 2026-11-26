// Talking to the local-notifications plugin. The plugin is passed in, so this is testable without a phone.
// Payapa owns every notification it schedules, so a sync cancels everything pending and schedules afresh.

const pad = (n) => String(n).padStart(2, '0')

/** Local time as 'YYYY-MM-DDTHH:mm', the format reminders use. */
export const nowStamp = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const atDate = (at) => {
  const [date, time] = at.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

// Exact alarms only when Android already allows them: asking for one without that permission makes the
// plugin open the system "Alarms & reminders" screen on every schedule. Without it, Android may run a
// few minutes late; the Reminders screen offers "Allow exact time".
export const toNotification = (r, { exact = false } = {}) => ({
  id: r.id, title: r.title, body: r.body, smallIcon: 'ic_stat_payapa',
  schedule: { at: atDate(r.at), allowWhileIdle: true },
  isExactNotification: exact,
  extra: { route: r.route },
})

export async function syncReminders(plugin, list, { exact = false } = {}) {
  const { notifications: pending } = await plugin.getPending()
  if (pending.length) await plugin.cancel({ notifications: pending.map((n) => ({ id: n.id })) })
  if (list.length) await plugin.schedule({ notifications: list.map((r) => toNotification(r, { exact })) })
}

/** Ask for permission on "Turn on", or once on its own when there's something to remind about. */
export const shouldAsk = (p, { ask, count, askedBefore }) => p === 'prompt' && (ask || (count > 0 && !askedBefore))

/**
 * 'granted' | 'denied' | 'prompt'. Asks the system only when `ask` and the owner hasn't decided yet.
 * After one "no", Android 13 reports prompt-with-rationale; with `deniedBefore` that still counts as denied.
 */
export async function permission(plugin, { ask = false, deniedBefore = false } = {}) {
  const { display } = await plugin.checkPermissions()
  if (display === 'granted' || display === 'denied') return display
  if (deniedBefore) return 'denied'
  if (!ask) return 'prompt'
  const asked = await plugin.requestPermissions()
  return asked.display === 'granted' ? 'granted' : 'denied'
}
