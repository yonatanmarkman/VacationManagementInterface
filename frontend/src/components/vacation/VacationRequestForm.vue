<!--
  Form for the dates and reason of a vacation request. Used to submit a new request and to
  edit a Pending one. Checks the date rules on the client for quick feedback (the API checks
  them again) and emits `submit` with the values.
-->
<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { VacationRequestInput } from '@/api/vacationRequestsApi';
import AlertMessage from '@/components/base/AlertMessage.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseTextarea from '@/components/base/BaseTextarea.vue';
import { dayCount, earliestStartDate, formatDate } from '@/utils/dates';

const REASON_MAX_LENGTH = 500;

const props = withDefaults(
  defineProps<{
    initial?: Partial<VacationRequestInput>;
    submitLabel?: string;
    loading?: boolean;
    error?: string | null;
  }>(),
  { initial: () => ({}), submitLabel: 'Submit request', loading: false, error: null },
);
const emit = defineEmits<{ submit: [input: VacationRequestInput] }>();

const form = reactive({ startDate: '', endDate: '', reason: '' });
const touched = reactive({ startDate: false, endDate: false });
const minDate = earliestStartDate();

function reset(): void {
  form.startDate = props.initial.startDate ?? '';
  form.endDate = props.initial.endDate ?? '';
  form.reason = props.initial.reason ?? '';
  touched.startDate = false;
  touched.endDate = false;
}
watch(() => props.initial, reset, { immediate: true });

// Keep the end date valid when the start date moves past it.
watch(
  () => form.startDate,
  (startDate) => {
    if (startDate && (!form.endDate || form.endDate < startDate)) {
      form.endDate = startDate;
    }
  },
);

const errors = computed(() => ({
  startDate: !form.startDate
    ? 'Choose a start date.'
    : form.startDate < minDate
      ? `Vacations must start on ${formatDate(minDate)} or later.`
      : null,
  endDate: !form.endDate
    ? 'Choose an end date.'
    : form.startDate && form.endDate < form.startDate
      ? 'The end date must be on or after the start date.'
      : null,
}));

const isValid = computed(() => !errors.value.startDate && !errors.value.endDate);
const days = computed(() => (isValid.value ? dayCount(form.startDate, form.endDate) : 0));

function onSubmit(): void {
  touched.startDate = true;
  touched.endDate = true;
  if (!isValid.value) {
    return;
  }
  emit('submit', {
    startDate: form.startDate,
    endDate: form.endDate,
    reason: form.reason.trim() || null,
  });
}

defineExpose({ reset });
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <div class="grid gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.startDate"
        label="Start date"
        type="date"
        :min="minDate"
        required
        :error="touched.startDate ? errors.startDate : null"
        @blur="touched.startDate = true"
      />
      <BaseInput
        v-model="form.endDate"
        label="End date"
        type="date"
        :min="form.startDate || minDate"
        required
        :error="touched.endDate ? errors.endDate : null"
        @blur="touched.endDate = true"
      />
    </div>
    <p v-if="days > 0" class="text-sm text-blue-200">
      {{ days }} day{{ days === 1 ? '' : 's' }} of vacation
    </p>
    <BaseTextarea
      v-model="form.reason"
      label="Reason (optional)"
      :maxlength="REASON_MAX_LENGTH"
      placeholder="e.g. Family trip"
    />
    <AlertMessage variant="error" :message="error" />
    <div class="flex justify-end gap-2">
      <slot name="secondary-actions" />
      <BaseButton type="submit" :loading="loading">{{ submitLabel }}</BaseButton>
    </div>
  </form>
</template>
