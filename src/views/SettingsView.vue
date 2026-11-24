<script setup>
const groups = [
  { title: 'Money', rows: ['Accounts', 'Payday rules', 'Reminder defaults'] },
  { title: 'Data', rows: ['Sign in and sync', 'Export CSV'] },
]
const version = __APP_VERSION__
</script>

<template>
  <section class="space-y-6 px-4">
    <div v-for="g in groups" :key="g.title">
      <h2 class="mb-2 px-1 text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">{{ g.title }}</h2>
      <ul class="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
        <li v-for="r in g.rows" :key="r" class="flex h-14 items-center justify-between px-4">
          <span>{{ r }}</span>
          <span class="text-xs text-stone-400">Soon</span>
        </li>
      </ul>
    </div>
    <p class="text-center text-xs text-stone-400">Payapa v{{ version }}</p>
  </section>
</template>
