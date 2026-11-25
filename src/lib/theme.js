import { ref } from 'vue'

// Light / Dark / System → <html data-theme="light|dark">. Light is the default.
const KEY = 'payapa.theme'
const CHOICES = ['light', 'dark', 'system']

function load() {
  try {
    const v = localStorage.getItem(KEY)
    return CHOICES.includes(v) ? v : 'light'
  } catch {
    return 'light'
  }
}

export const theme = ref(load())

const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null

function apply() {
  const dark = theme.value === 'dark' || (theme.value === 'system' && !!media?.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function setTheme(v) {
  if (!CHOICES.includes(v)) return
  theme.value = v
  apply()
  try { localStorage.setItem(KEY, v) } catch { /* private mode or storage blocked */ }
}

export function initTheme() {
  apply()
  media?.addEventListener('change', () => { if (theme.value === 'system') apply() })
}
