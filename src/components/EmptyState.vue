<script setup>
import AppIcon from './AppIcon.vue'
defineProps({ icon: String, title: String, body: String })
</script>

<template>
  <div class="flex flex-col items-center px-8 py-16 text-center">
    <div class="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100">
      <AppIcon :name="icon" class="size-7" />
    </div>
    <h2 class="text-base font-semibold">{{ title }}</h2>
    <p class="mt-1 max-w-64 text-sm text-stone-500 dark:text-stone-400">{{ body }}</p>
    <slot />
  </div>
</template>
