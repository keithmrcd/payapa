<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import CategoryTile from './CategoryTile.vue'
import FieldRow from './FieldRow.vue'
import { AltArrowLeftIcon, AltArrowRightIcon } from '@/lib/icons'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'
import { ordinal } from '@/lib/format'

const ui = useUi()
const money = useMoney()

const kinds = [
  { key: 'bill', category: 'electricity', label: 'Bill', hint: 'Electricity, water, internet, phone' },
  { key: 'subscription', category: 'video', label: 'Subscription', hint: 'Netflix, Spotify, iCloud' },
  { key: 'credit_card', category: 'credit_card', label: 'Credit card', hint: 'Statement and due date each month' },
  { key: 'pay_later', category: 'pay_later', label: 'Pay later', hint: 'Atome, SPayLater, TikTok Shop PayLater' },
  { key: 'loan', category: 'loan', label: 'Loan', hint: 'Fixed monthly payments' },
]
const billCategories = [['electricity', 'Electricity'], ['water', 'Water'], ['internet', 'Internet'], ['phone', 'Phone']]
const subCategories = [['video', 'Video'], ['music', 'Music'], ['cloud', 'Cloud storage']]

const step = ref(null) // null = chooser
const f = ref({})
const isCard = computed(() => step.value === 'credit_card' || step.value === 'pay_later')
const current = computed(() => kinds.find((k) => k.key === step.value))

watch(() => ui.addOpen, (o) => { if (o) step.value = null })
function pick(k) {
  step.value = k.key
  f.value = { name: '', category: k.key === 'bill' ? 'electricity' : k.key === 'subscription' ? 'video' : k.category, amount: '', variable: k.key === 'bill', dueDay: '', statementDay: '', last4: '', limit: '', account: 'bdo', remind: '3,1,0' }
}

const days = Array.from({ length: 31 }, (_, i) => i + 1)
const cents = (v) => Math.round(parseFloat(String(v).replace(/,/g, '')) * 100) || 0
const valid = computed(() => f.value.name?.trim() && f.value.dueDay && (isCard.value ? f.value.statementDay : cents(f.value.amount) > 0))
const title = computed(() => (step.value ? `New ${current.value.label.toLowerCase()}` : 'Add new'))

function save() {
  if (!valid.value) return
  const id = f.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36)
  if (isCard.value) {
    money.cards.push({ id, name: f.value.name.trim(), provider: f.value.name.trim(), type: step.value, last4: f.value.last4 || null, limit: cents(f.value.limit), statementDay: +f.value.statementDay, dueDay: +f.value.dueDay, account: f.value.account, tone: step.value === 'pay_later' ? 'orange' : 'navy',
      statement: { date: money.today, due: money.today, balance: 0, minimum: 0 }, installments: [] })
  } else {
    money.items.push({ id, name: f.value.name.trim(), kind: step.value, category: f.value.category, amount: cents(f.value.amount), variable: f.value.variable, dueDay: +f.value.dueDay, account: f.value.account })
  }
  ui.addOpen = false
  ui.showToast(`${f.value.name.trim()} added`)
}
</script>

<template>
  <BottomSheet :open="ui.addOpen" :title="title" @close="ui.addOpen = false">
    <template #lead>
      <button v-if="step" type="button" class="-ml-2 grid size-11 place-items-center rounded-full" aria-label="Back to types" @click="step = null">
        <AltArrowLeftIcon :size="26" color="var(--ink)" />
      </button>
    </template>

    <ul v-if="!step" class="-mx-2">
      <li v-for="k in kinds" :key="k.key">
        <button type="button" class="flex w-full items-center gap-3.5 rounded-2xl px-2 py-2.5 text-left active:bg-surface-2" @click="pick(k)">
          <CategoryTile :category="k.category" />
          <span class="flex-1">
            <span class="block text-[15px] font-bold">{{ k.label }}</span>
            <span class="block text-[13px] font-medium text-ink-2">{{ k.hint }}</span>
          </span>
          <AltArrowRightIcon :size="20" color="var(--ink-3)" />
        </button>
      </li>
    </ul>

    <form v-else @submit.prevent="save">
      <div class="overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Name" for="n"><input id="n" v-model="f.name" :placeholder="isCard ? 'BDO Gold Visa' : step === 'subscription' ? 'Netflix' : 'Meralco'" autocomplete="off" /></FieldRow>
        <FieldRow v-if="step === 'bill' || step === 'subscription'" label="Type" for="c">
          <select id="c" v-model="f.category">
            <option v-for="c in (step === 'bill' ? billCategories : subCategories)" :key="c[0]" :value="c[0]">{{ c[1] }}</option>
          </select>
        </FieldRow>
        <FieldRow v-if="isCard && step === 'credit_card'" label="Last 4 digits" for="l4"><input id="l4" v-model="f.last4" inputmode="numeric" maxlength="4" placeholder="4821" /></FieldRow>
        <FieldRow v-if="!isCard" :label="f.variable ? 'Usual amount' : 'Amount'" for="a"><input id="a" v-model="f.amount" inputmode="decimal" placeholder="₱0.00" class="num" /></FieldRow>
        <FieldRow v-if="isCard" label="Credit limit" for="lim"><input id="lim" v-model="f.limit" inputmode="decimal" placeholder="Optional" class="num" /></FieldRow>
      </div>

      <label v-if="step === 'bill'" class="mt-3 flex min-h-14 items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
        <span class="flex-1">
          <span class="block text-[15px] font-semibold">Amount changes monthly</span>
          <span class="block text-[13px] font-medium text-ink-2">You'll confirm the real amount when you pay</span>
        </span>
        <input v-model="f.variable" type="checkbox" class="switch" />
      </label>

      <div class="mt-3 overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow v-if="isCard" label="Statement day" for="sd">
          <select id="sd" v-model="f.statementDay"><option value="" disabled>Choose</option><option v-for="d in days" :key="d" :value="d">{{ ordinal(d) }} of the month</option></select>
        </FieldRow>
        <FieldRow label="Due day" for="dd">
          <select id="dd" v-model="f.dueDay"><option value="" disabled>Choose</option><option v-for="d in days" :key="d" :value="d">{{ ordinal(d) }} of the month</option></select>
        </FieldRow>
        <FieldRow label="Remind me" for="r">
          <select id="r" v-model="f.remind">
            <option value="3,1,0">3 days, 1 day, on the day</option>
            <option value="1,0">1 day before, on the day</option>
            <option value="0">On the day</option>
            <option value="">Don't remind</option>
          </select>
        </FieldRow>
        <FieldRow label="Usually paid from" for="acc">
          <select id="acc" v-model="f.account"><option v-for="a in money.accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select>
        </FieldRow>
      </div>

      <p v-if="f.dueDay" class="mt-3 px-1 text-[13px] font-medium text-ink-2">
        Due on the {{ ordinal(+f.dueDay) }}, so it's covered by your
        <strong class="text-ink">{{ +f.dueDay >= 15 && +f.dueDay <= 29 ? '15th' : '30th' }} payday</strong>.
      </p>

      <button type="submit" :disabled="!valid" class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep disabled:opacity-40">
        Add {{ current.label.toLowerCase() }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.switch { appearance: none; width: 3.25rem; height: 2rem; border-radius: 999px; background: var(--hairline); position: relative; transition: background .2s; flex-shrink: 0; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 1.625rem; height: 1.625rem; border-radius: 999px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform .25s var(--ease-out-expo); }
.switch:checked { background: var(--brand); }
.switch:checked::after { transform: translateX(1.25rem); }
</style>
