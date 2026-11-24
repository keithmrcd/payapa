<script setup>
import { ref, computed } from 'vue'
import { useMoney } from '@/stores/money'
import GroupList from '@/components/GroupList.vue'
import CategoryTile from '@/components/CategoryTile.vue'
import { peso, shortDate, monthName } from '@/lib/format'

const money = useMoney()
const filters = [['all', 'All'], ['bill', 'Bills'], ['subscription', 'Subscriptions'], ['credit_card', 'Cards'], ['pay_later', 'Pay later'], ['loan', 'Loans']]
const f = ref('all')
const rows = computed(() => money.history.filter((p) => f.value === 'all' || p.kind === f.value))
const months = computed(() => {
  const g = new Map()
  for (const p of rows.value) {
    const k = p.paidOn.slice(0, 7)
    if (!g.has(k)) g.set(k, [])
    g.get(k).push(p)
  }
  return [...g.entries()].map(([k, list]) => ({ k, label: monthName(k + '-01'), list, total: list.reduce((n, p) => n + p.amount, 0) }))
})
</script>

<template>
  <div class="safe-top">
    <header class="px-4 pt-3 pb-4">
      <h1 class="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">History</h1>
      <p class="mt-0.5 text-[14px] font-medium text-ink-2">Every payment you've marked</p>
    </header>

    <div class="flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Filter payments">
      <button v-for="x in filters" :key="x[0]" type="button" role="radio" :aria-checked="f === x[0]"
              class="h-9 shrink-0 rounded-full px-4 text-[14px] font-bold transition-colors"
              :class="f === x[0] ? 'bg-ink text-ground' : 'bg-surface text-ink-2'" @click="f = x[0]">{{ x[1] }}</button>
    </div>

    <div class="mt-5 px-4">
      <GroupList v-for="m in months" :key="m.k" :title="m.label" :aside="peso(m.total)">
        <ul>
          <li v-for="p in m.list" :key="p.id" class="hrow flex min-h-[68px] items-center gap-3 pr-4 pl-4">
            <CategoryTile :category="p.category" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[15px] font-semibold">{{ p.name }}</span>
              <span class="block truncate text-[13px] font-medium text-ink-2">{{ shortDate(p.paidOn) }} · {{ money.account(p.account)?.short }}<template v-if="p.referenceNo"> · Ref {{ p.referenceNo }}</template></span>
            </span>
            <span class="num text-[15px] font-bold">{{ peso(p.amount) }}</span>
          </li>
        </ul>
      </GroupList>
      <p v-if="!months.length" class="px-4 py-12 text-center text-[14px] font-medium text-ink-2">No payments in this category yet.</p>
    </div>
  </div>
</template>

<style scoped>
.hrow + .hrow { background: linear-gradient(var(--hairline), var(--hairline)) right top / calc(100% - 4.75rem) 1px no-repeat; }
</style>
