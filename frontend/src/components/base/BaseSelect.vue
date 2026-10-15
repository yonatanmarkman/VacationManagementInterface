<!--
  Labelled dropdown. An optional `placeholder` adds a first "empty" option (e.g. "All statuses")
  whose value is ''.
-->
<script setup lang="ts">
import { useId } from 'vue';
import type { SelectOption } from './types';
import { CONTROL_CLASS, LABEL_CLASS, controlBorder } from './formStyles';

withDefaults(defineProps<{ label?: string; options: SelectOption[]; placeholder?: string }>(), {
  label: '',
  placeholder: '',
});

const model = defineModel<string>({ default: '' });
const id = useId();
</script>

<template>
  <div>
    <label v-if="label" :for="id" :class="LABEL_CLASS">{{ label }}</label>
    <select :id="id" v-model="model" :class="[CONTROL_CLASS, controlBorder(false)]">
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
