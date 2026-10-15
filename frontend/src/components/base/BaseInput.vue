<!--
  Labelled text/email/password/date input with an optional hint and error message.
  Extra attributes (min, max, required, autocomplete, ...) are passed to the <input>.
-->
<script setup lang="ts">
import { useId } from 'vue';
import { CONTROL_CLASS, ERROR_CLASS, HINT_CLASS, LABEL_CLASS, controlBorder } from './formStyles';

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{ label?: string; type?: string; error?: string | null; hint?: string }>(),
  { label: '', type: 'text', error: null, hint: '' },
);

const model = defineModel<string>({ default: '' });
const id = useId();
</script>

<template>
  <div>
    <label v-if="label" :for="id" :class="LABEL_CLASS">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type"
      :class="[CONTROL_CLASS, controlBorder(Boolean(error))]"
      :aria-invalid="Boolean(error)"
      v-bind="$attrs"
    />
    <p v-if="error" :class="ERROR_CLASS">{{ error }}</p>
    <p v-else-if="hint" :class="HINT_CLASS">{{ hint }}</p>
  </div>
</template>
