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
import { dueDates, currentVersion } from '@/lib/recurrence'
import { paydayForDue } from '@/lib/payday'
import { NETWORKS, PAY_LATER, cardBanksFor, cardKindsFor, cardName, debitName, debitShort } from '@/lib/issuers'

const ui = useUi()
const money = useMoney()

const kinds = [
  { key: 'bill', category: 'electricity', label: 'Bill', hint: 'Electricity, water, internet, phone' },
  { key: 'subscription', category: 'video', label: 'Subscription', hint: 'Netflix, Spotify, iCloud' },
  { key: 'credit_card', category: 'credit_card', label: 'Credit card', pickLabel: 'Card', pickHint: 'Credit or debit, by card type and bank' },
  { key: 'pay_later', category: 'pay_later', label: 'Pay later', hint: 'Atome, SPayLater, TikTok Shop PayLater' },
  { key: 'loan', category: 'loan', label: 'Loan', hint: 'Fixed monthly payments' },
]
const billCategories = [['electricity', 'Electricity'], ['water', 'Water'], ['internet', 'Internet'], ['phone', 'Phone']]
const subCategories = [['video', 'Video'], ['music', 'Music'], ['cloud', 'Cloud storage']]
const repeats = [['monthly', 'Monthly'], ['yearly', 'Yearly'], ['weekly', 'Every few weeks'], ['once', 'Once']]
// A debit card is saved as a payment account, not a card.
const debitKind = { key: 'debit', label: 'Debit card' }
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const paydayChoices = [['auto', 'Automatic'], ['15', '15th'], ['30', '30th']]

const step = ref(null) // null = a list (see picker); else the form for that kind
// Lists before a card's form: card type -> bank, or pay-later provider. null = the first list.
const picker = ref(null) // null | 'networks' | 'banks' | 'kind' | 'providers'
const pickedNetwork = ref(null)
const pickedBank = ref('') // '' = Other bank
const lastCardKind = ref(null) // the card kind whose form is open, so Back returns to its list
const f = ref({})
const edit = ref(null) // { type, id, name } while editing; kept after close so the title doesn't flicker
const canMoveStart = ref(false) // editing an item with no payments and one schedule version
// Schedule fields and first due as pre-filled, so save sends only what the owner changed.
const initial = ref(null)
const isCard = computed(() => step.value === 'credit_card' || step.value === 'pay_later')
const isLoan = computed(() => step.value === 'loan')
const isDebit = computed(() => step.value === 'debit')
const current = computed(() => (isDebit.value ? debitKind : kinds.find((k) => k.key === step.value)))

const days = Array.from({ length: 31 }, (_, i) => i + 1)
const cents = (v) => Math.round(parseFloat(String(v).replace(/,/g, '')) * 100) || 0
const toField = (c) => (c ? (c / 100).toFixed(2) : '')

// The next date on or after today for the recurrence chosen so far ('' until enough is filled in).
const suggested = computed(() => {
  if (!step.value || isCard.value || isDebit.value) return ''
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

// The rows of whichever list is showing. From the Cards tab the first list is card types + Pay later.
const listRows = computed(() => {
  const tile = (category, label, hint, go) => ({ key: `${category}:${label}`, category, label, hint, go })
  const networkRow = (n) => tile('credit_card', n.label, '', () => { pickedNetwork.value = n.key; picker.value = 'banks' })
  if (picker.value === 'banks') {
    return [...cardBanksFor(pickedNetwork.value).map((b) => tile('credit_card', b, '', () => pickBank(b))),
      tile('credit_card', 'Other bank', 'Type the bank yourself', () => pickBank(''))]
  }
  if (picker.value === 'kind') {
    return [tile('credit_card', 'Credit card', 'Statement and due date each month', () => startCard('credit_card', pickedBank.value, pickedNetwork.value)),
      tile('credit_card', 'Debit card', 'Pay from it. Shows under Accounts', () => startDebit(pickedBank.value, pickedNetwork.value))]
  }
  if (picker.value === 'providers') {
    return [...PAY_LATER.map((b) => tile('pay_later', b, '', () => startCard('pay_later', b, null))),
      tile('pay_later', 'Other', 'Type the name yourself', () => startCard('pay_later', '', null))]
  }
  if (picker.value === 'networks') return NETWORKS.map(networkRow)
  if (ui.addCardsOnly) return [...NETWORKS.map(networkRow), tile('pay_later', 'Pay later', 'Atome, SPayLater, TikTok Shop PayLater', () => { picker.value = 'providers' })]
  return kinds.map((k) => tile(k.category, k.pickLabel ?? k.label, k.pickHint ?? k.hint, () => pick(k)))
})
const listTitle = computed(() => {
  if (picker.value === 'banks') return `Which bank's ${NETWORKS.find((n) => n.key === pickedNetwork.value)?.label}?`
  if (picker.value === 'kind') return 'Credit or debit?'
  if (picker.value === 'providers') return 'Which pay later?'
  if (picker.value === 'networks') return 'Card type'
  return ui.addCardsOnly ? 'Add a card' : 'Add new'
})
function back() {
  if (step.value) {
    step.value = null
    if (!lastCardKind.value) picker.value = null
    return
  }
  if (picker.value === 'kind') picker.value = 'banks'
  else if (picker.value === 'banks' && !ui.addCardsOnly) picker.value = 'networks'
  else picker.value = null
}

// After the bank: ask credit or debit, unless the bank issues only one kind.
function pickBank(bank) {
  pickedBank.value = bank
  const kinds = cardKindsFor(pickedNetwork.value, bank)
  if (kinds.length === 2) { picker.value = 'kind'; return }
  if (kinds[0] === 'debit') startDebit(bank, pickedNetwork.value)
  else startCard('credit_card', bank, pickedNetwork.value)
}

function startDebit(bank, network) {
  lastCardKind.value = 'debit'
  setStep('debit', { name: bank ? debitName(bank, network) : '', nameTouched: false, short: bank ? debitShort(bank) : '', shortTouched: false, network, provider: bank })
}

function startCard(type, bank, network) {
  lastCardKind.value = type
  setStep(type, {
    name: bank ? cardName(bank, network) : '', nameTouched: false, network: network ?? '', provider: bank,
    statementDay: '', dueDay: '', limit: '', bucket: 'auto', account: money.activeAccounts[0]?.id ?? '', remind: '3,1,0',
  })
}
// The starting name follows bank and card type until the owner types their own.
watch(() => [f.value.provider, f.value.network], ([bank, net]) => {
  if (edit.value) return
  const b = bank?.trim()
  if (isDebit.value) {
    if (!f.value.nameTouched) f.value.name = b ? debitName(b, net) : ''
    if (!f.value.shortTouched) f.value.short = b ? debitShort(b) : ''
    return
  }
  if (!isCard.value || f.value.nameTouched) return
  f.value.name = b ? cardName(b, net || null) : ''
})

function pick(k) {
  if (k.key === 'credit_card') { picker.value = 'networks'; return }
  if (k.key === 'pay_later') { picker.value = 'providers'; return }
  lastCardKind.value = null
  setStep(k.key, {
    name: '', category: k.key === 'bill' ? 'electricity' : k.key === 'subscription' ? 'video' : k.category, amount: '', variable: k.key === 'bill',
    recurrence: 'monthly', dueDay: '', dueMonth: '', interval: 1, firstDue: '', firstTouched: false, bucket: 'auto',
    totalPayments: '', paidBefore: 0, statementDay: '', limit: '', account: money.activeAccounts[0]?.id ?? '', remind: '3,1,0',
  })
}

function startEdit(target) {
  if (target.type === 'card') {
    const c = money.cards.find((x) => x.id === target.id)
    if (!c) return ui.closeAdd()
    edit.value = { ...target, name: c.name }
    canMoveStart.value = false
    initial.value = null
    setStep(c.type, { name: c.name, nameTouched: true, network: c.network ?? '', provider: c.provider ?? '', limit: toField(c.creditLimit), statementDay: c.statementDay, dueDay: c.dueDay, bucket: c.paydayBucket || 'auto', account: c.accountId ?? '', remind: (c.reminderOffsets ?? [3, 1, 0]).join(',') })
    return
  }
  const item = money.items.find((x) => x.id === target.id)
  if (!item) return ui.closeAdd()
  // The version in force where the edit will apply, the same one updateItem compares against.
  const v = currentVersion(item, money.editBaseDate(item.id) ?? money.today)
  edit.value = { ...target, name: item.name }
  canMoveStart.value = item.schedule.length === 1 && !money.payments.some((p) => p.ref.startsWith(`item:${item.id}:`))
  setStep(item.kind, {
    name: item.name, category: item.category, amount: toField(v.amount), variable: !!v.variable,
    recurrence: v.recurrence, dueDay: v.dueDay ?? '', dueMonth: v.dueMonth ?? '', interval: v.interval || 1,
    firstDue: item.startDate, firstTouched: true, bucket: item.paydayBucket || 'auto',
    totalPayments: item.totalPayments ?? '', paidBefore: item.paidBefore ?? 0, limit: '', statementDay: '',
    account: item.accountId ?? '', remind: (item.reminderOffsets || []).join(','),
  })
  initial.value = { schedule: scheduleFields(), startDate: item.startDate }
}

watch(() => ui.addOpen, (o) => {
  if (!o) return
  if (ui.editing) startEdit(ui.editing)
  else { edit.value = null; canMoveStart.value = false; initial.value = null; step.value = null; picker.value = null; lastCardKind.value = null; pickedBank.value = '' }
})

// An archived saved account stays selectable while editing, so the select never shows blank.
const archivedPick = computed(() => {
  const a = f.value.account ? money.account(f.value.account) : null
  return a?.archivedAt ? a : null
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
const payday = computed(() => (hintDue.value ? paydayForDue(hintDue.value, f.value.bucket) : null))

const valid = computed(() => {
  const v = f.value
  if (!v.name?.trim()) return false
  if (isDebit.value) return !!v.provider?.trim()
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
const title = computed(() => (edit.value ? `Edit ${edit.value.name}` : step.value ? `New ${current.value.label.toLowerCase()}` : listTitle.value))
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
    if (isDebit.value) {
      await money.addAccount({ name, short: v.short.trim() || name, type: 'debit', network: v.network, bank: v.provider.trim() })
    } else if (isCard.value) {
      const fields = { name, network: step.value === 'credit_card' ? v.network || null : null, provider: v.provider?.trim() || null, creditLimit: cents(v.limit), statementDay: +v.statementDay, dueDay: +v.dueDay, paydayBucket: v.bucket || 'auto', accountId, reminderOffsets }
      if (editing) await money.updateCard(editing.id, fields)
      else await money.addCard({ ...fields, type: step.value, tone: step.value === 'pay_later' ? 'orange' : 'navy' })
    } else if (editing) {
      const changes = { name, category: v.category, accountId, paydayBucket: v.bucket, reminderOffsets }
      // Only schedule fields the owner changed, so an untouched field can't overwrite a newer version.
      for (const [k, val] of Object.entries(scheduleFields())) if (val !== initial.value?.schedule[k]) changes[k] = val
      if (isLoan.value) Object.assign(changes, { totalPayments: Math.floor(+v.totalPayments), paidBefore: Math.floor(+v.paidBefore || 0) })
      if (showFirstDue.value && v.firstDue !== initial.value?.startDate) changes.startDate = v.firstDue
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
      <button v-if="(step || picker) && !edit" type="button" class="-ml-2 grid size-11 place-items-center rounded-full" aria-label="Back" @click="back">
        <AltArrowLeftIcon :size="26" color="var(--ink)" />
      </button>
    </template>

    <ul v-if="!step" class="-mx-2">
      <li v-for="k in listRows" :key="k.key">
        <button type="button" class="flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-2 py-2.5 text-left active:bg-surface-2" @click="k.go()">
          <CategoryTile :category="k.category" />
          <span class="flex-1">
            <span class="block text-[15px] font-bold">{{ k.label }}</span>
            <span v-if="k.hint" class="block text-[13px] font-medium text-ink-2">{{ k.hint }}</span>
          </span>
          <AltArrowRightIcon :size="20" color="var(--ink-3)" />
        </button>
      </li>
    </ul>

    <form v-else-if="isDebit" @submit.prevent="save">
      <div class="overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Name" for="n"><input id="n" v-model="f.name" placeholder="BDO Visa debit" autocomplete="off" maxlength="30" @input="f.nameTouched = true" /></FieldRow>
        <FieldRow label="Short name" for="sn"><input id="sn" v-model="f.short" :placeholder="f.name.trim() || 'Same as name'" autocomplete="off" maxlength="12" @input="f.shortTouched = true" /></FieldRow>
        <FieldRow label="Bank" for="bk"><input id="bk" v-model="f.provider" placeholder="Landbank" autocomplete="off" maxlength="30" /></FieldRow>
      </div>
      <p class="mt-3 px-1 text-[13px] font-medium text-ink-2">Saved as an account you pay from. It shows under Accounts, not Cards.</p>
      <button type="submit" :disabled="!valid || saving" class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep disabled:opacity-40">
        {{ buttonLabel }}
      </button>
    </form>

    <form v-else @submit.prevent="save">
      <div class="overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Name" for="n"><input id="n" v-model="f.name" :placeholder="isCard ? 'BDO Visa' : step === 'subscription' ? 'Netflix' : 'Meralco'" autocomplete="off" @input="f.nameTouched = true" /></FieldRow>
        <FieldRow v-if="step === 'credit_card'" label="Card type" for="nw">
          <select id="nw" v-model="f.network"><option value="">Not set</option><option v-for="n in NETWORKS" :key="n.key" :value="n.key">{{ n.label }}</option></select>
        </FieldRow>
        <FieldRow v-if="isCard" :label="step === 'credit_card' ? 'Bank' : 'Provider'" for="bk"><input id="bk" v-model="f.provider" :placeholder="step === 'credit_card' ? 'BDO' : 'Atome'" autocomplete="off" maxlength="30" /></FieldRow>
        <FieldRow v-if="step === 'bill' || step === 'subscription'" label="Type" for="c">
          <select id="c" v-model="f.category">
            <option v-for="c in (step === 'bill' ? billCategories : subCategories)" :key="c[0]" :value="c[0]">{{ c[1] }}</option>
          </select>
        </FieldRow>
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
        <FieldRow label="Payday" for="pd">
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
          <select id="acc" v-model="f.account">
            <option v-if="archivedPick" :value="archivedPick.id">{{ archivedPick.name }} (archived)</option>
            <option v-for="a in money.activeAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
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
