<!--
  Placeholder shown when a list has no items.
-->
<script setup lang="ts">
defineProps<{ message: string }>();
</script>

<template>
  <div class="rounded-lg border border-dashed border-blue-700 px-4 py-10 text-center">
    <p class="text-sm text-blue-200">{{ message }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
