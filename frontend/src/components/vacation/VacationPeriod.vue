<!--
  Displays a vacation's dates ("15 Oct 2026 - 18 Oct 2026") with its length in days.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { IsoDate } from '@/types/api';
import { dayCount, formatRange } from '@/utils/dates';

const props = defineProps<{ startDate: IsoDate; endDate: IsoDate }>();
const days = computed(() => dayCount(props.startDate, props.endDate));
</script>

<template>
  <div class="whitespace-nowrap">
    <p class="font-medium text-white">{{ formatRange(startDate, endDate) }}</p>
    <p class="text-xs text-blue-300">{{ days }} day{{ days === 1 ? '' : 's' }}</p>
  </div>
</template>
