<!--
  Small tag marking a request that belongs to a team vacation plan ("Team plan · by Noa Levi").
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useAuth } from '@/composables/useAuth';
import type { VacationRequest } from '@/types/api';

const props = defineProps<{ plan: NonNullable<VacationRequest['teamPlan']> }>();
const { user } = useAuth();

const proposer = computed(() =>
  props.plan.proposedBy.id === user.value?.id ? 'you' : props.plan.proposedBy.name,
);
</script>

<template>
  <span
    class="mt-1 inline-flex items-center rounded-md bg-blue-500/20 px-2 py-0.5 text-xs whitespace-nowrap text-blue-100 ring-1 ring-blue-400/40"
    :title="`Part of team plan #${plan.id}`"
  >
    Team plan · by {{ proposer }}
  </span>
</template>
