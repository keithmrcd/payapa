<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AddSheet from '@/components/AddSheet.vue'

const route = useRoute()
const router = useRouter()
const sheetOpen = ref(false)

const tabs = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/payday', icon: 'payday', label: 'Payday' },
  { to: '/cards', icon: 'cards', label: 'Cards' },
  { to: '/history', icon: 'history', label: 'History' },
]
const isTab = computed(() => route.meta.tab)
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="safe-top sticky top-0 z-30 bg-stone-50/90 backdrop-blur dark:bg-stone-950/90">
      <div class="flex h-14 items-center gap-2 px-4">
        <button v-if="route.meta.back" class="-ml-2 grid size-11 place-items-center rounded-full" aria-label="Back" @click="router.back()">
          <AppIcon name="back" class="size-6" />
        </button>
        <h1 class="flex-1 text-xl font-semibold tracking-tight">
          <template v-if="route.name === 'home'">Payapa</template>
          <template v-else>{{ route.meta.title }}</template>
        </h1>
        <RouterLink v-if="route.name === 'home'" to="/settings" class="-mr-2 grid size-11 place-items-center rounded-full text-stone-600 dark:text-stone-300" aria-label="Settings">
          <AppIcon name="settings" class="size-6" />
        </RouterLink>
      </div>
    </header>

    <main class="flex-1 pb-28">
      <RouterView />
    </main>

    <template v-if="isTab">
      <button class="fixed right-5 z-30 grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-900/20 active:bg-brand-700"
              style="bottom: calc(5rem + env(safe-area-inset-bottom))" aria-label="Add new" @click="sheetOpen = true">
        <AppIcon name="plus" class="size-7" />
      </button>

      <nav class="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
        <ul class="grid h-16 grid-cols-4">
          <li v-for="t in tabs" :key="t.to">
            <RouterLink :to="t.to" class="flex h-full flex-col items-center justify-center gap-0.5 text-xs text-stone-500 dark:text-stone-400"
                        exact-active-class="!text-brand-700 dark:!text-brand-100 font-semibold">
              <AppIcon :name="t.icon" class="size-6" />
              {{ t.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
    </template>

    <AddSheet :open="sheetOpen" @close="sheetOpen = false" />
  </div>
</template>
