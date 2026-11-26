// Keeps the phone's scheduled reminders in step with the data. Android app only; in the browser it does nothing.

import { ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { buildReminders } from './reminders'
import { syncReminders, permission, nowStamp, shouldAsk } from './notify'
import { reminderPrefs } from './prefs'
import { watchRows } from './watchRows'

const ASKED_KEY = 'payapa.notifAsked'
const DENIED_KEY = 'payapa.notifDenied'
const native = Capacitor.isNativePlatform()

/** What the Reminders screen shows. permission: null (not checked yet) | 'granted' | 'denied' | 'prompt'; exact: 'granted' | 'denied' | null. */
export const reminderStatus = ref({ native, permission: native ? null : 'denied', exact: null, scheduled: 0 })

let money = null
let timer = null
let running = Promise.resolve()

const askedBefore = () => { try { return localStorage.getItem(ASKED_KEY) === '1' } catch { return true } }
const markAsked = () => { try { localStorage.setItem(ASKED_KEY, '1') } catch { /* storage blocked */ } }
const deniedBefore = () => { try { return localStorage.getItem(DENIED_KEY) === '1' } catch { return false } }
const setDenied = (v) => { try { v ? localStorage.setItem(DENIED_KEY, '1') : localStorage.removeItem(DENIED_KEY) } catch { /* storage blocked */ } }

function currentList() {
  const { items, cards, cardStatements, occurrences, today } = money
  return buildReminders({ occurrences, items, cards, cardStatements }, today, nowStamp(), reminderPrefs.value)
}

async function refreshStatus() {
  const { display } = await LocalNotifications.checkPermissions()
  if (display === 'granted' || display === 'prompt') setDenied(false) // turned on in settings, or Android can ask again
  const p = await permission(LocalNotifications, { deniedBefore: deniedBefore() })
  let exact = null
  try { exact = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm } catch { /* older Android: always exact */ }
  reminderStatus.value = { ...reminderStatus.value, permission: p, exact }
  return p
}

/** Rebuild and reschedule. `ask`: ask for permission if the owner hasn't decided (asked once automatically). */
export function refreshReminders({ ask = false } = {}) {
  if (!native || !money?.ready) return Promise.resolve()
  running = running.then(async () => {
    const list = currentList()
    let p = await refreshStatus()
    if (shouldAsk(p, { ask, count: list.length, askedBefore: askedBefore() })) {
      markAsked()
      p = await permission(LocalNotifications, { ask: true })
      // Dismissing the dialog (Back) also comes back as a no; remember it only if Android now says so too.
      if (p === 'denied') {
        const { display } = await LocalNotifications.checkPermissions()
        if (display === 'denied' || display === 'prompt-with-rationale') setDenied(true)
        else p = 'prompt'
      }
      reminderStatus.value = { ...reminderStatus.value, permission: p }
    }
    await syncReminders(LocalNotifications, p === 'granted' ? list : [], { exact: reminderStatus.value.exact === 'granted' })
    reminderStatus.value = { ...reminderStatus.value, scheduled: p === 'granted' ? list.length : 0 }
  }).catch((e) => console.error('reminders', e))
  return running
}

const soon = () => { clearTimeout(timer); timer = setTimeout(() => refreshReminders(), 1000) }

/** Start once the store is loaded: reschedule on any data or setting change, and open the screen a tap points to. */
export function startReminders(store, router) {
  if (!native || money) return
  money = store
  LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const to = a.notification?.extra?.route
    if (to) router.push(to)
  })
  watchRows(money, soon)
  watch(() => [money.today, reminderPrefs.value], soon)
  refreshReminders()
}

export async function allowExactTime() {
  if (!native) return
  try { await LocalNotifications.changeExactNotificationSetting() } catch (e) { console.error(e) }
  await refreshReminders()
}
