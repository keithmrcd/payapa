<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'
import CategoryTile from '@/components/CategoryTile.vue'
import GroupList from '@/components/GroupList.vue'
import StatusChip from '@/components/StatusChip.vue'
import ConfirmSheet from '@/components/ConfirmSheet.vue'
import { currentVersion, loanProgress } from '@/lib/recurrence'
import { BellIcon, WalletMoneyIcon, CalendarMarkIcon, PenIcon, ArchiveIcon, ChecklistIcon } from '@/lib/icons'
import { peso, dayDate, shortDate, dueLabel, scheduleLabel, remindersLabel } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const money = useMoney()
const ui = useUi()
const item = computed(() => money.items.find((i) => i.id === route.params.id))
// The schedule from the edit base on: what the edit form shows and the next bills follow.
const sched = computed(() => item.value && currentVersion(item.value, money.editBaseDate(item.value.id) ?? money.today))
const archived = computed(() => !!item.value?.archivedAt)
const occs = computed(() => money.occurrences.filter((o) => o.type === 'item' && o.id === route.params.id))
// The bill to act on: an unpaid one from this month (overdue or upcoming), else this month's paid one, else the next.
const thisMonth = computed(() => money.today.slice(0, 7))
const current = computed(() =>
  occs.value.find((o) => o.due.slice(0, 7) === thisMonth.value && o.status !== 'paid') ??
  occs.value.find((o) => o.due.slice(0, 7) === thisMonth.value) ??
  occs.value.find((o) => o.due >= money.today))
const upcoming = computed(() => occs.value.filter((o) => o.due > (current.value?.due ?? money.today)).slice(0, 2))
const pays = computed(() => money.history.filter((p) => p.type === 'item' && p.sourceId === route.params.id))
const kindLabel = { bill: 'Bill', subscription: 'Subscription', loan: 'Loan' }
const progress = computed(() => item.value && !archived.value && loanProgress(item.value, occs.value.filter((o) => o.status === 'paid').length))

const confirmOpen = ref(false)
let archiving = false
async function archive() {
  confirmOpen.value = false
  if (archiving || item.value.archivedAt) return
  archiving = true
  const { id, name } = item.value
  try {
    await money.archiveItem(id)
  } catch {
    ui.showToast("Couldn't archive. Try again.")
    return
  } finally {
    archiving = false
  }
  router.replace('/')
  ui.showToast(`${name} archived`, async () => {
    try { await money.unarchiveItem(id) } catch { ui.showToast("Couldn't undo. Try again.") }
  })
}
</script>

<template>
  <div v-if="item" class="px-4">
    <div class="flex flex-col items-center pt-2 text-center">
      <CategoryTile :category="item.category" size="lg" />
      <h1 class="mt-3 text-[24px] leading-tight font-extrabold tracking-[-0.02em]">{{ item.name }}</h1>
      <p class="mt-1 text-[14px] font-medium text-ink-2">{{ kindLabel[item.kind] }} · {{ archived ? 'Archived' : scheduleLabel(sched) }}<template v-if="sched.variable"> · amount varies</template></p>
    </div>

    <section v-if="current" class="mt-6 rounded-[24px] bg-surface p-5">
      <div class="flex items-center justify-between">
        <p class="text-[13px] font-semibold text-ink-2">{{ shortDate(current.due) }} bill</p>
        <StatusChip :status="current.status" :overdue="current.overdue" />
      </div>
      <p class="num mt-2 text-[32px] leading-none font-extrabold tracking-[-0.025em]">{{ peso(current.status === 'paid' ? current.amount : current.left) }}</p>
      <p class="mt-1.5 text-[14px] font-semibold" :class="current.overdue ? 'text-late' : 'text-ink-2'">
        {{ dueLabel(current) }}<template v-if="current.variable && current.status !== 'paid'"> · based on your usual amount</template>
      </p>
      <button v-if="current.status !== 'paid' && !archived" type="button" class="mt-5 h-13 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="ui.openPay(current)">
        Mark as paid
      </button>
    </section>

    <GroupList title="Details">
      <dl class="divide-y divide-hairline text-[15px]">
        <div class="flex min-h-13 items-center gap-3 px-4 py-3"><CalendarMarkIcon :size="22" color="var(--ink-3)" /><dt class="flex-1 font-medium text-ink-2">Next after this</dt><dd class="font-semibold">{{ upcoming[0] ? dayDate(upcoming[0].due) : '—' }}</dd></div>
        <div class="flex min-h-13 items-center gap-3 px-4 py-3"><BellIcon :size="22" color="var(--ink-3)" /><dt class="flex-1 font-medium text-ink-2">Reminders</dt><dd class="font-semibold">{{ remindersLabel(item.reminderOffsets) }}</dd></div>
        <div v-if="progress" class="flex min-h-13 items-center gap-3 px-4 py-3"><ChecklistIcon :size="22" color="var(--ink-3)" /><dt class="flex-1 font-medium text-ink-2">Progress</dt><dd class="num font-semibold">{{ progress.paid }} of {{ progress.total }} paid</dd></div>
        <div class="flex min-h-13 items-center gap-3 px-4 py-3"><WalletMoneyIcon :size="22" color="var(--ink-3)" /><dt class="flex-1 font-medium text-ink-2">Usually paid from</dt><dd class="font-semibold">{{ money.account(item.accountId)?.name ?? '—' }}</dd></div>
      </dl>
    </GroupList>

    <GroupList title="Payments">
      <ul v-if="pays.length" class="divide-y divide-hairline">
        <li v-for="p in pays" :key="p.id" class="flex items-center justify-between px-4 py-3.5">
          <span>
            <span class="block text-[15px] font-semibold">{{ dayDate(p.paidOn) }}</span>
            <span class="block text-[13px] font-medium text-ink-2">from {{ money.account(p.account)?.name }}<template v-if="p.referenceNo"> · Ref {{ p.referenceNo }}</template></span>
          </span>
          <span class="num text-[15px] font-bold">{{ peso(p.amount) }}</span>
        </li>
      </ul>
      <p v-else class="px-4 py-4 text-[14px] font-medium text-ink-2">No payments recorded yet.</p>
    </GroupList>

    <div v-if="!archived" class="mt-6 grid grid-cols-2 gap-3">
      <button type="button" class="flex h-13 items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-ink" @click="ui.openEdit({ type: 'item', id: item.id })"><PenIcon :size="20" color="var(--ink-2)" /> Edit</button>
      <button type="button" class="flex h-13 items-center justify-center gap-2 rounded-2xl bg-surface text-[15px] font-bold text-ink-2" @click="confirmOpen = true"><ArchiveIcon :size="20" color="var(--ink-3)" /> Archive</button>
    </div>

    <ConfirmSheet :open="confirmOpen" :title="`Archive ${item.name}?`" body="It leaves Home and Payday. Past payments stay in History." :confirm-label="`Archive ${item.name}`" @confirm="archive" @close="confirmOpen = false" />
  </div>
</template>
