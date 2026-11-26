<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import GroupList from '@/components/GroupList.vue'
import SignInSheet from '@/components/SignInSheet.vue'
import { useSession } from '@/stores/session'
import { syncLabel } from '@/lib/format'

const session = useSession()
const signInOpen = ref(false)

// Re-render "Synced 2 min ago" as time passes.
const now = ref(new Date())
let tick = null
onMounted(() => { tick = setInterval(() => { now.value = new Date() }, 30000) })
onUnmounted(() => clearInterval(tick))

const signedIn = computed(() => !!session.user)
const label = computed(() => syncLabel(session.status, session.lastSynced, now.value))
const tone = computed(() => (session.status === 'ok' ? 'text-paid' : 'text-ink-2'))

</script>

<template>
  <div class="px-4">
    <template v-if="session.status === 'unavailable'">
      <GroupList>
        <div class="px-4 py-4">
          <p class="text-[15px] font-semibold">Not available in this build</p>
          <p class="mt-0.5 text-[13px] font-medium text-ink-2">This copy of Payapa was built without a backup server. Your data stays on this phone.</p>
        </div>
      </GroupList>
    </template>

    <template v-else-if="!signedIn">
      <GroupList>
        <div class="px-4 py-4">
          <p class="text-[15px] font-semibold">Back up and sync</p>
          <p class="mt-0.5 text-[13px] font-medium text-ink-2">Sign in to back up your bills, cards and payments, and get them back on a new phone. Payapa keeps working offline either way.</p>
        </div>
      </GroupList>
      <button type="button" class="mt-5 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="signInOpen = true">Sign in</button>
    </template>

    <template v-else>
      <GroupList>
        <div class="flex min-h-16 items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="text-[15px] font-semibold">Status</p>
            <p class="text-[13px] font-medium" :class="tone" aria-live="polite">{{ label }}</p>
          </div>
          <button v-if="session.status === 'auth'" type="button" class="h-11 shrink-0 rounded-full bg-brand px-4 text-[14px] font-bold text-brand-ink" @click="signInOpen = true">Sign in</button>
          <button v-else type="button" :disabled="session.status === 'syncing'" class="h-11 shrink-0 rounded-full bg-surface-2 px-4 text-[14px] font-bold text-ink disabled:opacity-50" @click="session.sync()">Sync now</button>
        </div>
        <div class="srow flex min-h-14 items-center gap-3 px-4">
          <span class="flex-1 text-[15px] font-semibold">Account</span>
          <span class="min-w-0 truncate text-[14px] font-medium text-ink-2">{{ session.user.email }}</span>
        </div>
      </GroupList>
      <p class="mt-2 px-1 text-[13px] font-medium text-ink-2">Changes save on this phone first and back up when you're online. Theme, name and reminder settings stay on this phone.</p>
    </template>

    <SignInSheet :open="signInOpen" @close="signInOpen = false" />
  </div>
</template>

<style scoped>
.srow { background: linear-gradient(var(--hairline), var(--hairline)) right top / calc(100% - 2rem) 1px no-repeat; }
</style>
