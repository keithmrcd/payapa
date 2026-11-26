<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import BottomSheet from './BottomSheet.vue'
import FieldRow from './FieldRow.vue'
import { AltArrowLeftIcon } from '@/lib/icons'
import { useSession } from '@/stores/session'
import { useUi } from '@/stores/ui'

// Sign in with an email and the code Supabase emails (6 to 10 digits). No password, no link.
const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])
const session = useSession()
const ui = useUi()

const step = ref('email') // 'email' | 'code' | 'name' (first sign-in, when the account has no name yet)
const first = ref('')
const email = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)
const wait = ref(0) // seconds before "Send a new code" works again
let tick = null

watch(() => props.open, (o) => {
  if (!o) return
  step.value = 'email'; code.value = ''; error.value = ''
})
onUnmounted(() => clearInterval(tick))

const validEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
// Supabase's code length is a project setting (6 to 10 digits), so accept any of them.
const validCode = computed(() => /^\d{6,10}$/.test(code.value.trim()))
const title = computed(() => ({ email: 'Sign in', code: 'Enter the code', name: 'What should we call you?' })[step.value])

function startWait() {
  wait.value = 60
  clearInterval(tick)
  tick = setInterval(() => { if (--wait.value <= 0) clearInterval(tick) }, 1000)
}

async function send() {
  if (!validEmail.value || busy.value) return
  busy.value = true; error.value = ''
  try {
    await session.sendCode(email.value)
    step.value = 'code'; code.value = ''
    startWait()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function verify() {
  if (!validCode.value || busy.value) return
  busy.value = true; error.value = ''
  try {
    await session.verify(email.value, code.value)
    if (session.needsName) { step.value = 'name'; first.value = ''; return }
    emit('close')
    ui.showToast('Signed in. Backing up your data.')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function saveName() {
  if (!first.value.trim()) return
  await session.saveName(first.value)
  emit('close')
  ui.showToast(`Signed in. Hi, ${first.value.trim()}!`)
}
// Android Back: from the code step back to the email; from the name step it's "Not now"; else close.
function sheetBack() {
  if (step.value === 'code') { step.value = 'email'; error.value = '' }
  else if (step.value === 'name') skipName()
  else emit('close')
}
function skipName() {
  session.needsName = false
  emit('close')
  ui.showToast('Signed in. Backing up your data.')
}
</script>

<template>
  <BottomSheet :open="open" :title="title" :back="sheetBack" @close="emit('close')">
    <template #lead>
      <button v-if="step === 'code'" type="button" class="-ml-2 grid size-11 place-items-center rounded-full" aria-label="Back" @click="step = 'email'; error = ''">
        <AltArrowLeftIcon :size="26" color="var(--ink)" />
      </button>
    </template>

    <form v-if="step === 'email'" @submit.prevent="send">
      <p class="text-[15px] font-medium text-ink-2">Back up your bills and payments, and get them back on a new phone. We'll email you a sign-in code.</p>
      <div class="mt-4 overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Email" for="si-email"><input id="si-email" v-model="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" autocapitalize="off" spellcheck="false" /></FieldRow>
      </div>
      <p v-if="error" class="mt-2 px-1 text-sm font-semibold text-late" role="alert">{{ error }}</p>
      <button type="submit" :disabled="!validEmail || busy" class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep disabled:opacity-40">
        {{ busy ? 'Sending…' : 'Send code' }}
      </button>
    </form>

    <form v-else-if="step === 'name'" @submit.prevent="saveName">
      <p class="text-[15px] font-medium text-ink-2">Your first name, for the greeting on Home. It's saved with your account, so a new phone knows it too.</p>
      <div class="mt-4 overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="First name" for="si-name"><input id="si-name" v-model="first" autocomplete="given-name" autocapitalize="words" maxlength="40" placeholder="Keith" /></FieldRow>
      </div>
      <button type="submit" :disabled="!first.trim()" class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep disabled:opacity-40">Save</button>
      <button type="button" class="mt-2 h-12 w-full text-[15px] font-bold text-ink-2" @click="skipName">Not now</button>
    </form>

    <form v-else @submit.prevent="verify">
      <p class="text-[15px] font-medium text-ink-2">We sent a code to <strong class="text-ink">{{ email.trim() }}</strong>. It may take a minute.</p>
      <div class="mt-4 overflow-hidden rounded-2xl bg-surface-2">
        <FieldRow label="Code" for="si-code"><input id="si-code" v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="12345678" class="num tracking-[0.2em]" /></FieldRow>
      </div>
      <p v-if="error" class="mt-2 px-1 text-sm font-semibold text-late" role="alert">{{ error }}</p>
      <button type="submit" :disabled="!validCode || busy" class="mt-6 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep disabled:opacity-40">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
      <button type="button" :disabled="wait > 0 || busy" class="mt-2 h-12 w-full text-[15px] font-bold text-ink-2 disabled:opacity-50" @click="send">
        {{ wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code' }}
      </button>
    </form>
  </BottomSheet>
</template>
