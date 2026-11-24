<script setup>
import { ref, computed } from 'vue'
import { useMoney, daysBetween } from '@/stores/money'
import GroupList from '@/components/GroupList.vue'
import OccurrenceRow from '@/components/OccurrenceRow.vue'
import { peso, shortDate, dayDate } from '@/lib/format'

const money = useMoney()
const sel = ref(1) // default to the next payday
const p = computed(() => money.paydays[sel.value])
const s = computed(() => money.periodSummary(p.value))
const open = computed(() => s.value.list.filter((o) => o.status !== 'paid'))
const done = computed(() => s.value.list.filter((o) => o.status === 'paid'))
const pct = computed(() => (s.value.due ? Math.round((s.value.paid / s.value.due) * 100) : 0))
const label = (x) => `${shortDate(x.date)} payday`
const when = computed(() => {
  const n = daysBetween(money.today, p.value.date)
  return n > 0 ? `in ${n} days` : n === 0 ? 'today' : `${-n} days ago`
})
</script>

<template>
  <div class="safe-top px-4">
    <header class="pt-3 pb-4">
      <h1 class="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">Payday</h1>
      <p class="mt-0.5 text-[14px] font-medium text-ink-2">What each salary has to cover</p>
    </header>

    <div class="grid grid-cols-2 gap-1 rounded-2xl bg-[color-mix(in_oklab,var(--ink)_6%,var(--ground))] p-1" role="tablist" aria-label="Payday">
      <button v-for="(x, i) in money.paydays" :key="x.date" type="button" role="tab" :aria-selected="sel === i"
              class="h-11 rounded-xl text-[14px] font-bold transition-colors"
              :class="sel === i ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]' : 'text-ink-2'"
              @click="sel = i">{{ label(x) }}</button>
    </div>

    <section class="mt-4 rounded-[24px] bg-surface p-5" aria-live="polite">
      <p class="text-[13px] font-semibold text-ink-2">{{ dayDate(p.date) }} · {{ when }}</p>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="num text-[32px] leading-none font-extrabold tracking-[-0.025em]">{{ peso(s.left) }}</span>
        <span class="text-[14px] font-semibold text-ink-2">left to pay</span>
      </div>

      <div class="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div class="rounded-full bg-paid" :style="{ width: pct + '%' }" />
      </div>
      <dl class="mt-3 grid grid-cols-2 text-[13px]">
        <div>
          <dt class="font-semibold text-ink-2">Paid</dt>
          <dd class="num font-bold text-paid">{{ peso(s.paid) }}</dd>
        </div>
        <div class="text-right">
          <dt class="font-semibold text-ink-2">Total due</dt>
          <dd class="num font-bold">{{ peso(s.due) }}</dd>
        </div>
      </dl>
      <p class="mt-4 border-t border-hairline pt-3 text-[13px] font-medium text-ink-2">
        Covers everything due {{ shortDate(p.from) }} to {{ shortDate(p.to) }}.
      </p>
    </section>

    <div class="mt-7">
      <GroupList v-if="open.length" title="To pay" :aside="`${open.length} ${open.length === 1 ? 'item' : 'items'}`">
        <OccurrenceRow v-for="o in open" :key="o.key" :o="o" />
      </GroupList>
      <GroupList v-if="done.length" title="Paid">
        <OccurrenceRow v-for="o in done" :key="o.key" :o="o" :show-pay="false" />
      </GroupList>
      <p v-if="!s.list.length" class="px-4 py-10 text-center text-[14px] font-medium text-ink-2">Nothing is due in this payday's window.</p>
    </div>
  </div>
</template>
