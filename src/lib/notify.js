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

export const toNotification = (r) => ({
  id: r.id, title: r.title, body: r.body, smallIcon: 'ic_stat_payapa',
  schedule: { at: atDate(r.at), allowWhileIdle: true },
  extra: { route: r.route },
})

export async function syncReminders(plugin, list) {
  const { notifications: pending } = await plugin.getPending()
  if (pending.length) await plugin.cancel({ notifications: pending.map((n) => ({ id: n.id })) })
  if (list.length) await plugin.schedule({ notifications: list.map(toNotification) })
}

/** 'granted' | 'denied' | 'prompt'. Asks the system only when `ask` and the owner hasn't decided yet. */
export async function permission(plugin, { ask = false } = {}) {
  const { display } = await plugin.checkPermissions()
  if (display === 'granted' || display === 'denied' || !ask) return display.startsWith('prompt') ? 'prompt' : display
  const asked = await plugin.requestPermissions()
  return asked.display === 'granted' ? 'granted' : 'denied'
}
