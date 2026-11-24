<script setup>
defineProps({ label: String, for: String })
</script>

<template>
  <div class="field flex min-h-14 items-center gap-3 px-4">
    <label :for="$props.for" class="w-28 shrink-0 text-[15px] font-medium text-ink-2">{{ label }}</label>
    <div class="min-w-0 flex-1"><slot /></div>
  </div>
</template>

<style scoped>
.field + .field { box-shadow: inset 0 1px 0 var(--hairline); }
.field :deep(input), .field :deep(select) {
  width: 100%; background: transparent; text-align: right; font-weight: 600; color: var(--ink); outline: none;
  appearance: none; -webkit-appearance: none; min-height: 3.5rem;
}
.field :deep(select) { text-align-last: right; padding-right: 0; }
.field :deep(input::placeholder) { color: var(--ink-3); font-weight: 500; }
.field:focus-within { background: color-mix(in oklab, var(--brand) 5%, var(--surface)); }
</style>
