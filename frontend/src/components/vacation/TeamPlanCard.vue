<!--
  One team vacation plan: dates, proposer, reason, a per-status summary and every
  participant's status. Validator comments appear only when the API shares them
  (the viewer's own request, or for validators).
-->
<script setup lang="ts">
import { computed } from 'vue';
import StatusBadge from '@/components/base/StatusBadge.vue';
import { useAuth } from '@/composables/useAuth';
import type { TeamPlan, VacationRequestStatus } from '@/types/api';
import VacationPeriod from './VacationPeriod.vue';

const props = defineProps<{ plan: TeamPlan }>();
const { user } = useAuth();

const STATUSES: VacationRequestStatus[] = ['Approved', 'Pending', 'Rejected'];
const proposedByMe = computed(() => props.plan.proposedBy.id === user.value?.id);
</script>

<template>
  <article class="rounded-lg border border-blue-800 bg-blue-950/60 p-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <VacationPeriod :start-date="plan.startDate" :end-date="plan.endDate" />
        <p class="mt-1 text-sm text-blue-200">
          Proposed by
          <span class="font-medium text-white">{{
            proposedByMe ? 'you' : plan.proposedBy.name
          }}</span>
          <template v-if="plan.reason"> · “{{ plan.reason }}”</template>
        </p>
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <span
          v-for="status in STATUSES"
          :key="status"
          class="rounded-md bg-blue-900 px-2 py-1 text-blue-100"
        >
          {{ plan.summary[status] }} {{ status.toLowerCase() }}
        </span>
      </div>
    </header>

    <ul class="mt-3 divide-y divide-blue-800 border-t border-blue-800">
      <li
        v-for="participant in plan.participants"
        :key="participant.requestId"
        class="flex flex-wrap items-center justify-between gap-2 py-2"
      >
        <div>
          <p class="text-sm font-medium">
            {{ participant.name }}
            <span v-if="participant.userId === user?.id" class="text-xs text-blue-300">(you)</span>
            <span v-if="participant.isProposer" class="text-xs text-blue-300">· proposer</span>
          </p>
          <p v-if="participant.comments" class="text-xs text-blue-200">
            Validator: “{{ participant.comments }}”
          </p>
        </div>
        <StatusBadge :status="participant.status" />
      </li>
    </ul>
  </article>
</template>
