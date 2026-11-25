<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMoney } from '@/stores/money'
import CardFace from '@/components/CardFace.vue'
import { peso } from '@/lib/format'

const money = useMoney()
const occFor = (c) => money.occurrences.find((o) => o.type === 'card' && o.id === c.id)
const credit = computed(() => money.cards.filter((c) => c.type === 'credit_card'))
const later = computed(() => money.cards.filter((c) => c.type === 'pay_later'))
const owed = computed(() => money.cards.reduce((n, c) => n + (occFor(c)?.left ?? 0), 0))
</script>

<template>
  <div class="safe-top px-4">
    <header class="pt-8 pb-4">
      <h1 class="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">Cards</h1>
      <p class="num mt-0.5 text-[14px] font-medium text-ink-2"><strong class="font-bold text-ink">{{ peso(owed) }}</strong> left on this cycle's statements</p>
    </header>

    <section>
      <h2 class="mb-2 px-1 text-[15px] font-bold">Credit cards</h2>
      <ul class="space-y-3">
        <li v-for="c in credit" :key="c.id">
          <RouterLink :to="`/cards/${c.id}`" class="block active:scale-[.99] transition-transform"><CardFace :card="c" :occ="occFor(c)" /></RouterLink>
        </li>
      </ul>
    </section>

    <section class="mt-7">
      <h2 class="mb-2 px-1 text-[15px] font-bold">Pay later</h2>
      <ul class="space-y-3">
        <li v-for="c in later" :key="c.id">
          <RouterLink :to="`/cards/${c.id}`" class="block active:scale-[.99] transition-transform"><CardFace :card="c" :occ="occFor(c)" compact /></RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
