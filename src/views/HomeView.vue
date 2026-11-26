<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMoney, daysBetween } from '@/stores/money'
import GroupList from '@/components/GroupList.vue'
import OccurrenceRow from '@/components/OccurrenceRow.vue'
import { SettingsIcon, CheckCircleIcon, AltArrowRightIcon } from '@/lib/icons'
import { peso, longDate, dayDate } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { userName } from '@/lib/prefs'
import { useSession } from '@/stores/session'

const money = useMoney()
const session = useSession()
// The first name greets only a signed-in owner; a guest just gets the greeting.
const first = computed(() => (session.user ? userName.value.trim() : ''))
const ui = useUi()
const empty = computed(() => !money.activeItems.length && !money.activeCards.length)
const h = computed(() => money.home)
const nextPay = computed(() => money.paydays[1])
const untilPay = computed(() => daysBetween(money.today, nextPay.value.date))

// Every number in the block is the current payday's, carried-over late bills included, so it matches the Payday tab.
const win = computed(() => money.periodSummary(money.paydays[0]))
const share = computed(() => (win.value.due ? Math.round((win.value.paid / win.value.due) * 100) : 100))
const sum = (list) => list.reduce((n, o) => n + o.left, 0)
const greeting = (() => { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening' })()
</script>

<template>
  <div v-if="money.ready" class="safe-top px-4">
    <header class="flex items-center pt-8 pb-4">
      <div class="flex-1">
        <h1 class="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">{{ first ? `${greeting}, ${first}` : greeting }}</h1>
        <p class="mt-0.5 text-[14px] font-medium text-ink-2">{{ longDate(money.today) }}</p>
      </div>
      <RouterLink to="/settings" class="-mr-1.5 grid size-11 place-items-center rounded-full" aria-label="Settings">
        <SettingsIcon :size="28" color="var(--ink-2)" />
      </RouterLink>
    </header>

    <div v-if="empty" class="mt-6">
      <p class="text-[15px] font-medium text-ink-2">Add your bills, subscriptions, and cards to see what's due before each payday.</p>
      <button type="button" class="mt-5 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="ui.openAdd()">Add your first bill</button>
    </div>

    <RouterLink v-if="!empty" to="/payday" class="summary block rounded-[24px] bg-brand p-5 text-brand-ink">
      <div class="flex items-center justify-between text-[13px] font-semibold text-on-brand-2">
        <span>Before your {{ dayDate(nextPay.date) }} payday</span>
        <span class="rounded-full bg-white/14 px-2.5 py-1 text-[12px] font-bold text-white">{{ untilPay === 0 ? 'Today' : untilPay === 1 ? 'Tomorrow' : `${untilPay} days` }}</span>
      </div>
      <p class="num mt-2 text-[34px] leading-none font-extrabold tracking-[-0.025em]">{{ peso(win.left) }}</p>
      <p class="mt-1.5 text-[14px] font-medium text-on-brand-2">left to pay before payday</p>

      <div class="mt-5 h-2 overflow-hidden rounded-full bg-white/18" role="progressbar" :aria-valuenow="share" aria-valuemin="0" aria-valuemax="100" aria-label="Share paid before payday">
        <div class="h-full rounded-full bg-white" :style="{ width: share + '%' }" />
      </div>
      <div class="mt-2 flex justify-between text-[13px] font-semibold text-on-brand-2">
        <span class="num">{{ peso(win.paid, { compact: true }) }} of {{ peso(win.due, { compact: true }) }} paid</span>
        <span class="flex items-center gap-0.5 text-white">Payday plan <AltArrowRightIcon :size="16" color="#fff" /></span>
      </div>
    </RouterLink>

    <div v-if="!empty" class="mt-7">
      <GroupList v-if="h.overdue.length" title="Overdue" tone="late" :aside="peso(sum(h.overdue))">
        <OccurrenceRow v-for="o in h.overdue" :key="o.key" :o="o" />
      </GroupList>

      <GroupList title="Next 7 days" :aside="h.week.length ? peso(sum(h.week)) : ''">
        <OccurrenceRow v-for="o in h.week" :key="o.key" :o="o" />
        <p v-if="!h.week.length" class="flex items-center gap-3 px-4 py-5 text-[14px] font-semibold text-ink-2">
          <CheckCircleIcon :size="26" color="var(--paid)" /> Nothing due this week.
        </p>
      </GroupList>

      <GroupList v-if="h.later.length" title="Later" :aside="peso(sum(h.later))">
        <OccurrenceRow v-for="o in h.later" :key="o.key" :o="o" />
      </GroupList>

      <GroupList v-if="h.paid.length" :title="`Paid this month · ${h.paid.length}`">
        <OccurrenceRow v-for="o in h.paid" :key="o.key" :o="o" :show-pay="false" />
      </GroupList>
    </div>
  </div>
</template>

<style scoped>
.summary {
  background:
    radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, #fff 10%, transparent), transparent 60%),
    var(--brand);
  box-shadow: 0 10px 28px -12px color-mix(in oklab, var(--brand) 70%, transparent);
}
</style>
