<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMoney } from '@/stores/money'
import CardFace from '@/components/CardFace.vue'
import { peso } from '@/lib/format'
import { useUi } from '@/stores/ui'

const money = useMoney()
const ui = useUi()
const occFor = (c) => money.occurrences.find((o) => o.type === 'card' && o.id === c.id)
const credit = computed(() => money.activeCards.filter((c) => c.type === 'credit_card'))
const later = computed(() => money.activeCards.filter((c) => c.type === 'pay_later'))
const owed = computed(() => money.activeCards.reduce((n, c) => n + (occFor(c)?.left ?? 0), 0))
</script>

<template>
  <div class="safe-top px-4">
    <header class="pt-8 pb-4">
      <h1 class="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">Cards</h1>
      <p class="num mt-0.5 text-[14px] font-medium text-ink-2"><strong class="font-bold text-ink">{{ peso(owed) }}</strong> left on this cycle's statements</p>
    </header>

    <div v-if="!money.activeCards.length" class="pt-2">
      <p class="text-[15px] font-semibold">No cards yet</p>
      <p class="mt-1 text-[14px] font-medium text-ink-2">Add a credit card or a pay-later account to track its statements.</p>
      <button type="button" class="mt-4 h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-ink active:bg-brand-deep" @click="ui.openAdd()">Add a card</button>
    </div>

    <section v-if="credit.length">
      <h2 class="mb-2 px-1 text-[15px] font-bold">Credit cards</h2>
      <ul class="space-y-3">
        <li v-for="c in credit" :key="c.id">
          <RouterLink :to="`/cards/${c.id}`" class="block active:scale-[.99] transition-transform"><CardFace :card="c" :occ="occFor(c)" /></RouterLink>
        </li>
      </ul>
    </section>

    <section v-if="later.length" :class="credit.length ? 'mt-7' : ''">
      <h2 class="mb-2 px-1 text-[15px] font-bold">Pay later</h2>
      <ul class="space-y-3">
        <li v-for="c in later" :key="c.id">
          <RouterLink :to="`/cards/${c.id}`" class="block active:scale-[.99] transition-transform"><CardFace :card="c" :occ="occFor(c)" compact /></RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
