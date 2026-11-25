<script setup>
import BottomSheet from '@/components/BottomSheet.vue'

defineProps({ open: Boolean, title: String, body: String, confirmLabel: String })
const emit = defineEmits(['confirm', 'close'])
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="emit('close')">
    <p class="text-[15px] font-medium text-ink-2">{{ body }}</p>
    <div class="mt-5 flex flex-col gap-2.5">
      <button type="button" class="h-13 w-full rounded-2xl bg-surface-2 text-base font-bold text-ink" @click="emit('confirm')">{{ confirmLabel }}</button>
      <button type="button" class="h-13 w-full rounded-2xl text-base font-bold text-ink-2" @click="emit('close')">Cancel</button>
    </div>
  </BottomSheet>
</template>
