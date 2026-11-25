<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import FieldRow from './FieldRow.vue'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'

// `account` null = add. Archiving is the parent's job (it owns the confirm sheet).
const props = defineProps({ open: Boolean, account: Object })
const emit = defineEmits(['close', 'archive'])
const money = useMoney()
const ui = useUi()

const types = [['bank', 'Bank'], ['ewallet', 'E-wallet'], ['cash', 'Cash']]
const name = ref('')
const short = ref('')
const type = ref('bank')
const saving = ref(false)
const editing = ref(null) // kept after close so the title doesn't flicker

watch(() => props.open, (o) => {
  if (!o) return
  editing.value = props.account ?? null
  name.value = props.account?.name ?? ''
  short.value = props.account && props.account.short !== props.account.name ? props.account.short : ''
  type.value = props.account?.type ?? 'bank'
})

const title = computed(() => (editing.value ? `Edit ${editing.value.name}` : 'New account'))
const valid = computed(() => !!name.value.trim())

async function save() {
  if (!valid.value || saving.value) return
  const n = name.value.trim()
  const fields = { name: n, short: short.value.trim() || n, type: type.value }
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
        <FieldRow label="Name" for="an"><input id="an" v-model="name" placeholder="BDO" autocomplete="off" maxlength="30" /></FieldRow>
        <FieldRow label="Short name" for="as"><input id="as" v-model="short" :placeholder="name.trim() || 'Same as name'" autocomplete="off" maxlength="12" /></FieldRow>
        <FieldRow label="Type" for="at">
          <select id="at" v-model="type"><option v-for="t in types" :key="t[0]" :value="t[0]">{{ t[1] }}</option></select>
        </FieldRow>
      </div>
      <button type="submit" :disabled="!valid || saving" class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep disabled:opacity-40">
        {{ editing ? 'Save changes' : 'Add account' }}
      </button>
      <button v-if="editing" type="button" class="mt-2.5 h-13 w-full rounded-2xl bg-surface-2 text-base font-bold text-ink-2" @click="emit('archive', editing)">Archive {{ editing.name }}</button>
    </form>
  </BottomSheet>
</template>
