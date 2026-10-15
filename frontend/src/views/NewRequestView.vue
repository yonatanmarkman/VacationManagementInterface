<!--
  Requester screen: submit a new vacation request.
-->
<script setup lang="ts">
import { ref } from 'vue';
import type { VacationRequestInput } from '@/api/vacationRequestsApi';
import { vacationRequestsApi } from '@/api/vacationRequestsApi';
import AlertMessage from '@/components/base/AlertMessage.vue';
import BaseCard from '@/components/base/BaseCard.vue';
import VacationRequestForm from '@/components/vacation/VacationRequestForm.vue';
import { useAsyncAction } from '@/composables/useAsyncAction';
import type { VacationRequest } from '@/types/api';
import { formatRange } from '@/utils/dates';

const form = ref<InstanceType<typeof VacationRequestForm> | null>(null);
const created = ref<VacationRequest | null>(null);
const { run, loading, error } = useAsyncAction(vacationRequestsApi.create);

async function submit(input: VacationRequestInput): Promise<void> {
  created.value = null;
  const request = await run(input);
  if (request) {
    created.value = request;
    form.value?.reset();
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <AlertMessage v-if="created" variant="success" dismissible @dismiss="created = null">
      Your request for <strong>{{ formatRange(created.startDate, created.endDate) }}</strong> was
      submitted and is waiting for approval.
      <RouterLink to="/requests" class="font-medium underline">See my requests</RouterLink>
    </AlertMessage>

    <BaseCard
      title="Request a vacation"
      subtitle="Vacations are whole days and must start after today."
    >
      <VacationRequestForm ref="form" :loading="loading" :error="error" @submit="submit" />
    </BaseCard>
  </div>
</template>
