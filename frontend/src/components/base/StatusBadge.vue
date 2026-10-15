<!--
  Colored pill for a vacation request status: amber = Pending, green = Approved, red = Rejected.
-->
<script setup lang="ts">
import type { VacationRequestStatus } from '@/types/api';

defineProps<{ status: VacationRequestStatus }>();

const COLORS: Record<VacationRequestStatus, string> = {
  Pending: 'bg-amber-400/15 text-amber-200 ring-amber-400/40',
  Approved: 'bg-green-400/15 text-green-200 ring-green-400/40',
  Rejected: 'bg-red-400/15 text-red-200 ring-red-400/40',
};
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
    :class="COLORS[status]"
  >
    {{ status }}
  </span>
</template>
