<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import FieldRow from './FieldRow.vue'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'
import { NETWORKS, debitBanksFor, debitName, debitShort } from '@/lib/issuers'

// `account` null = add. Archiving is the parent's job (it owns the confirm sheet).
const props = defineProps({ open: Boolean, account: Object })
const emit = defineEmits(['close', 'archive'])
const money = useMoney()
const ui = useUi()

const types = [['bank', 'Bank'], ['ewallet', 'E-wallet'], ['debit', 'Debit card'], ['cash', 'Cash']]
const name = ref('')
const short = ref('')
const type = ref('bank')
// Debit cards: card type and bank only, never a card number.
const network = ref('visa')
const bank = ref('')
const otherBank = ref('')
const nameTouched = ref(false)
const shortTouched = ref(false)
const bankName = computed(() => (bank.value === 'other' ? otherBank.value.trim() : bank.value))
const saving = ref(false)
const editing = ref(null) // kept after close so the title doesn't flicker

watch(() => props.open, (o) => {
  if (!o) return
  editing.value = props.account ?? null
  name.value = props.account?.name ?? ''
  short.value = props.account && props.account.short !== props.account.name ? props.account.short : ''
  type.value = props.account?.type ?? 'bank'
  network.value = props.account?.network ?? 'visa'
  const b = props.account?.bank ?? ''
  const listed = debitBanksFor(network.value).includes(b)
  bank.value = !b ? '' : listed ? b : 'other'
  otherBank.value = listed ? '' : b
  nameTouched.value = !!props.account
  shortTouched.value = !!props.account
})

// A debit card's names follow its bank and type until the owner types their own.
// A bank picked for one card type that doesn't offer the new type is cleared, not saved by mistake.
watch(network, (n) => {
  if (bank.value && bank.value !== 'other' && !debitBanksFor(n).includes(bank.value)) bank.value = ''
})
watch([type, network, bankName], () => {
  if (type.value !== 'debit' || !bankName.value) return
  if (!nameTouched.value) name.value = debitName(bankName.value, network.value)
  if (!shortTouched.value) short.value = debitShort(bankName.value)
})


const title = computed(() => (editing.value ? `Edit ${editing.value.name}` : 'New account'))
const valid = computed(() => !!name.value.trim() && (type.value !== 'debit' || !!bankName.value))

async function save() {
  if (!valid.value || saving.value) return
  const n = name.value.trim()
  const debit = type.value === 'debit'
  const fields = { name: n, short: short.value.trim() || n, type: type.value, network: debit ? network.value : null, bank: debit ? bankName.value : null }
  const wasEditing = editing.value
  saving.value = true
  try {
    if (wasEditing) await money.updateAccount(wasEditing.id, fields)
    else await money.addAccount(fields)
    emit('close')
    ui.showToast(wasEditing ? `${n} updated` : `${n} added`)
  } catch (e) {
    console.error(e)
    ui.showToast("Couldn't save. Try again.")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="emit('close')">
    <form @submit.prevent="save">
      <div class="overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Name" for="an"><input id="an" v-model="name" placeholder="BDO" autocomplete="off" maxlength="30" @input="nameTouched = true" /></FieldRow>
        <FieldRow label="Short name" for="as"><input id="as" v-model="short" :placeholder="name.trim() || 'Same as name'" autocomplete="off" maxlength="12" @input="shortTouched = true" /></FieldRow>
        <FieldRow label="Type" for="at">
          <select id="at" v-model="type"><option v-for="t in types" :key="t[0]" :value="t[0]">{{ t[1] }}</option></select>
        </FieldRow>
        <template v-if="type === 'debit'">
          <FieldRow label="Card type" for="anw">
            <select id="anw" v-model="network"><option v-for="n in NETWORKS" :key="n.key" :value="n.key">{{ n.label }}</option></select>
          </FieldRow>
          <FieldRow label="Bank" for="abk">
            <select id="abk" v-model="bank">
              <option value="" disabled>Choose</option>
              <option v-for="b in debitBanksFor(network)" :key="b" :value="b">{{ b }}</option>
              <option value="other">Other bank</option>
            </select>
          </FieldRow>
          <FieldRow v-if="bank === 'other'" label="Bank name" for="abo"><input id="abo" v-model="otherBank" placeholder="Landbank" autocomplete="off" maxlength="30" /></FieldRow>
        </template>
      </div>
      <button type="submit" :disabled="!valid || saving" class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep disabled:opacity-40">
        {{ editing ? 'Save changes' : 'Add account' }}
      </button>
      <button v-if="editing" type="button" class="mt-2.5 h-13 w-full rounded-2xl bg-surface-2 text-base font-bold text-ink-2" @click="emit('archive', editing)">Archive {{ editing.name }}</button>
    </form>
  </BottomSheet>
</template>
