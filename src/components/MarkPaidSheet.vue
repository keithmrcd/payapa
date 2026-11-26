<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import BottomSheet from './BottomSheet.vue'
import CategoryTile from './CategoryTile.vue'
import FieldRow from './FieldRow.vue'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'
import { peso, shortDate, dayDate } from '@/lib/format'
import { addDays } from '@/lib/dates'
import { samePayment } from '@/lib/history'

// One sheet, two modes: pay an occurrence (ui.payFor) or edit a saved payment (ui.editPayment, a history row).
const ui = useUi()
const money = useMoney()
// The occurrence or payment on show. Kept after close, so the title and body don't change while the sheet slides away.
const o = ref(null)
const row = ref(null)
const editing = computed(() => !!row.value)
const open = computed(() => !!ui.payFor || !!ui.editPayment)
function close() {
  // On the delete confirm step, Escape, the scrim and X go back to the form instead of closing everything.
  if (confirming.value) { back(); return }
  editing.value ? ui.closePayment() : ui.closePay()
}

const amount = ref('')
const paidOn = ref('')
const account = ref('')
const referenceNo = ref('')
const note = ref('')
const choice = ref('full')
const dateInput = ref(null)
// Delete asks first, as a second step inside this sheet.
const confirming = ref(false)
const confirmFirst = ref(null)
const deleteBtn = ref(null)
// Focus follows the step: into the confirm step when it opens, back to Delete payment when it closes.
async function askDelete() { confirming.value = true; await nextTick(); confirmFirst.value?.focus() }
async function back() { confirming.value = false; await nextTick(); deleteBtn.value?.focus() }

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

// An archived account still shows (first) when the payment being edited used it, so saving keeps it.
const accountChoices = computed(() => {
  const a = editing.value && money.account(row.value.account)
  return a && a.archivedAt ? [a, ...money.activeAccounts] : money.activeAccounts
})

watch(() => ui.payFor, (v) => {
  if (!v) return
  o.value = v
  row.value = null
  confirming.value = false
  choice.value = 'full'
  amount.value = fmt(v.left)
  paidOn.value = money.today
  account.value = money.activeAccounts.some((a) => a.id === v.account) ? v.account : (money.activeAccounts[0]?.id ?? '')
  referenceNo.value = ''
  note.value = ''
})
watch(() => ui.editPayment, (p) => {
  if (!p) return
  row.value = p
  o.value = null
  confirming.value = false
  amount.value = fmt(p.amount)
  paidOn.value = p.paidOn
  account.value = p.account ?? ''
  referenceNo.value = p.referenceNo ?? ''
  note.value = p.note ?? ''
})
watch(choice, (c) => {
  if (!o.value) return
  if (c === 'full') amount.value = fmt(o.value.left)
  if (c === 'min') amount.value = fmt(Math.max(0, o.value.minimum - o.value.paid))
  if (c === 'other') amount.value = ''
})

// The bill or card, and in edit mode the due date the payment belongs to.
const head = computed(() => {
  if (editing.value) return { name: row.value.name, category: row.value.category, line: `For the ${shortDate(row.value.ref.split(':')[2])} bill` }
  if (!o.value) return null
  return { name: o.value.name, category: o.value.category, line: `Due ${shortDate(o.value.due)}${o.value.paid ? ` · ${peso(o.value.paid)} paid so far` : ''}` }
})
const title = computed(() => (confirming.value && row.value ? `Delete this ${peso(row.value.amount)} payment?` : editing.value ? 'Edit payment' : 'Mark as paid'))

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
  const fields = { amount: centavos.value, paidOn: paidOn.value, account: account.value, referenceNo: referenceNo.value, note: note.value }
  saving.value = true
  try {
    if (editing.value) {
      // Nothing changed: close without writing (no new updatedAt, nothing to sync).
      if (samePayment(row.value, fields)) { ui.closePayment(); return }
      await money.updatePayment(row.value.id, fields)
      ui.closePayment()
      ui.showToast('Payment updated')
    } else {
      const target = o.value
      const p = await money.markPaid(target, fields)
      ui.closePay()
      ui.showToast(`${target.name} marked paid · ${peso(fields.amount)}`, () => money.undoPayment(p.id).catch(() => ui.showToast("Couldn't undo. Try again.")))
    }
  } catch (e) {
    console.error(e)
    ui.showToast("Couldn't save. Try again.")
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (saving.value) return
  saving.value = true
  try {
    const r = await money.deletePayment(row.value.id)
    ui.closePayment()
    ui.showToast('Payment deleted', () => money.restorePayment(r).catch(() => ui.showToast("Couldn't undo. Try again.")))
  } catch (e) {
    console.error(e)
    ui.showToast("Couldn't delete. Try again.")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="close">
    <template v-if="confirming">
      <p class="text-[15px] font-medium text-ink-2">{{ row.name }} goes back to unpaid or partly paid.</p>
      <div class="mt-5 flex flex-col gap-2.5">
        <button ref="confirmFirst" type="button" :disabled="saving" class="h-13 w-full rounded-2xl bg-surface-2 text-base font-bold text-ink" @click="remove">Delete payment</button>
        <button type="button" class="h-13 w-full rounded-2xl text-base font-bold text-ink-2" @click="back">Cancel</button>
      </div>
    </template>

    <template v-else-if="head">
      <div class="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <CategoryTile :category="head.category" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-bold">{{ head.name }}</p>
          <p class="text-[13px] font-medium text-ink-2">{{ head.line }}</p>
        </div>
      </div>

      <div v-if="!editing && o?.minimum && o.minimum < o.amount" class="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-label="How much">
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
      <p v-if="!accountChoices.length" class="px-1 text-[14px] font-medium text-ink-2">
        Add an account in Settings to record payments.
        <RouterLink to="/settings/accounts" class="inline-flex min-h-11 items-center font-bold text-brand-text">Go to Accounts</RouterLink>
      </p>
      <div v-else class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Paid from">
        <button v-for="a in accountChoices" :key="a.id" type="button" role="radio" :aria-checked="account === a.id"
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
        <FieldRow label="Note" for="pn"><input id="pn" v-model="note" placeholder="Optional" autocomplete="off" /></FieldRow>
      </div>

      <button type="button" :disabled="!canSave || saving"
              class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink transition active:bg-brand-deep disabled:opacity-40"
              @click="save">
        <template v-if="editing">Save changes</template>
        <template v-else>Mark {{ centavos ? peso(centavos) : '' }} paid</template>
      </button>
      <button v-if="editing" ref="deleteBtn" type="button" class="mt-2 h-12 w-full text-[15px] font-bold text-ink-2" @click="askDelete">Delete payment</button>
    </template>
  </BottomSheet>
</template>
