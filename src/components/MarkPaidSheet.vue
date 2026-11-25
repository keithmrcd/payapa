<script setup>
import { ref, watch, computed } from 'vue'
import BottomSheet from './BottomSheet.vue'
import CategoryTile from './CategoryTile.vue'
import FieldRow from './FieldRow.vue'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'
import { peso, shortDate, dayDate } from '@/lib/format'
import { addDays } from '@/lib/dates'

const ui = useUi()
const money = useMoney()
const o = computed(() => ui.payFor)

const amount = ref('')
const paidOn = ref('')
const account = ref('')
const referenceNo = ref('')
const choice = ref('full')
const dateInput = ref(null)

// Amounts show with en-PH grouping ("3,412.50"); parsing strips the commas.
const fmt = (c) => (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function onAmount(e) {
  const raw = e.target.value.replace(/[^0-9.]/g, '')
  const [w, ...rest] = raw.split('.')
  const whole = w ? Number(w).toLocaleString('en-PH') : ''
  amount.value = rest.length ? `${whole || '0'}.${rest.join('').slice(0, 2)}` : whole
}
const yesterday = computed(() => addDays(money.today, -1))
const dateMode = computed(() => (paidOn.value === money.today ? 'today' : paidOn.value === yesterday.value ? 'yesterday' : 'other'))
function pickDate() { dateInput.value?.showPicker ? dateInput.value.showPicker() : dateInput.value?.click() }

watch(o, (v) => {
  if (!v) return
  choice.value = 'full'
  amount.value = fmt(v.left)
  paidOn.value = money.today
  account.value = money.activeAccounts.some((a) => a.id === v.account) ? v.account : (money.activeAccounts[0]?.id ?? '')
  referenceNo.value = ''
})
watch(choice, (c) => {
  if (!o.value) return
  if (c === 'full') amount.value = fmt(o.value.left)
  if (c === 'min') amount.value = fmt(Math.max(0, o.value.minimum - o.value.paid))
  if (c === 'other') amount.value = ''
})

const centavos = computed(() => Math.round(parseFloat(String(amount.value).replace(/,/g, '')) * 100) || 0)
const error = computed(() => {
  if (!amount.value) return ''
  if (centavos.value <= 0) return 'Enter an amount above ₱0.'
  return ''
})
const canSave = computed(() => centavos.value > 0 && paidOn.value && account.value)

const saving = ref(false)
async function save() {
  if (!canSave.value || saving.value) return
  const target = o.value
  const amt = centavos.value
  saving.value = true
  try {
    const p = await money.markPaid(target, { amount: amt, paidOn: paidOn.value, account: account.value, referenceNo: referenceNo.value })
    ui.closePay()
    ui.showToast(`${target.name} marked paid · ${peso(amt)}`, () => money.undoPayment(p.id).catch(() => ui.showToast("Couldn't undo. Try again.")))
  } catch (e) {
    console.error(e)
    ui.showToast("Couldn't save. Try again.")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="!!o" title="Mark as paid" @close="ui.closePay()">
    <template v-if="o">
      <div class="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <CategoryTile :category="o.category" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-bold">{{ o.name }}</p>
          <p class="text-[13px] font-medium text-ink-2">Due {{ shortDate(o.due) }}<template v-if="o.paid"> · {{ peso(o.paid) }} paid so far</template></p>
        </div>
      </div>

      <div v-if="o.minimum && o.minimum < o.amount" class="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-label="How much">
        <button v-for="c in [['full', 'Full'], ['min', 'Minimum'], ['other', 'Other']]" :key="c[0]" type="button" role="radio" :aria-checked="choice === c[0]"
                class="h-10 rounded-xl text-sm font-bold transition-colors"
                :class="choice === c[0] ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]' : 'text-ink-2'"
                @click="choice = c[0]">{{ c[1] }}</button>
      </div>

      <label class="mt-5 block text-center">
        <span class="text-[13px] font-semibold text-ink-2">Amount paid</span>
        <span class="mt-1 flex items-baseline justify-center gap-1">
          <span class="text-[30px] font-bold text-ink-3">₱</span>
          <input :value="amount" inputmode="decimal" placeholder="0.00" aria-label="Amount paid in pesos"
                 :style="{ width: Math.max(4, (amount || '0.00').length + 0.4) + 'ch' }"
                 class="num bg-transparent text-left text-[44px] leading-tight font-extrabold tracking-tight text-ink outline-none placeholder:text-ink-3"
                 @input="onAmount" />
        </span>
        <span v-if="error" class="text-sm font-semibold text-late" role="alert">{{ error }}</span>
      </label>

      <p class="mt-6 mb-2 px-1 text-[13px] font-bold text-ink-2">Paid from</p>
      <div class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Paid from">
        <button v-for="a in money.activeAccounts" :key="a.id" type="button" role="radio" :aria-checked="account === a.id"
                class="h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors"
                :class="account === a.id ? 'border-brand bg-brand text-brand-ink' : 'border-hairline bg-surface text-ink'"
                @click="account = a.id">{{ a.short }}</button>
      </div>

      <p class="mt-5 mb-2 px-1 text-[13px] font-bold text-ink-2">Date paid</p>
      <div class="flex gap-2" role="radiogroup" aria-label="Date paid">
        <button type="button" role="radio" :aria-checked="dateMode === 'today'" class="h-10 rounded-full border px-4 text-sm font-bold"
                :class="dateMode === 'today' ? 'border-brand bg-brand text-brand-ink' : 'border-hairline bg-surface text-ink'" @click="paidOn = money.today">Today</button>
        <button type="button" role="radio" :aria-checked="dateMode === 'yesterday'" class="h-10 rounded-full border px-4 text-sm font-bold"
                :class="dateMode === 'yesterday' ? 'border-brand bg-brand text-brand-ink' : 'border-hairline bg-surface text-ink'" @click="paidOn = yesterday">Yesterday</button>
        <button type="button" role="radio" :aria-checked="dateMode === 'other'" class="relative h-10 rounded-full border px-4 text-sm font-bold"
                :class="dateMode === 'other' ? 'border-brand bg-brand text-brand-ink' : 'border-hairline bg-surface text-ink'" @click="pickDate">
          {{ dateMode === 'other' ? dayDate(paidOn) : 'Pick date' }}
          <input ref="dateInput" v-model="paidOn" type="date" :max="money.today" tabindex="-1" aria-hidden="true" class="pointer-events-none absolute inset-0 opacity-0" />
        </button>
      </div>

      <div class="mt-5 overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Reference no." for="rn"><input id="rn" v-model="referenceNo" placeholder="Optional" autocomplete="off" /></FieldRow>
      </div>

      <button type="button" :disabled="!canSave || saving"
              class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink transition active:bg-brand-deep disabled:opacity-40"
              @click="save">
        Mark {{ centavos ? peso(centavos) : '' }} paid
      </button>
    </template>
  </BottomSheet>
</template>
