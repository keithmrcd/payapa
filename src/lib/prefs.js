import { ref } from 'vue'

// Small per-device preferences kept in localStorage.
const NAME_KEY = 'payapa.name'

function load() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export const userName = ref(load())

export function setUserName(v) {
  userName.value = v
  try { localStorage.setItem(NAME_KEY, v) } catch { /* private mode or storage blocked */ }
}

// Reminder settings: one time for every reminder, and the two optional kinds.
const REMINDERS_KEY = 'payapa.reminders'
const REMINDER_DEFAULTS = { time: '09:00', statements: true, payday: true }

function loadReminders() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMINDERS_KEY) || 'null')
    return { ...REMINDER_DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) }
  } catch {
    return { ...REMINDER_DEFAULTS }
  }
}

export const reminderPrefs = ref(loadReminders())

export function setReminderPrefs(changes) {
  reminderPrefs.value = { ...reminderPrefs.value, ...changes }
  try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminderPrefs.value)) } catch { /* storage blocked */ }
}

// Whether a guest has already seen the one-time "Sign in to back it up" toast.
const NUDGED_KEY = 'payapa.backupNudged'
function loadNudged() {
  try { return localStorage.getItem(NUDGED_KEY) === '1' } catch { return false }
}
export const backupNudged = ref(loadNudged())
export function setBackupNudged() {
  backupNudged.value = true
  try { localStorage.setItem(NUDGED_KEY, '1') } catch { /* storage blocked */ }
}
