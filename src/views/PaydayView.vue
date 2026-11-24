<script setup>
import { ref, computed } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { nextPayday, daysUntil } from '@/lib/paydays'
import { peso } from '@/lib/money'

const next = nextPayday()
const bucket = ref(next.bucket)
const label = computed(() => next.date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }))
const days = daysUntil(next.date)
</script>

<template>
  <section class="px-4">
    <p class="mb-3 text-sm text-stone-500 dark:text-stone-400">
      Next payday: <span class="font-medium text-stone-900 dark:text-stone-100">{{ label }}</span>
      · {{ days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days` }}
    </p>

    <div class="grid grid-cols-2 rounded-2xl bg-stone-200/70 p-1 dark:bg-stone-800" role="tablist">
      <button v-for="b in ['15', '30']" :key="b" role="tab" :aria-selected="bucket === b"
              class="h-11 rounded-xl text-sm font-medium"
              :class="bucket === b ? 'bg-white shadow-sm dark:bg-stone-950' : 'text-stone-500 dark:text-stone-400'"
              @click="bucket = b">
        {{ b === '15' ? '15th' : '30th' }} payday
      </button>
    </div>

    <dl class="mt-4 grid grid-cols-3 gap-2 text-center">
      <div v-for="s in ['Due', 'Paid', 'Left']" :key="s" class="rounded-2xl bg-white p-3 dark:bg-stone-900">
        <dt class="text-xs text-stone-500 dark:text-stone-400">{{ s }}</dt>
        <dd class="mt-0.5 font-semibold tabular-nums">{{ peso(0) }}</dd>
      </div>
    </dl>

    <EmptyState icon="payday" :title="`Nothing on the ${bucket === '15' ? '15th' : '30th'} yet`"
                body="Items due from the 15th to the 29th go to the 15th payday. Items due from the 30th to the 14th go to the 30th." />
  </section>
</template>
