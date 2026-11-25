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
