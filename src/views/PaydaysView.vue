<script setup>
import { computed } from 'vue'
import { useMoney } from '@/stores/money'
import GroupList from '@/components/GroupList.vue'
import { paydayForDue } from '@/lib/payday'
import { dueDates } from '@/lib/recurrence'
import { addDays } from '@/lib/dates'

const money = useMoney()

// Each item's next due: its earliest unpaid occurrence, else its next date on or after today.
function nextDue(item) {
  const unpaid = money.occurrences.find((o) => o.type === 'item' && o.id === item.id && o.status !== 'paid')
  return unpaid?.due ?? dueDates(item, addDays(money.today, 800)).find((d) => d.due >= money.today)?.due ?? null
}

const counts = computed(() => {
  const n = { 15: 0, 30: 0 }
  for (const item of money.activeItems) {
    const due = nextDue(item)
    if (due) n[paydayForDue(due, item.paydayBucket).bucket]++
  }
  return n
})
const plural = (n) => `${n} ${n === 1 ? 'item' : 'items'}`
const rows = computed(() => [
  { key: '15', title: '15th payday', covers: 'covers bills due on the 15th–29th', n: counts.value['15'] },
  { key: '30', title: '30th payday', covers: 'covers bills due on the 30th–14th', n: counts.value['30'] },
])
</script>

<template>
  <div class="px-4">
    <GroupList>
      <div v-for="r in rows" :key="r.key" class="prow flex min-h-16 items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="text-[15px] font-semibold">{{ r.title }}</p>
          <p class="text-[13px] font-medium text-ink-2">{{ r.covers }}</p>
        </div>
        <span class="num text-[14px] font-semibold text-ink-2">{{ plural(r.n) }}</span>
      </div>
    </GroupList>
    <p class="mt-4 px-1 text-[13px] font-medium text-ink-2">To move a bill to the other payday, edit it and change Payday.</p>
  </div>
</template>

<style scoped>
.prow + .prow { background: linear-gradient(var(--hairline), var(--hairline)) right top / calc(100% - 2rem) 1px no-repeat; }
</style>
