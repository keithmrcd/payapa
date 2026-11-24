<script setup>
import { RouterLink } from 'vue-router'
import { useMoney } from '@/stores/money'
import GroupList from '@/components/GroupList.vue'
import { UserCircleIcon, Wallet2Icon, CalendarIcon, BellIcon, CloudCheckIcon, ExportIcon, ShieldCheckIcon, AltArrowRightIcon } from '@/lib/icons'

const money = useMoney()
const version = __APP_VERSION__
const groups = [
  { title: 'Money', rows: [
    { icon: Wallet2Icon, label: 'Accounts', value: `${money.accounts.length} accounts`, hue: '#0b6b63' },
    { icon: CalendarIcon, label: 'Paydays', value: '15th and 30th', hue: '#4f62d6' },
    { icon: BellIcon, label: 'Reminders', value: '9:00 AM', hue: '#6d5bd0' },
  ] },
  { title: 'Data', rows: [
    { icon: CloudCheckIcon, label: 'Backup and sync', value: 'Off', hue: '#1a8fc4' },
    { icon: ExportIcon, label: 'Export as CSV', value: '', hue: '#5b6470' },
  ] },
  { title: 'About', rows: [
    { icon: ShieldCheckIcon, label: 'Privacy', value: 'Data stays on this phone', hue: '#1d7a50' },
  ] },
]
</script>

<template>
  <div class="px-4">
    <section class="flex items-center gap-4 rounded-[24px] bg-surface p-4">
      <UserCircleIcon :size="52" color="var(--brand)" />
      <div class="flex-1">
        <p class="text-[17px] font-bold">Kit</p>
        <p class="text-[13px] font-medium text-ink-2">Not signed in · sign in to back up and sync</p>
      </div>
      <button type="button" class="h-10 rounded-full bg-brand px-4 text-[14px] font-bold text-brand-ink">Sign in</button>
    </section>

    <GroupList v-for="g in groups" :key="g.title" :title="g.title">
      <button v-for="r in g.rows" :key="r.label" type="button" class="srow flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-surface-2">
        <span class="grid size-9 place-items-center rounded-xl" :style="{ background: `color-mix(in oklab, ${r.hue} 13%, var(--surface))` }"><component :is="r.icon" :size="20" :color="r.hue" /></span>
        <span class="flex-1 text-[15px] font-semibold">{{ r.label }}</span>
        <span class="text-[14px] font-medium text-ink-2">{{ r.value }}</span>
        <AltArrowRightIcon :size="18" color="var(--ink-3)" />
      </button>
    </GroupList>

    <p class="mt-8 text-center text-[13px] font-medium text-ink-3">Payapa {{ version }} · Sample data shown until your own entries are added</p>
  </div>
</template>

<style scoped>
.srow + .srow { background: linear-gradient(var(--hairline), var(--hairline)) right top / calc(100% - 4rem) 1px no-repeat; }
</style>
