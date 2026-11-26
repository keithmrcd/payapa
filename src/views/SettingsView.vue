<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'
import { exportAll } from '@/lib/exportData'
import GroupList from '@/components/GroupList.vue'
import { theme, setTheme } from '@/lib/theme'
import { userName, setUserName, reminderPrefs } from '@/lib/prefs'
import { timeLabel } from '@/lib/format'
import { useSession } from '@/stores/session'
import SignInSheet from '@/components/SignInSheet.vue'
import ConfirmSheet from '@/components/ConfirmSheet.vue'
import { UserCircleIcon, Wallet2Icon, CalendarIcon, BellIcon, CloudCheckIcon, ExportIcon, ShieldCheckIcon, AltArrowRightIcon } from '@/lib/icons'

const money = useMoney()
const session = useSession()
const signInOpen = ref(false)
const signOutOpen = ref(false)
async function signOut() {
  signOutOpen.value = false
  await session.signOut()
  ui.showToast('Signed out. Your data is still on this phone.')
}
// The Backup and sync row: short, so it fits beside the label.
const syncShort = computed(() => (!session.user ? (session.status === 'unavailable' ? 'Not available' : 'Off') : { offline: 'Offline', auth: 'Sign in again', error: 'Couldn’t sync' }[session.status] ?? 'On'))
const ui = useUi()
const exporting = ref(false)
async function exportCsv() {
  if (exporting.value) return
  exporting.value = true
  try {
    await exportAll()
    ui.showToast('Exported 6 files')
  } catch (e) {
    if (!/cancel/i.test(String(e?.message ?? e))) ui.showToast("Couldn't export. Try again.")
  } finally {
    exporting.value = false
  }
}
const version = __APP_VERSION__
const themes = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]
const themeNote = { system: 'Follows your phone', light: 'Always light', dark: 'Always dark' }
const groups = computed(() => [
  { title: 'Money', rows: [
    { icon: Wallet2Icon, label: 'Accounts', value: `${money.activeAccounts.length} accounts`, hue: '#0b6b63', to: '/settings/accounts' },
    { icon: CalendarIcon, label: 'Paydays', value: '15th and 30th', hue: '#4f62d6', to: '/settings/paydays' },
    { icon: BellIcon, label: 'Reminders', value: timeLabel(reminderPrefs.value.time), hue: '#6d5bd0', to: '/settings/reminders' },
  ] },
  { title: 'Data', rows: [
    { icon: CloudCheckIcon, label: 'Backup and sync', value: syncShort.value, hue: '#1a8fc4', to: '/settings/sync' },
    { icon: ExportIcon, label: 'Export as CSV', value: '', hue: '#5b6470', action: exportCsv },
  ] },
  { title: 'About', rows: [
    { icon: ShieldCheckIcon, label: 'Privacy', value: session.user ? 'Backed up to your account' : 'Data stays on this phone', hue: '#1d7a50' },
  ] },
])
</script>

<template>
  <div class="px-4">
    <section class="flex items-center gap-4 rounded-[24px] bg-surface p-4">
      <UserCircleIcon :size="52" color="var(--brand)" />
      <div v-if="session.user" class="min-w-0 flex-1">
        <input :value="userName" type="text" placeholder="Your first name" autocomplete="given-name" maxlength="40" aria-label="Your first name" class="h-11 w-full rounded-lg bg-transparent text-[17px] font-bold outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-brand" @input="setUserName($event.target.value)" @change="session.soon(500)" />
        <p class="truncate text-[13px] font-medium text-ink-2">{{ session.user.email }}</p>
      </div>
      <div v-else class="min-w-0 flex-1">
        <p class="text-[17px] font-bold">Guest</p>
        <p class="text-[13px] font-medium text-ink-2">{{ session.status === 'unavailable' ? 'Your data stays on this phone' : 'Sign in to back up and sync' }}</p>
      </div>
      <button v-if="!session.user && session.status !== 'unavailable'" type="button" class="h-11 shrink-0 rounded-full bg-brand px-4 text-[14px] font-bold text-brand-ink" @click="signInOpen = true">Sign in</button>
    </section>
    <SignInSheet :open="signInOpen" @close="signInOpen = false" />

    <GroupList title="Appearance">
      <div class="flex min-h-16 items-center gap-3 py-2 pr-2 pl-4">
        <div class="min-w-0 flex-1">
          <p id="theme-label" class="text-[15px] font-semibold">Theme</p>
          <p class="text-[13px] font-medium text-ink-2">{{ themeNote[theme] }}</p>
        </div>
        <div class="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-labelledby="theme-label">
          <button v-for="t in themes" :key="t[0]" type="button" role="radio" :aria-checked="theme === t[0]"
                  class="h-11 rounded-xl px-3 text-[14px] font-bold transition-colors"
                  :class="theme === t[0] ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]' : 'text-ink-2'"
                  @click="setTheme(t[0])">{{ t[1] }}</button>
        </div>
      </div>
    </GroupList>

    <GroupList v-for="g in groups" :key="g.title" :title="g.title">
      <component :is="r.to ? RouterLink : 'button'" v-for="r in g.rows" :key="r.label" :to="r.to" :type="r.to ? undefined : 'button'" :disabled="r.action ? exporting : undefined" class="srow flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-surface-2 disabled:opacity-50" @click="r.action?.()">
        <span class="grid size-9 place-items-center rounded-xl" :style="{ background: `color-mix(in oklab, ${r.hue} 13%, var(--surface))` }"><component :is="r.icon" :size="20" :color="r.hue" /></span>
        <span class="flex-1 text-[15px] font-semibold">{{ r.label }}</span>
        <span class="text-[14px] font-medium text-ink-2">{{ r.value }}</span>
        <AltArrowRightIcon :size="18" color="var(--ink-3)" />
      </component>
    </GroupList>

    <button v-if="session.user" type="button" class="mt-7 h-14 w-full rounded-2xl bg-surface text-base font-bold text-ink-2" @click="signOutOpen = true">Sign out</button>
    <ConfirmSheet :open="signOutOpen" title="Sign out?" body="Your data stays on this phone. Changes stop backing up until you sign in again." confirm-label="Sign out" @confirm="signOut" @close="signOutOpen = false" />

    <p class="mt-8 text-center text-[13px] font-medium text-ink-3">Payapa {{ version }}</p>
  </div>
</template>

<style scoped>
.srow + .srow { background: linear-gradient(var(--hairline), var(--hairline)) right top / calc(100% - 4rem) 1px no-repeat; }
</style>
