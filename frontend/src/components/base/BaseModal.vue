<!--
  Dialog shown above the page. Closes on Escape, on the backdrop or on the close button
  (emits `close`; the parent owns the `open` state). Content goes in the default slot,
  buttons in the `footer` slot.
-->
<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';

const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close');
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown);
    } else {
      window.removeEventListener('keydown', onKeydown);
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/80 p-4"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-lg rounded-xl border border-blue-700 bg-blue-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="flex items-center justify-between border-b border-blue-800 px-5 py-3">
          <h3 class="text-base font-semibold text-white">{{ title }}</h3>
          <button
            type="button"
            class="rounded p-1 text-blue-200 hover:bg-blue-800 hover:text-white"
            aria-label="Close"
            @click="emit('close')"
          >
            ✕
          </button>
        </header>
        <div class="px-5 py-4">
          <slot />
        </div>
        <footer
          v-if="$slots.footer"
          class="flex justify-end gap-2 border-t border-blue-800 px-5 py-3"
        >
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
