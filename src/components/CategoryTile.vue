<script setup>
import { computed } from 'vue'
import * as I from '@/lib/icons'

const props = defineProps({ category: String, size: { type: String, default: 'md' } })

// One hue per category. The tile is a soft tint; the duotone icon carries the full hue.
const map = {
  electricity: { icon: I.BoltIcon, hue: '#6d5bd0' },
  water: { icon: I.WaterdropIcon, hue: '#1596bf' },
  internet: { icon: I.WiFiRouterIcon, hue: '#2f6fd8' },
  phone: { icon: I.SmartphoneIcon, hue: '#2a8a74' },
  loan: { icon: I.HandMoneyIcon, hue: '#4c7a2a' },
  video: { icon: I.TvIcon, hue: '#a8397f' },
  music: { icon: I.MusicNoteIcon, hue: '#1f9d55' },
  cloud: { icon: I.CloudIcon, hue: '#3b82c4' },
  credit_card: { icon: I.CardIcon, hue: '#1d3d7a' },
  pay_later: { icon: I.Bag4Icon, hue: '#56688e' },
  bill: { icon: I.BillListIcon, hue: '#5b6470' },
}
const m = computed(() => map[props.category] ?? map.bill)
const box = computed(() => (props.size === 'lg' ? 'size-14 rounded-[18px]' : props.size === 'sm' ? 'size-9 rounded-xl' : 'size-11 rounded-[14px]'))
const icon = computed(() => (props.size === 'lg' ? 30 : props.size === 'sm' ? 20 : 24))
</script>

<template>
  <span class="tile grid shrink-0 place-items-center" :class="box" :style="{ '--hue': m.hue }" aria-hidden="true">
    <component :is="m.icon" :size="icon" color="var(--hue)" />
  </span>
</template>

<style scoped>
.tile { background: color-mix(in oklab, var(--hue) 13%, var(--surface)); }
@media (prefers-color-scheme: dark) {
  .tile { background: color-mix(in oklab, var(--hue) 24%, var(--surface)); --hue-l: 1; }
  .tile :deep(svg) { filter: brightness(1.45) saturate(.9); }
}
</style>
