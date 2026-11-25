<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import CategoryTile from './CategoryTile.vue'
import FieldRow from './FieldRow.vue'
import { AltArrowLeftIcon, AltArrowRightIcon } from '@/lib/icons'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'
import { ordinal, shortDate } from '@/lib/format'
import { addDays } from '@/lib/dates'
import { dueDates } from '@/lib/recurrence'
import { paydayForDue } from '@/lib/payday'

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
const repeats = [['monthly', 'Monthly'], ['yearly', 'Yearly'], ['weekly', 'Every few weeks'], ['once', 'Once']]
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const paydayChoices = [['auto', 'Automatic'], ['15', '15th'], ['30', '30th']]

const step = ref(null) // null = chooser
const f = ref({})
const edit = ref(null) // { type, id, name } while editing; kept after close so the title doesn't flicker
const canMoveStart = ref(false) // editing an item with no payments and one schedule version
const isCard = computed(() => step.value === 'credit_card' || step.value === 'pay_later')
const isLoan = computed(() => step.value === 'loan')
const current = computed(() => kinds.find((k) => k.key === step.value))

const days = Array.from({ length: 31 }, (_, i) => i + 1)
const cents = (v) => Math.round(parseFloat(String(v).replace(/,/g, '')) * 100) || 0
const toField = (c) => (c ? (c / 100).toFixed(2) : '')

// The next date on or after today for the recurrence chosen so far ('' until enough is filled in).
const suggested = computed(() => {
  if (!step.value || isCard.value) return ''
  const r = isLoan.value ? 'monthly' : f.value.recurrence
  const day = +f.value.dueDay
  const mon = f.value.dueMonth
  if (r === 'monthly' && !day) return ''
  if (r === 'yearly' && (!day || mon === '' || mon == null)) return ''
  const t = money.today
  const draft = {
    startDate: t, totalPayments: null, paidBefore: 0,
    schedule: [{ effectiveFrom: t, recurrence: r, dueDay: day || null, dueMonth: r === 'yearly' ? +mon : null, interval: r === 'weekly' ? +f.value.interval || 1 : 1, amount: 0, variable: false }],
  }
  return dueDates(draft, addDays(t, 800))[0]?.due ?? ''
})
watch(suggested, (d) => { if (!f.value.firstTouched) f.value.firstDue = d })

function setStep(key, fields) {
  step.value = key
  f.value = fields
  if (!fields.firstTouched) f.value.firstDue = suggested.value
}

function pick(k) {
  setStep(k.key, {
    name: '', category: k.key === 'bill' ? 'electricity' : k.key === 'subscription' ? 'video' : k.category, amount: '', variable: k.key === 'bill',
    recurrence: 'monthly', dueDay: '', dueMonth: '', interval: 1, firstDue: '', firstTouched: false, bucket: 'auto',
    totalPayments: '', paidBefore: 0, statementDay: '', last4: '', limit: '', account: money.activeAccounts[0]?.id ?? '', remind: '3,1,0',
  })
}

function startEdit(target) {
  if (target.type === 'card') {
    const c = money.cards.find((x) => x.id === target.id)
    if (!c) return ui.closeAdd()
    edit.value = { ...target, name: c.name }
    canMoveStart.value = false
    setStep(c.type, { name: c.name, last4: c.last4 ?? '', limit: toField(c.creditLimit), statementDay: c.statementDay, dueDay: c.dueDay, account: c.accountId ?? '', remind: '3,1,0' })
    return
  }
  const item = money.items.find((x) => x.id === target.id)
  if (!item) return ui.closeAdd()
  const v = [...item.schedule].reverse().find((x) => x.effectiveFrom <= money.today) ?? item.schedule[0]
  edit.value = { ...target, name: item.name }
  canMoveStart.value = item.schedule.length === 1 && !money.payments.some((p) => p.ref.startsWith(`item:${item.id}:`))
  setStep(item.kind, {
    name: item.name, category: item.category, amount: toField(v.amount), variable: !!v.variable,
    recurrence: v.recurrence, dueDay: v.dueDay ?? '', dueMonth: v.dueMonth ?? '', interval: v.interval || 1,
    firstDue: item.startDate, firstTouched: true, bucket: item.paydayBucket || 'auto',
    totalPayments: item.totalPayments ?? '', paidBefore: item.paidBefore ?? 0, last4: '', limit: '', statementDay: '',
    account: item.accountId ?? '', remind: (item.reminderOffsets || []).join(','),
  })
}

watch(() => ui.addOpen, (o) => {
  if (!o) return
  if (ui.editing) startEdit(ui.editing)
  else { edit.value = null; canMoveStart.value = false; step.value = null }
})

const showFirstDue = computed(() => !isCard.value && (!edit.value || canMoveStart.value))
const cardDue = computed(() => {
  const day = +f.value.dueDay
  if (!day) return ''
  const t = money.today
  const draft = { startDate: t, schedule: [{ effectiveFrom: t, recurrence: 'monthly', dueDay: day, interval: 1, amount: 0 }] }
  return dueDates(draft, addDays(t, 62))[0]?.due ?? ''
})
const hintDue = computed(() => (isCard.value ? cardDue.value : showFirstDue.value ? f.value.firstDue : suggested.value))
const payday = computed(() => (hintDue.value ? paydayForDue(hintDue.value, isCard.value ? 'auto' : f.value.bucket) : null))

const valid = computed(() => {
  const v = f.value
  if (!v.name?.trim()) return false
  if (isCard.value) return !!(v.dueDay && v.statementDay)
  if (cents(v.amount) <= 0) return false
  if (isLoan.value) {
    const total = Math.floor(+v.totalPayments), paid = Math.floor(+v.paidBefore || 0)
    if (!v.dueDay || !(total > 0) || paid < 0 || paid >= total) return false
  } else if (v.recurrence === 'monthly') {
    if (!v.dueDay) return false
  } else if (v.recurrence === 'yearly') {
    if (!v.dueDay || v.dueMonth === '') return false
  }
  return !showFirstDue.value || !!v.firstDue
})
const title = computed(() => (edit.value ? `Edit ${edit.value.name}` : step.value ? `New ${current.value.label.toLowerCase()}` : 'Add new'))
const buttonLabel = computed(() => (edit.value ? 'Save changes' : `Add ${current.value?.label.toLowerCase()}`))

function scheduleFields() {
  const v = f.value
  const r = isLoan.value ? 'monthly' : v.recurrence
  return {
    recurrence: r,
    dueDay: r === 'monthly' || r === 'yearly' ? +v.dueDay : null,
    dueMonth: r === 'yearly' ? +v.dueMonth : null,
    interval: r === 'weekly' ? +v.interval || 1 : 1,
    amount: cents(v.amount),
    variable: step.value === 'bill' && !!v.variable,
  }
}

const saving = ref(false)
async function save() {
  if (!valid.value || saving.value) return
  const v = f.value
  const name = v.name.trim()
  const accountId = v.account || null
  const reminderOffsets = v.remind ? v.remind.split(',').map(Number) : []
  const editing = edit.value
  saving.value = true
  try {
    if (isCard.value) {
      const fields = { name, last4: v.last4 || null, creditLimit: cents(v.limit), statementDay: +v.statementDay, dueDay: +v.dueDay, accountId }
      if (editing) await money.updateCard(editing.id, fields)
      else await money.addCard({ ...fields, provider: name, type: step.value, tone: step.value === 'pay_later' ? 'orange' : 'navy' })
    } else if (editing) {
      const changes = { name, category: v.category, accountId, paydayBucket: v.bucket, reminderOffsets, ...scheduleFields() }
      if (isLoan.value) Object.assign(changes, { totalPayments: Math.floor(+v.totalPayments), paidBefore: Math.floor(+v.paidBefore || 0) })
      if (showFirstDue.value) changes.startDate = v.firstDue
      await money.updateItem(editing.id, changes)
    } else {
      await money.addItem({
        name, kind: step.value, category: v.category, accountId, startDate: v.firstDue, paydayBucket: v.bucket,
        reminderOffsets, reminderTime: '09:00',
        totalPayments: isLoan.value ? Math.floor(+v.totalPayments) : null, paidBefore: isLoan.value ? Math.floor(+v.paidBefore || 0) : 0,
        schedule: [{ effectiveFrom: v.firstDue, ...scheduleFields() }],
      })
    }
    ui.closeAdd()
    ui.showToast(editing ? `${name} updated` : `${name} added`)
  } catch (e) {
    console.error(e)
    ui.showToast("Couldn't save. Try again.")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="ui.addOpen" :title="title" @close="ui.closeAdd()">
    <template #lead>
      <button v-if="step && !edit" type="button" class="-ml-2 grid size-11 place-items-center rounded-full" aria-label="Back to types" @click="step = null">
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
        <FieldRow v-if="!isCard" :label="isLoan ? 'Monthly amount' : f.variable ? 'Usual amount' : 'Amount'" for="a"><input id="a" v-model="f.amount" inputmode="decimal" placeholder="₱0.00" class="num" /></FieldRow>
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
        <FieldRow v-if="!isCard && !isLoan" label="Repeats" for="rp">
          <select id="rp" v-model="f.recurrence"><option v-for="r in repeats" :key="r[0]" :value="r[0]">{{ r[1] }}</option></select>
        </FieldRow>
        <FieldRow v-if="isCard || isLoan || f.recurrence === 'monthly'" label="Due day" for="dd">
          <select id="dd" v-model="f.dueDay"><option value="" disabled>Choose</option><option v-for="d in days" :key="d" :value="d">{{ ordinal(d) }} of the month</option></select>
        </FieldRow>
        <template v-if="!isCard && !isLoan && f.recurrence === 'yearly'">
          <FieldRow label="Month" for="dm">
            <select id="dm" v-model="f.dueMonth"><option value="" disabled>Choose</option><option v-for="(m, i) in months" :key="m" :value="i">{{ m }}</option></select>
          </FieldRow>
          <FieldRow label="Day" for="dy">
            <select id="dy" v-model="f.dueDay"><option value="" disabled>Choose</option><option v-for="d in days" :key="d" :value="d">{{ ordinal(d) }}</option></select>
          </FieldRow>
        </template>
        <FieldRow v-if="!isCard && !isLoan && f.recurrence === 'weekly'" label="Every" for="iv">
          <select id="iv" v-model="f.interval"><option v-for="n in 8" :key="n" :value="n">{{ n }} {{ n === 1 ? 'week' : 'weeks' }}</option></select>
        </FieldRow>
        <template v-if="isLoan">
          <FieldRow label="Total payments" for="tp"><input id="tp" v-model="f.totalPayments" type="number" inputmode="numeric" min="1" step="1" placeholder="12" class="num" /></FieldRow>
          <FieldRow label="Already paid" for="ap"><input id="ap" v-model="f.paidBefore" type="number" inputmode="numeric" min="0" step="1" placeholder="0" class="num" /></FieldRow>
        </template>
        <FieldRow v-if="showFirstDue" label="First due" for="fd">
          <input id="fd" v-model="f.firstDue" type="date" @input="f.firstTouched = true" />
        </FieldRow>
        <FieldRow v-if="!isCard" label="Payday" for="pd">
          <select id="pd" v-model="f.bucket"><option v-for="p in paydayChoices" :key="p[0]" :value="p[0]">{{ p[1] }}</option></select>
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
          <select id="acc" v-model="f.account"><option v-for="a in money.activeAccounts" :key="a.id" :value="a.id">{{ a.name }}</option></select>
        </FieldRow>
      </div>

      <p v-if="payday" class="mt-3 px-1 text-[13px] font-medium text-ink-2">
        Covered by your <strong class="text-ink">{{ shortDate(payday.date) }}</strong> payday.
      </p>

      <button type="submit" :disabled="!valid || saving" class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep disabled:opacity-40">
        {{ buttonLabel }}
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
