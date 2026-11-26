<script setup>
import { NETWORKS } from '@/lib/issuers'
import { ref } from 'vue'
import { useMoney } from '@/stores/money'
import { useUi } from '@/stores/ui'
import GroupList from '@/components/GroupList.vue'
import AccountSheet from '@/components/AccountSheet.vue'
import ConfirmSheet from '@/components/ConfirmSheet.vue'
import { Wallet2Icon, AltArrowRightIcon } from '@/lib/icons'

const money = useMoney()
const ui = useUi()
const typeLabel = { bank: 'Bank', ewallet: 'E-wallet', cash: 'Cash', debit: 'Debit card' }

const sheetOpen = ref(false)
const target = ref(null)
const confirmFor = ref(null) // kept after close so the copy doesn't flicker
const confirmOpen = ref(false)

function openSheet(account) { target.value = account; sheetOpen.value = true }
function askArchive(account) {
  sheetOpen.value = false
  confirmFor.value = account
  confirmOpen.value = true
}

let archiving = false
async function archive() {
  confirmOpen.value = false
  const a = confirmFor.value
  if (!a || archiving || money.account(a.id)?.archivedAt) return
  archiving = true
  try {
    await money.archiveAccount(a.id)
  } catch (e) {
    console.error(e)
    ui.showToast("Couldn't archive. Try again.")
    return
  } finally {
    archiving = false
  }
  ui.showToast(`${a.name} archived`, async () => {
    try { await money.unarchiveAccount(a.id) } catch { ui.showToast("Couldn't undo. Try again.") }
  })
}
</script>

<template>
  <div class="px-4">
    <GroupList v-if="money.activeAccounts.length">
      <button v-for="a in money.activeAccounts" :key="a.id" type="button" class="arow flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-surface-2" @click="openSheet(a)">
        <span class="grid size-9 place-items-center rounded-xl" style="background: color-mix(in oklab, #0b6b63 13%, var(--surface))"><Wallet2Icon :size="20" color="#0b6b63" /></span>
        <span class="min-w-0 flex-1 truncate text-[15px] font-semibold">{{ a.name }}</span>
        <span class="text-[14px] font-medium text-ink-2">{{ typeLabel[a.type] }}<template v-if="a.type === 'debit' && a.network"> · {{ NETWORKS.find((n) => n.key === a.network)?.label }}</template></span>
        <AltArrowRightIcon :size="18" color="var(--ink-3)" />
      </button>
    </GroupList>
    <p v-else class="text-[14px] font-medium text-ink-2">No accounts yet. Add the ones you pay from.</p>

    <button type="button" class="mt-5 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="openSheet(null)">Add account</button>

    <AccountSheet :open="sheetOpen" :account="target" @close="sheetOpen = false" @archive="askArchive" />
    <ConfirmSheet :open="confirmOpen" :title="`Archive ${confirmFor?.name ?? ''}?`" body="It leaves the account pickers. Past payments keep its name." :confirm-label="`Archive ${confirmFor?.name ?? ''}`" @confirm="archive" @close="confirmOpen = false" />
  </div>
</template>

<style scoped>
.arow + .arow { background: linear-gradient(var(--hairline), var(--hairline)) right top / calc(100% - 4rem) 1px no-repeat; }
</style>
