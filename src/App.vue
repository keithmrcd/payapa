<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home2Icon, CalendarIcon, CardIcon, History2Icon, AltArrowLeftIcon, AddIcon } from '@/lib/icons'
import AddSheet from '@/components/AddSheet.vue'
import MarkPaidSheet from '@/components/MarkPaidSheet.vue'
import { useUi } from '@/stores/ui'
import { useMoney } from '@/stores/money'

const route = useRoute()
const router = useRouter()
const ui = useUi()
const money = useMoney()

// Load the database before any screen renders. A failure shows a retry, never a wipe.
const loadFailed = ref(false)
async function load() {
  loadFailed.value = false
  try { await money.load() } catch (e) { console.error(e); loadFailed.value = true }
}
// Coming back to the app after midnight moves Home to the new day.
const onVisible = () => { if (document.visibilityState === 'visible') money.refreshToday() }
onMounted(() => { load(); document.addEventListener('visibilitychange', onVisible) })
onUnmounted(() => document.removeEventListener('visibilitychange', onVisible))

const tabs = [
  { to: '/', icon: Home2Icon, label: 'Home', name: 'home' },
  { to: '/payday', icon: CalendarIcon, label: 'Payday', name: 'payday' },
  { to: '/cards', icon: CardIcon, label: 'Cards', name: 'cards' },
  { to: '/history', icon: History2Icon, label: 'History', name: 'history' },
]
// Leaving a screen (including the Android back gesture) closes any open sheet.
watch(() => route.fullPath, () => { ui.closePay(); ui.closeAdd() })

const isTab = computed(() => !!route.meta.tab)
const activeTab = computed(() => route.meta.tabOf ?? route.name)
</script>

<template>
  <div v-if="loadFailed" class="safe-top mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
    <p class="text-[15px] font-semibold text-ink-2">Couldn't open your data.</p>
    <button type="button" class="h-12 rounded-2xl bg-brand px-6 text-base font-bold text-brand-ink active:bg-brand-deep" @click="load">Retry</button>
  </div>

  <div v-else-if="money.ready" class="mx-auto flex min-h-dvh max-w-xl flex-col">
    <header v-if="route.meta.back" class="safe-top sticky top-0 z-30 bg-ground/90 backdrop-blur-md">
      <div class="flex h-14 items-center px-2">
        <button type="button" class="grid size-11 place-items-center rounded-full" aria-label="Back" @click="router.back()">
          <AltArrowLeftIcon :size="28" color="var(--ink)" />
        </button>
        <h1 class="flex-1 truncate pr-11 text-center text-[17px] font-bold">{{ route.meta.title }}</h1>
      </div>
    </header>

    <main class="flex-1" :class="isTab ? 'pb-28' : 'pb-10'">
      <RouterView />
    </main>

    <nav v-if="isTab" class="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl border-t border-hairline bg-surface/95 backdrop-blur-md" aria-label="Main">
      <ul class="grid h-[64px] grid-cols-5 items-center">
        <li v-for="t in tabs.slice(0, 2)" :key="t.to" class="h-full">
          <RouterLink :to="t.to" class="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-bold"
                      :class="activeTab === t.name ? 'text-brand-text' : 'text-ink-3'" :aria-current="activeTab === t.name ? 'page' : undefined">
            <component :is="t.icon" :size="26" :color="activeTab === t.name ? 'var(--brand-text)' : 'var(--ink-3)'" :secondaryOpacity="activeTab === t.name ? 0.4 : 0.32" />
            {{ t.label }}
          </RouterLink>
        </li>
        <li class="grid h-full place-items-center">
          <button type="button" aria-label="Add bill, subscription, or card"
                  class="add grid size-[52px] place-items-center rounded-[18px] bg-brand text-brand-ink transition-transform active:scale-95 active:bg-brand-deep"
                  @click="ui.openAdd()">
            <AddIcon :size="28" color="#fff" :strokeWidth="2.4" />
          </button>
        </li>
        <li v-for="t in tabs.slice(2)" :key="t.to" class="h-full">
          <RouterLink :to="t.to" class="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-bold"
                      :class="activeTab === t.name ? 'text-brand-text' : 'text-ink-3'" :aria-current="activeTab === t.name ? 'page' : undefined">
            <component :is="t.icon" :size="26" :color="activeTab === t.name ? 'var(--brand-text)' : 'var(--ink-3)'" :secondaryOpacity="activeTab === t.name ? 0.4 : 0.32" />
            {{ t.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <AddSheet />
    <MarkPaidSheet />

    <Transition name="toast">
      <div v-if="ui.toast" role="status" class="toast fixed inset-x-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink py-3 pr-2 pl-4 text-[14px] font-semibold text-ground shadow-[0_10px_30px_rgba(0,0,0,.25)]">
        <span class="flex-1">{{ ui.toast.text }}</span>
        <button v-if="ui.toast.undo" type="button" class="h-9 rounded-xl px-3 font-bold text-on-brand-2" @click="ui.toast.undo(); ui.toast = null">Undo</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.add { box-shadow: 0 6px 16px -4px color-mix(in oklab, var(--brand) 55%, transparent), 0 1px 2px rgba(0,0,0,.1); }
.toast { bottom: calc(84px + env(safe-area-inset-bottom)); }
.toast-enter-active { transition: transform .4s var(--ease-out-expo), opacity .2s; }
.toast-leave-active { transition: opacity .2s; }
.toast-enter-from { transform: translateY(16px); opacity: 0; }
.toast-leave-to { opacity: 0; }
</style>
