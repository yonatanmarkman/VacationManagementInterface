<!--
  Button used everywhere in the app. Variants: primary (blue), secondary, danger, ghost.
  Shows a spinner and is disabled while `loading`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md';
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false },
);

const VARIANTS = {
  primary: 'bg-blue-500 text-white hover:bg-blue-400',
  secondary: 'bg-blue-800 text-white ring-1 ring-blue-600 hover:bg-blue-700',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  ghost: 'text-blue-100 hover:bg-blue-800 hover:text-white',
};
const SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' };

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
  'disabled:cursor-not-allowed disabled:opacity-50',
  VARIANTS[props.variant],
  SIZES[props.size],
  props.block ? 'w-full' : '',
]);
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading">
    <LoadingSpinner v-if="loading" size="sm" />
    <slot />
  </button>
</template>
