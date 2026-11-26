<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { CloseCircleIcon } from '@/lib/icons'
import { registerSheet } from '@/lib/sheets'

const props = defineProps({ open: Boolean, title: String })
const emit = defineEmits(['close'])

const onKey = (e) => { if (e.key === 'Escape') emit('close') }
// While open, Android's Back closes this sheet (see lib/sheets.js and App.vue), like Escape does.
let unregister = null
watch(() => props.open, (o) => {
  document.documentElement.style.overflow = o ? 'hidden' : ''
  o ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)
  unregister?.()
  unregister = o ? registerSheet(() => emit('close')) : null
}, { immediate: true })
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  unregister?.()
  if (props.open) document.documentElement.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="scrim">
      <div v-if="open" class="fixed inset-0 z-40 bg-[rgba(12,14,16,.42)]" @click="emit('close')" />
    </Transition>
    <Transition name="sheet">
      <div v-if="open" role="dialog" aria-modal="true" :aria-label="title"
           class="safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-[28px] bg-surface shadow-[0_-8px_40px_rgba(0,0,0,.18)]">
        <div class="mx-auto mt-2.5 h-1 w-9 rounded-full bg-hairline" />
        <header class="flex items-center gap-2 px-5 pt-3 pb-1">
          <slot name="lead" />
          <h2 class="flex-1 text-lg font-bold tracking-tight">{{ title }}</h2>
          <button type="button" class="-mr-2 grid size-11 place-items-center rounded-full" aria-label="Close" @click="emit('close')">
            <CloseCircleIcon :size="28" color="var(--ink-3)" />
          </button>
        </header>
        <div class="overflow-y-auto px-5 pt-2 pb-5">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim-enter-active, .scrim-leave-active { transition: opacity .25s ease; }
.scrim-enter-from, .scrim-leave-to { opacity: 0; }
.sheet-enter-active { transition: transform .38s var(--ease-out-expo); }
.sheet-leave-active { transition: transform .22s ease-in; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); }
</style>
