<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CategoryTile from './CategoryTile.vue'
import { CheckCircleIcon } from '@/lib/icons'
import { peso, dueLabel } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'

const props = defineProps({ o: { type: Object, required: true }, showPay: { type: Boolean, default: true } })
const ui = useUi()
const money = useMoney()

const to = computed(() => (props.o.type === 'card' ? `/cards/${props.o.id}` : `/items/${props.o.id}`))
const meta = computed(() => {
  const o = props.o
  const parts = [dueLabel(o)]
  if (o.status === 'partial') parts.push(`${peso(o.paid, { compact: true })} paid`)
  else if (o.status === 'minimum') parts.push('Min paid')
  else if (o.minimum && o.minimum < o.amount && o.status === 'unpaid') parts.push(`Min ${peso(o.minimum, { compact: true })}`)
  else if (o.status === 'paid' && money.account(o.account)) parts.push(`from ${money.account(o.account).short}`)
  if (o.variable && o.status !== 'paid') parts.push('Estimate')
  return parts
})
</script>

<template>
  <div class="row flex min-h-[72px] items-center gap-3 pr-3 pl-4">
    <RouterLink :to="to" class="flex min-w-0 flex-1 items-center gap-3 py-3">
      <CategoryTile :category="o.category" />
      <span class="min-w-0 flex-1">
        <span class="block line-clamp-2 text-[15px] leading-snug font-semibold text-ink">{{ o.name }}</span>
        <span class="mt-0.5 block truncate text-[13px] font-medium text-ink-2">
          <span :class="{ 'font-bold text-late': o.overdue, 'font-semibold text-due': !o.overdue && o.daysLeft <= 3 && o.status !== 'paid' }">{{ meta[0] }}</span>
          <template v-for="m in meta.slice(1)" :key="m"> · {{ m }}</template>
        </span>
      </span>
      <span class="num text-right text-[15px] font-bold" :class="o.status === 'paid' ? 'text-ink-3' : 'text-ink'">
        {{ peso(o.status === 'paid' ? o.amount : o.left) }}
      </span>
    </RouterLink>
    <button v-if="showPay && o.status !== 'paid'" type="button"
            class="h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold transition-colors active:scale-[.97]"
            :class="o.overdue ? 'bg-brand text-brand-ink active:bg-brand-deep' : 'bg-brand-soft text-brand-text active:bg-[color-mix(in_oklab,var(--brand)_22%,var(--surface))]'"
            :aria-label="`Mark ${o.name} paid`" @click="ui.openPay(o)">
      Pay
    </button>
    <CheckCircleIcon v-else-if="o.status === 'paid'" :size="26" color="var(--paid)" class="mr-1 shrink-0" aria-label="Paid" />
  </div>
</template>

<style scoped>
/* Hairline between rows, inset to start after the icon tile. */
.row + .row {
  background-image: linear-gradient(var(--hairline), var(--hairline));
  background-size: calc(100% - 4.75rem) 1px;
  background-position: right top;
  background-repeat: no-repeat;
}
</style>
