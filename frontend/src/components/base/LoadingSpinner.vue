<!--
  Spinning indicator, optionally with a label (e.g. "Loading requests...").
-->
<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'md'; label?: string }>(), { size: 'md', label: '' });
</script>

<template>
  <span class="inline-flex items-center gap-2 text-blue-100" role="status">
    <span
      class="animate-spin rounded-full border-2 border-current border-t-transparent"
      :class="size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'"
    />
    <span v-if="label" class="text-sm">{{ label }}</span>
  </span>
</template>
