<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import CategoryTile from './CategoryTile.vue'
import FieldRow from './FieldRow.vue'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'
import { toDate } from '@/lib/dates'
import { latestClosedCycle, nextCycle, cycleFor } from '@/lib/cards'

// Enter a card's statement from the SOA (ui.statementFor = { cardId }), or edit one ({ cardId, statementId }).
const ui = useUi()
const money = useMoney()
const target = computed(() => ui.statementFor)
const open = computed(() => !!target.value)
const card = computed(() => target.value && money.cards.find((c) => c.id === target.value.cardId))
const row = computed(() => target.value?.statementId ? money.cardStatements.find((s) => s.id === target.value.statementId) : null)
const editing = computed(() => !!target.value?.statementId)

const statementDate = ref('')
const dueDate = ref('')
const dueTouched = ref(false)
const balance = ref('')
const minimum = ref('')
const confirming = ref(false)
const saving = ref(false)
// Kept after close so the title and buttons don't change while the sheet slides away.
const shown = ref({ month: '', cardName: '', payments: 0 })

const cents = (v) => Math.round(parseFloat(String(v).replace(/,/g, '')) * 100)
const toField = (c) => (c / 100).toFixed(2)
const monthOf = (d) => (d ? toDate(d).toLocaleDateString('en-US', { month: 'short' }) : '')

watch(target, (t) => {
  confirming.value = false
  if (!t || !card.value) return
  if (row.value) {
    statementDate.value = row.value.statementDate
    dueDate.value = row.value.dueDate
    dueTouched.value = true
    balance.value = toField(row.value.statementBalance)
    minimum.value = row.value.minimumDue ? toField(row.value.minimumDue) : ''
  } else {
    // The latest closed cycle if it's still missing, else the next one.
    const c = card.value
    let cyc = latestClosedCycle(c, money.today)
    if (money.cardStatements.some((s) => s.cardId === c.id && s.statementDate.slice(0, 7) === cyc.key)) cyc = nextCycle(c, cyc)
    statementDate.value = cyc.statementDate
    dueDate.value = cyc.dueDate
    dueTouched.value = false
    balance.value = ''
    minimum.value = ''
  }
  shown.value = { month: monthOf(statementDate.value), cardName: card.value.name, payments: row.value ? money.statementPayments(row.value.id).length : 0 }
})

// The due date follows the statement date until the owner changes it.
watch(statementDate, (d) => {
  if (dueTouched.value || !d || !card.value) return
  const t = toDate(d)
  dueDate.value = cycleFor(card.value, t.getFullYear(), t.getMonth()).dueDate
})

const locked = computed(() => shown.value.payments > 0)
const duplicate = computed(() => {
  if (!card.value || !statementDate.value) return false
  const m = statementDate.value.slice(0, 7)
  return money.cardStatements.some((s) => s.cardId === card.value.id && s.id !== row.value?.id && s.statementDate.slice(0, 7) === m)
})
const error = computed(() => {
  if (duplicate.value) return `You already entered the ${monthOf(statementDate.value)} statement.`
  if (balance.value !== '' && !(cents(balance.value) >= 0)) return 'Enter the statement balance.'
  if (minimum.value !== '' && cents(minimum.value) > cents(balance.value)) return 'The minimum due can’t be more than the balance.'
  if (statementDate.value && dueDate.value && dueDate.value <= statementDate.value) return 'The due date comes after the statement date.'
  return ''
})
const canSave = computed(() => !!statementDate.value && !!dueDate.value && balance.value !== '' && cents(balance.value) >= 0 && !error.value)

const title = computed(() => {
  if (confirming.value) return `Delete the ${shown.value.month} statement?`
  return editing.value ? `${shown.value.month} statement` : 'Enter statement'
})

async function save() {
  if (!canSave.value || saving.value) return
  const fields = {
    statementDate: statementDate.value, dueDate: dueDate.value,
    statementBalance: cents(balance.value), minimumDue: minimum.value === '' ? 0 : cents(minimum.value),
  }
  saving.value = true
  try {
    if (editing.value) await money.updateStatement(row.value.id, fields)
    else await money.addStatement(card.value.id, fields)
    ui.closeStatement()
    ui.showToast(editing.value ? 'Statement updated' : 'Statement saved')
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
    const gone = await money.deleteStatement(row.value.id)
    ui.closeStatement()
    ui.showToast('Statement deleted', () => money.restoreStatement(gone).catch(() => ui.showToast("Couldn't undo. Try again.")))
  } catch (e) {
    console.error(e)
    ui.showToast("Couldn't delete. Try again.")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="ui.closeStatement()">
    <template v-if="confirming">
      <p class="text-[15px] font-medium text-ink-2">
        {{ shown.cardName }} goes back to "Statement not entered".<template v-if="shown.payments"> Its {{ shown.payments === 1 ? 'payment is' : `${shown.payments} payments are` }} removed too.</template>
      </p>
      <div class="mt-5 flex flex-col gap-2.5">
        <button type="button" :disabled="saving" class="h-13 w-full rounded-2xl bg-surface-2 text-base font-bold text-ink" @click="remove">Delete statement</button>
        <button type="button" class="h-13 w-full rounded-2xl text-base font-bold text-ink-2" @click="confirming = false">Cancel</button>
      </div>
    </template>

    <form v-else-if="card" @submit.prevent="save">
      <div class="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <CategoryTile :category="card.type" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-bold">{{ card.name }}</p>
          <p class="text-[13px] font-medium text-ink-2">From your statement of account</p>
        </div>
      </div>

      <div class="mt-4 overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Statement date" for="sdt"><input id="sdt" v-model="statementDate" type="date" /></FieldRow>
        <FieldRow label="Due date" for="ddt"><input id="ddt" v-model="dueDate" type="date" :disabled="locked" @input="dueTouched = true" /></FieldRow>
        <FieldRow label="Balance" for="bal"><input id="bal" v-model="balance" inputmode="decimal" placeholder="₱0.00" class="num" /></FieldRow>
        <FieldRow label="Minimum due" for="min"><input id="min" v-model="minimum" inputmode="decimal" placeholder="Optional" class="num" /></FieldRow>
      </div>
      <p v-if="locked" class="mt-2 px-1 text-[13px] font-medium text-ink-2">The due date is locked because this statement has payments.</p>
      <p v-if="error" class="mt-2 px-1 text-sm font-semibold text-late" role="alert">{{ error }}</p>

      <button type="submit" :disabled="!canSave || saving"
              class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink transition active:bg-brand-deep disabled:opacity-40">
        {{ editing ? 'Save changes' : 'Save statement' }}
      </button>
      <button v-if="editing" type="button" class="mt-2 h-12 w-full text-[15px] font-bold text-ink-2" @click="confirming = true">Delete statement</button>
    </form>
  </BottomSheet>
</template>
