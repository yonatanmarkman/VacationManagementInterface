<!--
  Inline message box for errors, successes and information. Extra content (e.g. a list of
  conflicts) can be passed in the default slot. Emits `dismiss` when closable.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'error' | 'success' | 'info';
    message?: string | null;
    dismissible?: boolean;
  }>(),
  { variant: 'info', message: null, dismissible: false },
);
const emit = defineEmits<{ dismiss: [] }>();

const VARIANTS = {
  error: 'border-red-400/50 bg-red-500/15 text-red-100',
  success: 'border-green-400/50 bg-green-500/15 text-green-100',
  info: 'border-blue-400/50 bg-blue-500/15 text-blue-100',
};
</script>

<template>
  <div
    v-if="message || $slots.default"
    class="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
    :class="VARIANTS[variant]"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <div class="flex-1">
      <p v-if="message">{{ message }}</p>
      <slot />
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="opacity-70 hover:opacity-100"
      aria-label="Dismiss"
      @click="emit('dismiss')"
    >
      ✕
    </button>
  </div>
</template>
