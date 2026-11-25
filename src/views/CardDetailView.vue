<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'
import CardFace from '@/components/CardFace.vue'
import GroupList from '@/components/GroupList.vue'
import StatusChip from '@/components/StatusChip.vue'
import { DocumentTextIcon } from '@/lib/icons'
import { peso, shortDate, dayDate, ordinal } from '@/lib/format'

const route = useRoute()
const money = useMoney()
const ui = useUi()
const card = computed(() => money.cards.find((c) => c.id === route.params.id))
const occ = computed(() => money.occurrences.find((o) => o.type === 'card' && o.id === route.params.id))
const pays = computed(() => money.history.filter((p) => p.ref === occ.value?.ref))
const installments = computed(() => money.installments.filter((i) => i.cardId === route.params.id && !i.archivedAt))
const monthlyInstallments = computed(() => installments.value.reduce((n, i) => n + i.monthly, 0))
</script>

<template>
  <div v-if="card" class="px-4">
    <CardFace :card="card" :occ="occ" />

    <div v-if="occ" class="mt-4 flex items-center gap-3">
      <StatusChip :status="occ.status" :overdue="occ.overdue" />
      <span class="flex-1 text-[13px] font-semibold text-ink-2">{{ occ.status === 'paid' ? 'Nothing left this cycle' : `${peso(occ.left)} left · due ${dayDate(occ.due)}` }}</span>
    </div>
    <button v-if="occ && occ.status !== 'paid'" type="button" class="mt-4 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="ui.openPay(occ)">
      Mark a payment
    </button>

    <GroupList v-if="occ && card.statement" title="This cycle" class="!mt-7">
      <dl class="divide-y divide-hairline text-[15px]">
        <div class="flex min-h-13 items-center justify-between px-4 py-3"><dt class="font-medium text-ink-2">Statement date</dt><dd class="font-semibold">{{ shortDate(card.statement.date) }}</dd></div>
        <div class="flex min-h-13 items-center justify-between px-4 py-3"><dt class="font-medium text-ink-2">Due date</dt><dd class="font-semibold">{{ dayDate(card.statement.due) }}</dd></div>
        <div class="flex min-h-13 items-center justify-between px-4 py-3"><dt class="font-medium text-ink-2">Statement balance</dt><dd class="num font-bold">{{ peso(card.statement.balance) }}</dd></div>
        <div v-if="card.statement.minimum < card.statement.balance" class="flex min-h-13 items-center justify-between px-4 py-3"><dt class="font-medium text-ink-2">Minimum due</dt><dd class="num font-semibold">{{ peso(card.statement.minimum) }}</dd></div>
        <div class="flex min-h-13 items-center justify-between px-4 py-3"><dt class="font-medium text-ink-2">Paid so far</dt><dd class="num font-bold text-paid">{{ peso(occ.paid) }}</dd></div>
      </dl>
    </GroupList>

    <GroupList v-if="installments.length" title="Installments" :aside="`${peso(monthlyInstallments)}/mo`">
      <ul class="divide-y divide-hairline">
        <li v-for="i in installments" :key="i.id" class="px-4 py-3.5">
          <div class="flex items-baseline justify-between gap-3">
            <span class="text-[15px] font-semibold">{{ i.name }}</span>
            <span class="num shrink-0 text-[15px] font-bold">{{ peso(i.monthly) }}</span>
          </div>
          <div class="mt-2 flex items-center gap-3">
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div class="h-full rounded-full bg-brand" :style="{ width: (i.paid / i.total) * 100 + '%' }" />
            </div>
            <span class="num shrink-0 text-[13px] font-semibold text-ink-2">{{ i.paid }} of {{ i.total }} paid · {{ peso((i.total - i.paid) * i.monthly, { compact: true }) }} left</span>
          </div>
        </li>
      </ul>
    </GroupList>

    <GroupList v-if="occ" title="Payments this cycle">
      <ul v-if="pays.length" class="divide-y divide-hairline">
        <li v-for="p in pays" :key="p.id" class="flex items-center justify-between px-4 py-3.5">
          <span>
            <span class="block text-[15px] font-semibold">{{ dayDate(p.paidOn) }}</span>
            <span class="block text-[13px] font-medium text-ink-2">from {{ money.account(p.account)?.name }}<template v-if="p.note"> · {{ p.note }}</template></span>
          </span>
          <span class="num text-[15px] font-bold">{{ peso(p.amount) }}</span>
        </li>
      </ul>
      <p v-else class="px-4 py-4 text-[14px] font-medium text-ink-2">No payments yet this cycle.</p>
    </GroupList>

    <p v-if="!occ" class="mt-6 px-1 text-center text-[14px] font-medium text-ink-2">Statements arrive in a later update.</p>
    <button v-if="occ" type="button" class="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-brand-text">
      <DocumentTextIcon :size="22" color="var(--brand-text)" /> Enter next statement
    </button>
    <p class="mt-3 px-1 text-center text-[13px] font-medium text-ink-3">Statement on the {{ ordinal(card.statementDay) }}, due on the {{ ordinal(card.dueDay) }} of each month.</p>
  </div>
</template>
