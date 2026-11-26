<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CategoryTile from './CategoryTile.vue'
import { CheckCircleIcon } from '@/lib/icons'
import { peso, dueLabel } from '@/lib/format'
import { swipeAxis, swipeRelease, clickGuard, THRESHOLD } from '@/lib/swipe'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'

const props = defineProps({ o: { type: Object, required: true }, showPay: { type: Boolean, default: true } })
const ui = useUi()
const money = useMoney()

const to = computed(() => (props.o.type === 'card' ? `/cards/${props.o.id}` : `/items/${props.o.id}`))
const meta = computed(() => {
  const o = props.o
  const parts = [dueLabel(o)]
  if (o.needsStatement) return [...parts, 'Statement not entered']
  if (o.status === 'partial') parts.push(`${peso(o.paid, { compact: true })} paid`)
  else if (o.status === 'minimum') parts.push('Min paid')
  else if (o.minimum && o.minimum < o.amount && o.status === 'unpaid') parts.push(`Min ${peso(o.minimum, { compact: true })}`)
  else if (o.status === 'paid' && money.account(o.account)) parts.push(`from ${money.account(o.account).short}`)
  if (o.variable && o.status !== 'paid') parts.push('Estimate')
  return parts
})

// Swipe right to open the pay sheet. The Pay button stays as the accessible path.
const swipeable = computed(() => props.showPay && props.o.status !== 'paid' && !props.o.needsStatement)
const offset = ref(0)
const dragging = ref(false)
let g = null // the current gesture: { x, y, t, axis, dx }
const guard = clickGuard()
function down(e) {
  if (!swipeable.value || e.button !== 0) return
  g = { x: e.clientX, y: e.clientY, t: e.timeStamp, axis: 'idle', dx: 0 }
}
function move(e) {
  if (!g || g.axis === 'scroll') return
  const dx = e.clientX - g.x
  if (g.axis === 'idle') {
    g.axis = swipeAxis(dx, e.clientY - g.y)
    if (g.axis !== 'track') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    guard.swiped()
    dragging.value = true
  }
  g.dx = Math.max(0, dx)
  // Past the threshold the row follows with resistance, up to 160px.
  offset.value = g.dx <= THRESHOLD ? g.dx : Math.min(160, THRESHOLD + (g.dx - THRESHOLD) * 0.35)
}
function up(e) {
  if (g?.axis === 'track' && swipeRelease({ dx: g.dx, ms: e.timeStamp - g.t }) === 'pay') ui.openPay(props.o)
  cancel()
}
function cancel() {
  guard.released()
  g = null
  dragging.value = false
  offset.value = 0
}
// A drag that became a swipe must not also open the detail page.
function guardClick(e) {
  if (!guard.consume()) return
  e.preventDefault()
  e.stopPropagation()
}
</script>

<template>
  <div class="row relative overflow-hidden">
    <div v-if="offset > 0" class="absolute inset-0 flex items-center bg-brand pl-6 text-[15px] font-bold text-brand-ink" aria-hidden="true">Pay</div>
    <div class="relative flex min-h-[72px] items-center gap-3 bg-surface pr-3 pl-4"
         :class="[{ 'transition-transform duration-200 ease-out motion-reduce:transition-none': !dragging }, swipeable && 'swipe']"
         :style="offset ? { transform: `translateX(${offset}px)` } : null"
         @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="cancel" @click.capture="guardClick">
      <RouterLink :to="to" draggable="false" class="flex min-w-0 flex-1 items-center gap-3 py-3">
        <CategoryTile :category="o.category" />
        <span class="min-w-0 flex-1">
          <span class="block line-clamp-2 text-[15px] leading-snug font-semibold text-ink">{{ o.name }}</span>
          <span class="mt-0.5 block truncate text-[13px] font-medium text-ink-2">
            <span :class="{ 'font-bold text-late': o.overdue, 'font-semibold text-due': !o.overdue && o.daysLeft <= 3 && o.status !== 'paid' }">{{ meta[0] }}</span>
            <template v-for="m in meta.slice(1)" :key="m"> · {{ m }}</template>
          </span>
        </span>
        <span v-if="!o.needsStatement" class="num text-right text-[15px] font-bold" :class="o.status === 'paid' ? 'text-ink-3' : 'text-ink'">
          {{ peso(o.status === 'paid' ? o.amount : o.left) }}
        </span>
      </RouterLink>
      <button v-if="showPay && o.needsStatement" type="button"
              class="h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold transition-colors active:scale-[.97]"
              :class="o.overdue ? 'bg-brand text-brand-ink active:bg-brand-deep' : 'bg-brand-soft text-brand-text active:bg-[color-mix(in_oklab,var(--brand)_22%,var(--surface))]'"
              :aria-label="`Enter ${o.name} statement`" @click="ui.openStatement({ cardId: o.id })">
        Enter
      </button>
      <button v-else-if="showPay && o.status !== 'paid'" type="button"
              class="h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold transition-colors active:scale-[.97]"
              :class="o.overdue ? 'bg-brand text-brand-ink active:bg-brand-deep' : 'bg-brand-soft text-brand-text active:bg-[color-mix(in_oklab,var(--brand)_22%,var(--surface))]'"
              :aria-label="`Mark ${o.name} paid`" @click="ui.openPay(o)">
        Pay
      </button>
      <CheckCircleIcon v-else-if="o.status === 'paid'" :size="26" color="var(--paid)" class="mr-1 shrink-0" aria-label="Paid" />
    </div>
  </div>
</template>

<style scoped>
.swipe { touch-action: pan-y; }
/* Hairline between rows, inset to start after the icon tile; drawn above the sliding row. */
.row + .row::before {
  content: '';
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  left: 4.75rem;
  height: 1px;
  background: var(--hairline);
}
</style>
