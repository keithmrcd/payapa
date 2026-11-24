<script setup>
defineProps({ title: String, aside: String, tone: { type: String, default: 'default' } })
</script>

<template>
  <section class="mt-7 first:mt-0">
    <header v-if="title" class="mb-2 flex items-baseline justify-between px-1">
      <h2 class="text-[15px] font-bold tracking-tight" :class="tone === 'late' ? 'text-late' : 'text-ink'">{{ title }}</h2>
      <span v-if="aside" class="num text-[13px] font-semibold text-ink-2">{{ aside }}</span>
    </header>
    <div class="overflow-hidden rounded-group bg-surface shadow-[0_1px_2px_rgba(20,20,15,.04)]">
      <slot />
    </div>
  </section>
</template>
