<script setup>
import EmptyState from '@/components/EmptyState.vue'
import { peso } from '@/lib/money'

const month = new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
</script>

<template>
  <section class="px-4">
    <div class="rounded-3xl bg-brand-700 p-5 text-white">
      <p class="text-sm text-brand-100">Due this month · {{ month }}</p>
      <p class="mt-1 text-3xl font-semibold tabular-nums">{{ peso(0) }}</p>
      <p class="mt-3 text-sm text-brand-100">Nothing overdue. Payapa ka.</p>
    </div>

    <EmptyState icon="bill" title="No bills yet"
                body="Tap + to add your first bill, subscription, or card. Overdue and upcoming items will show here." />
  </section>
</template>
