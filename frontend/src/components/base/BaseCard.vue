<!--
  Panel that frames a screen section, with an optional title, subtitle and header actions.
-->
<script setup lang="ts">
withDefaults(defineProps<{ title?: string; subtitle?: string }>(), { title: '', subtitle: '' });
</script>

<template>
  <section class="rounded-xl border border-blue-800 bg-blue-900 p-4 shadow-lg sm:p-6">
    <header
      v-if="title || $slots.actions"
      class="mb-4 flex flex-wrap items-start justify-between gap-3"
    >
      <div>
        <h2 class="text-lg font-semibold text-white">{{ title }}</h2>
        <p v-if="subtitle" class="mt-1 text-sm text-blue-200">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>
