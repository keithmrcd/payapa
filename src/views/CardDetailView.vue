<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'
import CardFace from '@/components/CardFace.vue'
import GroupList from '@/components/GroupList.vue'
import StatusChip from '@/components/StatusChip.vue'
import ConfirmSheet from '@/components/ConfirmSheet.vue'
import { DocumentTextIcon, PenIcon, ArchiveIcon } from '@/lib/icons'
import { peso, dayDate, ordinal } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const money = useMoney()
const ui = useUi()
const card = computed(() => money.cards.find((c) => c.id === route.params.id))
const occ = computed(() => money.occurrences.find((o) => o.type === 'card' && o.id === route.params.id))
const pays = computed(() => money.history.filter((p) => p.ref === occ.value?.ref))
const installments = computed(() => money.installments.filter((i) => i.cardId === route.params.id && !i.archivedAt))
const monthlyInstallments = computed(() => installments.value.reduce((n, i) => n + i.monthly, 0))
const archived = computed(() => !!card.value?.archivedAt)

const confirmOpen = ref(false)
let archiving = false
async function archive() {
  confirmOpen.value = false
  if (archiving || card.value.archivedAt) return
  archiving = true
  const { id, name } = card.value
  try {
    await money.archiveCard(id)
  } catch {
    ui.showToast("Couldn't archive. Try again.")
    return
  } finally {
    archiving = false
  }
  router.replace('/cards')
  ui.showToast(`${name} archived`, async () => {
    try { await money.unarchiveCard(id) } catch { ui.showToast("Couldn't undo. Try again.") }
  })
}
</script>

<template>
  <div v-if="card" class="px-4">
    <CardFace :card="card" :occ="occ" />

    <div v-if="occ" class="mt-4 flex items-center gap-3">
      <StatusChip :status="occ.status" :overdue="occ.overdue" />
      <span class="flex-1 text-[13px] font-semibold text-ink-2">{{ occ.status === 'paid' ? 'Nothing left this cycle' : `${peso(occ.left)} left · due ${dayDate(occ.due)}` }}</span>
    </div>
    <button v-if="occ && occ.status !== 'paid' && !archived" type="button" class="mt-4 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="ui.openPay(occ)">
      Mark a payment
    </button>

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

    <p v-if="archived" class="mt-6 px-1 text-center text-[14px] font-medium text-ink-2">Archived. Past payments stay in History.</p>
    <p v-else-if="!occ" class="mt-6 px-1 text-center text-[14px] font-medium text-ink-2">Statements arrive in a later update.</p>
    <button v-if="occ && !archived" type="button" class="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-brand-text">
      <DocumentTextIcon :size="22" color="var(--brand-text)" /> Enter next statement
    </button>
    <p class="mt-3 px-1 text-center text-[13px] font-medium text-ink-3">Statement on the {{ ordinal(card.statementDay) }}, due on the {{ ordinal(card.dueDay) }} of each month.</p>

    <div v-if="!archived" class="mt-6 grid grid-cols-2 gap-3">
      <button type="button" class="flex h-13 items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-ink" @click="ui.openEdit({ type: 'card', id: card.id })"><PenIcon :size="20" color="var(--ink-2)" /> Edit</button>
      <button type="button" class="flex h-13 items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-ink-2" @click="confirmOpen = true"><ArchiveIcon :size="20" color="var(--ink-3)" /> Archive</button>
    </div>

    <ConfirmSheet :open="confirmOpen" :title="`Archive ${card.name}?`" body="It leaves the Cards tab. Past payments stay in History." :confirm-label="`Archive ${card.name}`" @confirm="archive" @close="confirmOpen = false" />
  </div>
</template>
