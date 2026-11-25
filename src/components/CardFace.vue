<script setup>
import { computed } from 'vue'
import { peso, shortDate } from '@/lib/format'

const props = defineProps({ card: Object, occ: Object, compact: Boolean })
const tones = {
  navy: ['#14305e', '#0c1f40'],
  graphite: ['#3a3f47', '#1f2328'],
  lime: ['#cfe94a', '#a9c92a'],
  orange: ['#f0672a', '#d4491a'],
  ink: ['#1b1d22', '#0d0e11'],
}
const t = computed(() => tones[props.card.tone] ?? tones.ink)
const light = computed(() => props.card.tone === 'lime')
const statusText = computed(() => {
  const o = props.occ
  if (!o) return ''
  if (o.status === 'paid') return 'Paid in full'
  if (o.status === 'minimum') return 'Min paid'
  if (o.status === 'partial') return `${peso(o.paid, { compact: true })} paid`
  return o.overdue ? 'Overdue' : 'Unpaid'
})
</script>

<template>
  <div class="face relative overflow-hidden rounded-[22px] p-5" :class="[light ? 'text-[#1a1f08]' : 'text-white', compact ? 'aspect-[1.9]' : 'aspect-[1.66]']"
       :style="{ '--a': t[0], '--b': t[1] }">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-[16px] font-extrabold tracking-tight">{{ card.name }}</p>
        <p class="text-[12px] font-semibold opacity-70">{{ card.type === 'pay_later' ? 'Pay later' : 'Credit card' }}<template v-if="card.last4"> · •••• {{ card.last4 }}</template></p>
      </div>
      <span v-if="occ" class="rounded-full px-2.5 py-1 text-[11px] font-extrabold"
            :class="occ.overdue ? 'bg-[#ffe1dc] text-[#9b2219]' : occ.status === 'paid' ? 'bg-[#dff5e8] text-[#17633f]' : light ? 'bg-black/10' : 'bg-white/16'">
        {{ statusText }}
      </span>
    </div>
    <div class="absolute inset-x-5 bottom-5 flex items-end justify-between">
      <div>
        <p class="text-[12px] font-semibold opacity-70">Statement balance</p>
        <p v-if="occ" class="num text-[26px] leading-tight font-extrabold tracking-[-0.02em]">{{ peso(occ.amount) }}</p>
        <p v-else class="text-[17px] leading-tight font-extrabold">No statement yet</p>
      </div>
      <div v-if="occ" class="text-right">
        <p class="text-[12px] font-semibold opacity-70">Due</p>
        <p class="text-[15px] font-extrabold">{{ shortDate(occ.due) }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.face {
  background:
    radial-gradient(140% 120% at 0% 0%, color-mix(in oklab, #fff 14%, transparent), transparent 55%),
    linear-gradient(150deg, var(--a), var(--b));
  box-shadow: 0 12px 24px -14px color-mix(in oklab, var(--b) 80%, transparent), 0 1px 2px rgba(0,0,0,.1);
}
</style>
