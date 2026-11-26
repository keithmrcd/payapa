<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'
import CardFace from '@/components/CardFace.vue'
import GroupList from '@/components/GroupList.vue'
import StatusChip from '@/components/StatusChip.vue'
import ConfirmSheet from '@/components/ConfirmSheet.vue'
import { DocumentTextIcon, PenIcon, ArchiveIcon, AddIcon, AltArrowDownIcon } from '@/lib/icons'
import { peso, dayDate, shortDate, ordinal } from '@/lib/format'
import { toDate } from '@/lib/dates'
import { currentStatement } from '@/lib/occurrences'
import { installmentProgress } from '@/lib/cards'

const route = useRoute()
const router = useRouter()
const money = useMoney()
const ui = useUi()
const card = computed(() => money.cards.find((c) => c.id === route.params.id))
const occ = computed(() => currentStatement(money.occurrences, route.params.id))
const missing = computed(() => money.occurrences.find((o) => o.type === 'card' && o.id === route.params.id && o.needsStatement))
const pays = computed(() => (occ.value && !occ.value.needsStatement ? money.history.filter((p) => p.ref === occ.value.ref) : []))
const archived = computed(() => !!card.value?.archivedAt)
const monthOf = (d) => toDate(d).toLocaleDateString('en-US', { month: 'short' })

// Every entered statement, newest first, with its status from the occurrences.
const statements = computed(() => money.occurrences
  .filter((o) => o.type === 'card' && o.id === route.params.id && !o.needsStatement)
  .sort((a, b) => (a.statementDate < b.statementDate ? 1 : -1)))

const plans = computed(() => (card.value ? money.installments
  .filter((i) => i.cardId === card.value.id)
  .map((i) => ({ ...i, progress: installmentProgress(i, card.value, money.today) })) : []))
const activePlans = computed(() => plans.value.filter((i) => !i.progress.done))
const finishedPlans = computed(() => plans.value.filter((i) => i.progress.done))
const monthlyInstallments = computed(() => activePlans.value.reduce((n, i) => n + i.monthlyAmount, 0))
const showFinished = ref(false)

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

    <button v-if="missing && !archived" type="button" class="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="ui.openStatement({ cardId: card.id })">
      <DocumentTextIcon :size="22" color="currentColor" /> Enter {{ monthOf(missing.statementDate) }} statement
    </button>

    <template v-if="occ && !occ.needsStatement">
      <div class="mt-4 flex items-center gap-3">
        <StatusChip :status="occ.status" :overdue="occ.overdue" />
        <span class="flex-1 text-[13px] font-semibold text-ink-2">{{ occ.status === 'paid' ? 'Nothing left on this statement' : `${peso(occ.left)} left · due ${dayDate(occ.due)}` }}</span>
      </div>
      <button v-if="occ.status !== 'paid' && !archived" type="button" class="mt-4 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="ui.openPay(occ)">
        Mark a payment
      </button>
    </template>

    <GroupList v-if="occ && !occ.needsStatement" :title="`Payments on the ${monthOf(occ.statementDate)} statement`">
      <ul v-if="pays.length" class="divide-y divide-hairline">
        <li v-for="p in pays" :key="p.id">
          <button type="button" class="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3.5 text-left" @click="ui.openPayment(p)">
            <span class="min-w-0">
              <span class="block text-[15px] font-semibold">{{ dayDate(p.paidOn) }}</span>
              <span class="block truncate text-[13px] font-medium text-ink-2">from {{ money.account(p.account)?.name }}<template v-if="p.referenceNo"> · Ref {{ p.referenceNo }}</template><template v-if="p.note"> · {{ p.note }}</template></span>
            </span>
            <span class="num shrink-0 text-[15px] font-bold">{{ peso(p.amount) }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="px-4 py-4 text-[14px] font-medium text-ink-2">No payments on this statement yet.</p>
    </GroupList>

    <GroupList v-if="!archived || plans.length" title="Installments" :aside="activePlans.length ? `${peso(monthlyInstallments)}/mo` : ''">
      <ul class="divide-y divide-hairline">
        <li v-for="i in activePlans" :key="i.id">
          <button type="button" class="block w-full px-4 py-3.5 text-left" :disabled="archived" @click="ui.openInstallment({ cardId: card.id, installmentId: i.id })">
            <span class="flex items-baseline justify-between gap-3">
              <span class="text-[15px] font-semibold">{{ i.description }}</span>
              <span class="num shrink-0 text-[15px] font-bold">{{ peso(i.monthlyAmount) }}</span>
            </span>
            <span class="mt-2 flex items-center gap-3">
              <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <span class="block h-full rounded-full bg-brand" :style="{ width: (i.progress.paid / i.progress.months) * 100 + '%' }" />
              </span>
              <span class="num shrink-0 text-[13px] font-semibold text-ink-2">{{ i.progress.paid }} of {{ i.progress.months }} paid · {{ peso(i.progress.left, { compact: true }) }} left</span>
            </span>
          </button>
        </li>
        <li v-if="finishedPlans.length">
          <button type="button" class="flex min-h-13 w-full items-center justify-between px-4 text-left text-[15px] font-semibold text-ink-2" :aria-expanded="showFinished" @click="showFinished = !showFinished">
            {{ finishedPlans.length }} finished
            <AltArrowDownIcon :size="20" color="var(--ink-3)" :class="showFinished && 'rotate-180'" class="transition-transform" />
          </button>
        </li>
        <template v-if="showFinished">
          <li v-for="i in finishedPlans" :key="i.id">
            <button type="button" class="flex min-h-13 w-full items-center justify-between gap-3 px-4 text-left" :disabled="archived" @click="ui.openInstallment({ cardId: card.id, installmentId: i.id })">
              <span class="text-[15px] font-semibold text-ink-2">{{ i.description }}</span>
              <span class="num text-[13px] font-semibold text-ink-3">{{ i.progress.months }} of {{ i.progress.months }} paid</span>
            </button>
          </li>
        </template>
        <li v-if="!archived">
          <button type="button" class="flex min-h-13 w-full items-center gap-2 px-4 text-left text-[15px] font-bold text-brand-text" @click="ui.openInstallment({ cardId: card.id })">
            <AddIcon :size="20" color="var(--brand-text)" /> Add installment
          </button>
        </li>
      </ul>
    </GroupList>

    <GroupList v-if="statements.length" title="Statements">
      <ul class="divide-y divide-hairline">
        <li v-for="s in statements" :key="s.ref">
          <button type="button" class="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 text-left" @click="ui.openStatement({ cardId: card.id, statementId: s.statementId })">
            <span class="min-w-0">
              <span class="block text-[15px] font-semibold">{{ monthOf(s.statementDate) }} statement</span>
              <span class="block text-[13px] font-medium text-ink-2">Due {{ shortDate(s.due) }}</span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-1">
              <span class="num text-[15px] font-bold">{{ peso(s.amount) }}</span>
              <StatusChip :status="s.status" :overdue="s.overdue" />
            </span>
          </button>
        </li>
      </ul>
    </GroupList>

    <button v-if="!missing && !archived" type="button" class="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-brand-text" @click="ui.openStatement({ cardId: card.id })">
      <DocumentTextIcon :size="22" color="var(--brand-text)" /> Enter next statement
    </button>
    <p v-if="archived" class="mt-6 px-1 text-center text-[14px] font-medium text-ink-2">Archived. Past payments stay in History.</p>
    <p class="mt-3 px-1 text-center text-[13px] font-medium text-ink-3">Statement on the {{ ordinal(card.statementDay) }}, due on the {{ ordinal(card.dueDay) }} of each month.</p>

    <div v-if="!archived" class="mt-6 grid grid-cols-2 gap-3">
      <button type="button" class="flex h-13 items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-ink" @click="ui.openEdit({ type: 'card', id: card.id })"><PenIcon :size="20" color="var(--ink-2)" /> Edit</button>
      <button type="button" class="flex h-13 items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-ink-2" @click="confirmOpen = true"><ArchiveIcon :size="20" color="var(--ink-3)" /> Archive</button>
    </div>

    <ConfirmSheet :open="confirmOpen" :title="`Archive ${card.name}?`" body="It leaves the Cards tab. Past payments stay in History." :confirm-label="`Archive ${card.name}`" @confirm="archive" @close="confirmOpen = false" />
  </div>
</template>
