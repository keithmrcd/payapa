<script setup>
import { computed } from 'vue'
import GroupList from '@/components/GroupList.vue'
import { reminderPrefs, setReminderPrefs } from '@/lib/prefs'
import { reminderStatus, refreshReminders, allowExactTime } from '@/lib/reminderSync'
import { timeLabel } from '@/lib/format'

// Every half hour from 6:00 AM to 10:00 PM.
const times = Array.from({ length: 33 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
const st = computed(() => reminderStatus.value)
const on = computed(() => st.value.permission === 'granted')
const statusText = computed(() => {
  if (!st.value.native) return 'Android app only'
  if (!st.value.permission) return ''
  return on.value ? 'On' : 'Off'
})
const note = computed(() => {
  if (!st.value.native) return 'Reminders are sent by the Android app. You can still set them up here.'
  if (!st.value.permission) return 'Checking…'
  if (on.value) return st.value.scheduled === 1 ? '1 reminder set for the next 60 days.' : `${st.value.scheduled} reminders set for the next 60 days.`
  if (st.value.permission === 'denied') return 'Turn on notifications for Payapa in your phone’s Settings, under Apps.'
  return 'Payapa needs your OK to send reminders.'
})
</script>

<template>
  <div class="px-4">
    <GroupList>
      <div class="flex min-h-16 items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="text-[15px] font-semibold">Notifications</p>
          <p class="text-[13px] font-medium text-ink-2">{{ note }}</p>
        </div>
        <button v-if="st.native && st.permission === 'prompt'" type="button" class="h-11 shrink-0 rounded-full bg-brand px-4 text-[14px] font-bold text-brand-ink" @click="refreshReminders({ ask: true })">Turn on</button>
        <span v-else class="shrink-0 text-[14px] font-semibold" :class="on ? 'text-paid' : 'text-ink-2'">{{ statusText }}</span>
      </div>
      <div v-if="on && st.exact === 'denied'" class="rrow flex min-h-16 items-center gap-3 px-4 py-3">
        <p class="min-w-0 flex-1 text-[13px] font-medium text-ink-2">Reminders may arrive a few minutes late.</p>
        <button type="button" class="h-11 shrink-0 rounded-full bg-surface-2 px-4 text-[14px] font-bold text-ink" @click="allowExactTime">Allow exact time</button>
      </div>
    </GroupList>

    <GroupList title="When">
      <label class="flex min-h-14 items-center gap-3 px-4">
        <span class="flex-1 text-[15px] font-semibold">Reminder time</span>
        <select :value="reminderPrefs.time" class="h-11 bg-transparent text-right text-[16px] font-semibold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Reminder time" @change="setReminderPrefs({ time: $event.target.value })">
          <option v-for="t in times" :key="t" :value="t">{{ timeLabel(t) }}</option>
        </select>
      </label>
    </GroupList>
    <p class="mt-2 px-1 text-[13px] font-medium text-ink-2">Each bill and card picks its own days in its form, under Remind me.</p>

    <GroupList title="Also remind me">
      <label class="flex min-h-16 items-center gap-3 px-4 py-3">
        <span class="min-w-0 flex-1">
          <span class="block text-[15px] font-semibold">Statement is out</span>
          <span class="block text-[13px] font-medium text-ink-2">On each card's statement date, to enter the SOA</span>
        </span>
        <input type="checkbox" class="switch" :checked="reminderPrefs.statements" @change="setReminderPrefs({ statements: $event.target.checked })" />
      </label>
      <label class="rrow flex min-h-16 items-center gap-3 px-4 py-3">
        <span class="min-w-0 flex-1">
          <span class="block text-[15px] font-semibold">Payday morning</span>
          <span class="block text-[13px] font-medium text-ink-2">How much that salary has to cover</span>
        </span>
        <input type="checkbox" class="switch" :checked="reminderPrefs.payday" @change="setReminderPrefs({ payday: $event.target.checked })" />
      </label>
    </GroupList>
  </div>
</template>

<style scoped>
.rrow { background: linear-gradient(var(--hairline), var(--hairline)) right top / calc(100% - 2rem) 1px no-repeat; }
.switch { appearance: none; width: 3.25rem; height: 2rem; border-radius: 999px; background: color-mix(in oklab, var(--ink-3) 55%, var(--surface)); position: relative; transition: background .2s; flex-shrink: 0; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 1.625rem; height: 1.625rem; border-radius: 999px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform .25s var(--ease-out-expo); }
.switch:checked { background: var(--brand); }
.switch:checked::after { transform: translateX(1.25rem); }
.switch:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
</style>
