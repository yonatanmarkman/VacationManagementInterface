<!--
  Inline message box for errors, successes and information. Extra content (e.g. a list of
  conflicts) can be passed in the default slot. Emits `dismiss` when closable.
-->
<script setup lang="ts">
import { Comment, useSlots } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'error' | 'success' | 'info';
    message?: string | null;
    dismissible?: boolean;
  }>(),
  { variant: 'info', message: null, dismissible: false },
);
const emit = defineEmits<{ dismiss: [] }>();
const slots = useSlots();

/**
 * Shown only when there is something to say. A slot whose content is hidden by `v-if`
 * renders only comment nodes, which must not count as content (otherwise an empty box appears).
 */
function isVisible(): boolean {
  const slotContent = slots.default?.() ?? [];
  return Boolean(props.message) || slotContent.some((node) => node.type !== Comment);
}

const VARIANTS = {
  error: 'border-red-400/50 bg-red-500/15 text-red-100',
  success: 'border-green-400/50 bg-green-500/15 text-green-100',
  info: 'border-blue-400/50 bg-blue-500/15 text-blue-100',
};
</script>

<template>
  <div
    v-if="isVisible()"
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
