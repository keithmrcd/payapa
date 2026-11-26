<script setup>
import { ref, computed } from 'vue'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'
import GroupList from '@/components/GroupList.vue'
import CategoryTile from '@/components/CategoryTile.vue'
import { peso } from '@/lib/format'
import { accountsWithPayments, effectiveAccount, filterHistory, groupByMonth, paymentMeta } from '@/lib/history'

const money = useMoney()
const ui = useUi()
const kinds = [['all', 'All'], ['bill', 'Bills'], ['subscription', 'Subscriptions'], ['credit_card', 'Cards'], ['pay_later', 'Pay later'], ['loan', 'Loans']]
const kind = ref('all')
const picked = ref('all')
const accountPills = computed(() => accountsWithPayments(money.accounts, money.history))
// Falls back to All when the picked account's last payment is deleted.
const account = computed(() => effectiveAccount(picked.value, accountPills.value))
const months = computed(() => groupByMonth(filterHistory(money.history, { kind: kind.value, account: account.value })))
const filtered = computed(() => kind.value !== 'all' || account.value !== 'all')
const pill = 'h-9 shrink-0 rounded-full px-4 text-[14px] font-bold transition-colors'
</script>

<template>
  <div class="safe-top">
    <header class="px-4 pt-8 pb-4">
      <h1 class="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">History</h1>
      <p class="mt-0.5 text-[14px] font-medium text-ink-2">Every payment you've marked</p>
    </header>

    <div class="flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Filter by type">
      <button v-for="x in kinds" :key="x[0]" type="button" role="radio" :aria-checked="kind === x[0]"
              :class="[pill, kind === x[0] ? 'bg-ink text-ground' : 'bg-surface text-ink-2']" @click="kind = x[0]">{{ x[1] }}</button>
    </div>
    <div v-if="accountPills.length" class="mt-2 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Filter by account">
      <button type="button" role="radio" :aria-checked="account === 'all'"
              :class="[pill, account === 'all' ? 'bg-ink text-ground' : 'bg-surface text-ink-2']" @click="picked = 'all'">All accounts</button>
      <button v-for="a in accountPills" :key="a.id" type="button" role="radio" :aria-checked="account === a.id"
              :class="[pill, account === a.id ? 'bg-ink text-ground' : 'bg-surface text-ink-2']" @click="picked = a.id">{{ a.short }}</button>
    </div>

    <div class="mt-5 px-4">
      <GroupList v-for="m in months" :key="m.k" :title="m.label" :aside="peso(m.total)">
        <ul>
          <li v-for="p in m.list" :key="p.id" class="hrow">
            <button type="button" class="flex min-h-[68px] w-full items-center gap-3 pr-4 pl-4 text-left" @click="ui.openPayment(p)">
              <CategoryTile :category="p.category" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15px] font-semibold">{{ p.name }}</span>
                <span class="block truncate text-[13px] font-medium text-ink-2">{{ paymentMeta(p, money.account(p.account)?.short) }}</span>
              </span>
              <span class="num text-[15px] font-bold">{{ peso(p.amount) }}</span>
            </button>
          </li>
        </ul>
      </GroupList>
      <p v-if="!months.length" class="px-4 py-12 text-center text-[14px] font-medium text-ink-2">{{ filtered ? 'No payments match these filters.' : 'No payments yet.' }}</p>
    </div>
  </div>
</template>

<style scoped>
.hrow + .hrow { background: linear-gradient(var(--hairline), var(--hairline)) right top / calc(100% - 4.75rem) 1px no-repeat; }
</style>
