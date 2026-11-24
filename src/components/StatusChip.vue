<script setup>
import { computed } from 'vue'
const props = defineProps({ status: String, overdue: Boolean })
const s = computed(() => {
  if (props.status === 'paid') return { t: 'Paid in full', c: 'bg-paid-soft text-paid' }
  if (props.status === 'minimum') return { t: 'Min paid', c: 'bg-due-soft text-due' }
  if (props.status === 'partial') return { t: 'Partly paid', c: 'bg-due-soft text-due' }
  if (props.overdue) return { t: 'Overdue', c: 'bg-late-soft text-late' }
  return { t: 'Unpaid', c: 'bg-surface-2 text-ink-2' }
})
</script>

<template>
  <span class="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold" :class="s.c">{{ s.t }}</span>
</template>
