<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import FieldRow from './FieldRow.vue'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'
import { toDate } from '@/lib/dates'
import { installmentAnchor, installmentProgress, latestClosedCycle } from '@/lib/cards'

// Add an installment plan to a card (ui.installmentFor = { cardId }) or edit one ({ cardId, installmentId }).
// Progress only: the SOA balance already includes each month.
const ui = useUi()
const money = useMoney()
const target = computed(() => ui.installmentFor)
const card = computed(() => target.value && money.cards.find((c) => c.id === target.value.cardId))
const row = computed(() => target.value?.installmentId ? money.installments.find((i) => i.id === target.value.installmentId) : null)
const editing = computed(() => !!target.value?.installmentId)

const description = ref('')
const monthly = ref('')
const months = ref('')
const paid = ref('0')
const confirming = ref(false)
const saving = ref(false)
const shown = ref({ name: '', hint: '' }) // kept after close so the title doesn't change while the sheet slides away

const cents = (v) => Math.round(parseFloat(String(v).replace(/,/g, '')) * 100) || 0
const monthOf = (d) => toDate(d).toLocaleDateString('en-US', { month: 'short' })

watch(target, (t) => {
  confirming.value = false
  if (!t || !card.value) return
  if (row.value) {
    description.value = row.value.description
    monthly.value = (row.value.monthlyAmount / 100).toFixed(2)
    months.value = String(row.value.months)
    paid.value = String(installmentProgress(row.value, card.value, money.today).paid)
    shown.value = { name: row.value.description, hint: `Counting the ${monthOf(latestClosedCycle(card.value, money.today).statementDate)} statement` }
  } else {
    description.value = ''
    monthly.value = ''
    months.value = ''
    paid.value = '0'
    shown.value = { name: '', hint: `As on your ${installmentAnchor(card.value, money.cardStatements, money.today).label} statement` }
  }
})

const n = (v) => (/^\d+$/.test(String(v).trim()) ? Number(v) : NaN)
const error = computed(() => {
  if (months.value !== '' && !(n(months.value) >= 1)) return 'Months is a whole number, 1 or more.'
  if (paid.value !== '' && !(n(paid.value) >= 0)) return 'Months paid is a whole number.'
  if (n(paid.value) > n(months.value)) return 'Months paid can’t be more than the months.'
  return ''
})
const canSave = computed(() => !!description.value.trim() && cents(monthly.value) > 0 && n(months.value) >= 1 && n(paid.value) >= 0 && !error.value)
const title = computed(() => (confirming.value ? `Delete ${shown.value.name}?` : editing.value ? shown.value.name : 'New installment'))

async function save() {
  if (!canSave.value || saving.value) return
  const fields = { description: description.value.trim(), monthlyAmount: cents(monthly.value), months: n(months.value), paid: n(paid.value) }
  saving.value = true
  try {
    if (editing.value) await money.updateInstallment(row.value.id, fields)
    else await money.addInstallment(card.value.id, fields)
    ui.closeInstallment()
    ui.showToast(editing.value ? `${fields.description} updated` : `${fields.description} added`)
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
    const r = await money.deleteInstallment(row.value.id)
    ui.closeInstallment()
    ui.showToast(`${r.description} deleted`, () => money.restoreInstallment(r).catch(() => ui.showToast("Couldn't undo. Try again.")))
  } catch (e) {
    console.error(e)
    ui.showToast("Couldn't delete. Try again.")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="!!target" :title="title" @close="ui.closeInstallment()">
    <template v-if="confirming">
      <p class="text-[15px] font-medium text-ink-2">It leaves this card's installments. Statements and payments stay as they are.</p>
      <div class="mt-5 flex flex-col gap-2.5">
        <button type="button" :disabled="saving" class="h-13 w-full rounded-2xl bg-surface-2 text-base font-bold text-ink" @click="remove">Delete installment</button>
        <button type="button" class="h-13 w-full rounded-2xl text-base font-bold text-ink-2" @click="confirming = false">Cancel</button>
      </div>
    </template>

    <form v-else-if="card" @submit.prevent="save">
      <div class="overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Description" for="idesc"><input id="idesc" v-model="description" placeholder="iPhone 16" autocomplete="off" maxlength="40" /></FieldRow>
        <FieldRow label="Monthly" for="imon"><input id="imon" v-model="monthly" inputmode="decimal" placeholder="₱0.00" class="num" /></FieldRow>
        <FieldRow label="Months" for="imths"><input id="imths" v-model="months" inputmode="numeric" placeholder="12" class="num" /></FieldRow>
        <FieldRow :label="editing ? 'Paid so far' : 'Already paid'" for="ipaid"><input id="ipaid" v-model="paid" inputmode="numeric" placeholder="0" class="num" /></FieldRow>
      </div>
      <p class="mt-2 px-1 text-[13px] font-medium text-ink-2">{{ shown.hint }}. It counts up by one each statement.</p>
      <p v-if="error" class="mt-2 px-1 text-sm font-semibold text-late" role="alert">{{ error }}</p>

      <button type="submit" :disabled="!canSave || saving"
              class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink transition active:bg-brand-deep disabled:opacity-40">
        {{ editing ? 'Save changes' : 'Add installment' }}
      </button>
      <button v-if="editing" type="button" class="mt-2 h-12 w-full text-[15px] font-bold text-ink-2" @click="confirming = true">Delete installment</button>
    </form>
  </BottomSheet>
</template>
