<!--
  Team calendar (both roles): who in my team is away, grouped by month. Shows Pending and
  Approved vacations only, with names, dates and status (reasons stay private).
-->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { teamApi } from '@/api/teamApi';
import AlertMessage from '@/components/base/AlertMessage.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseCard from '@/components/base/BaseCard.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import LoadingSpinner from '@/components/base/LoadingSpinner.vue';
import StatusBadge from '@/components/base/StatusBadge.vue';
import VacationPeriod from '@/components/vacation/VacationPeriod.vue';
import { useAsyncAction } from '@/composables/useAsyncAction';
import { useAuth } from '@/composables/useAuth';
import type { TeamCalendar, TeamCalendarEntry } from '@/types/api';
import { addDays, formatMonth, today } from '@/utils/dates';

const { user } = useAuth();
const range = reactive({ from: today(), to: addDays(today(), 90) });
const calendar = ref<TeamCalendar | null>(null);
const { run, loading, error } = useAsyncAction(teamApi.calendar);

async function load(): Promise<void> {
  const result = await run(range.from, range.to);
  if (result) {
    calendar.value = result;
  }
}
onMounted(load);

/** Entries grouped by the month in which they start. */
const months = computed(() => {
  const groups = new Map<string, TeamCalendarEntry[]>();
  for (const entry of calendar.value?.entries ?? []) {
    const month = formatMonth(entry.startDate);
    groups.set(month, [...(groups.get(month) ?? []), entry]);
  }
  return [...groups].map(([month, entries]) => ({ month, entries }));
});
</script>

<template>
  <BaseCard
    :title="calendar ? `Team calendar · ${calendar.team.name}` : 'Team calendar'"
    subtitle="Pending and approved vacations of your team."
  >
    <form class="mb-6 flex flex-wrap items-end gap-3" @submit.prevent="load">
      <BaseInput v-model="range.from" label="From" type="date" required />
      <BaseInput v-model="range.to" label="To" type="date" :min="range.from" required />
      <BaseButton type="submit" :loading="loading">Show</BaseButton>
    </form>

    <AlertMessage class="mb-4" variant="error" :message="error" />

    <div v-if="loading && !calendar" class="py-10 text-center">
      <LoadingSpinner label="Loading calendar..." />
    </div>
    <EmptyState
      v-else-if="calendar && months.length === 0"
      message="Nobody in your team is away during this period."
    />

    <div v-else class="space-y-6">
      <section v-for="group in months" :key="group.month">
        <h3 class="mb-2 text-sm font-semibold tracking-wide text-blue-300 uppercase">
          {{ group.month }}
        </h3>
        <ul class="divide-y divide-blue-800 rounded-lg border border-blue-800">
          <li
            v-for="entry in group.entries"
            :key="entry.requestId"
            class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            :class="entry.user.id === user?.id ? 'bg-blue-800/50' : ''"
          >
            <p class="min-w-40 font-medium">
              {{ entry.user.name }}
              <span v-if="entry.user.id === user?.id" class="text-xs text-blue-300">(you)</span>
            </p>
            <VacationPeriod :start-date="entry.startDate" :end-date="entry.endDate" />
            <StatusBadge :status="entry.status" />
          </li>
        </ul>
      </section>
    </div>
  </BaseCard>
</template>
