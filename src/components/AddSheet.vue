<script setup>
import AppIcon from './AppIcon.vue'
defineProps({ open: Boolean })
const emit = defineEmits(['close'])

// Forms arrive in milestones 2 and 4; for now this is the chooser.
const kinds = [
  { key: 'bill', icon: 'bill', label: 'Bill', hint: 'Electric, water, internet, rent' },
  { key: 'subscription', icon: 'repeat', label: 'Subscription', hint: 'Netflix, Spotify, iCloud' },
  { key: 'card', icon: 'cards', label: 'Card or pay later', hint: 'BDO, Atome, SPayLater' },
  { key: 'loan', icon: 'loan', label: 'Loan', hint: 'Fixed monthly payments' },
]
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="fixed inset-0 z-40 bg-black/40" @click="emit('close')" />
  </Transition>
  <Transition name="slide">
    <div v-if="open" role="dialog" aria-label="Add new"
         class="safe-bottom fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white px-5 pt-3 pb-6 shadow-xl dark:bg-stone-900">
      <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-300 dark:bg-stone-700" />
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Add new</h2>
        <button class="grid size-11 place-items-center rounded-full text-stone-500" aria-label="Close" @click="emit('close')">
          <AppIcon name="close" class="size-5" />
        </button>
      </div>
      <ul class="space-y-2">
        <li v-for="k in kinds" :key="k.key">
          <button class="flex w-full items-center gap-4 rounded-2xl p-3 text-left active:bg-stone-100 dark:active:bg-stone-800">
            <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100">
              <AppIcon :name="k.icon" class="size-5" />
            </span>
            <span>
              <span class="block font-medium">{{ k.label }}</span>
              <span class="block text-sm text-stone-500 dark:text-stone-400">{{ k.hint }}</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform .25s ease-out; }
.slide-enter-from, .slide-leave-to { transform: translateY(100%); }
</style>
