<!--
  Labelled multi-line text field with a character counter when `maxlength` is set.
-->
<script setup lang="ts">
import { useId } from 'vue';
import { CONTROL_CLASS, ERROR_CLASS, HINT_CLASS, LABEL_CLASS, controlBorder } from './formStyles';

withDefaults(
  defineProps<{
    label?: string;
    error?: string | null;
    rows?: number;
    maxlength?: number;
    placeholder?: string;
  }>(),
  { label: '', error: null, rows: 3, maxlength: undefined, placeholder: '' },
);

const model = defineModel<string>({ default: '' });
const id = useId();
</script>

<template>
  <div>
    <label v-if="label" :for="id" :class="LABEL_CLASS">{{ label }}</label>
    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :class="[CONTROL_CLASS, controlBorder(Boolean(error)), 'resize-y']"
      :aria-invalid="Boolean(error)"
    />
    <p v-if="error" :class="ERROR_CLASS">{{ error }}</p>
    <p v-else-if="maxlength" :class="[HINT_CLASS, 'text-right']">
      {{ model.length }} / {{ maxlength }}
    </p>
  </div>
</template>
