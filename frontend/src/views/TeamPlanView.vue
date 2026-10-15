<!--
  Requester screen: plan a vacation together with teammates. One Pending request is created
  for me and for every selected teammate, all or nothing. If someone is unavailable, the API
  lists every clash and nothing is created. Below the form, "My team plans" shows every plan I
  proposed or take part in, with each participant's status, so everyone can follow the outcome.
-->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { teamApi } from '@/api/teamApi';
import AlertMessage from '@/components/base/AlertMessage.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseCard from '@/components/base/BaseCard.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseTextarea from '@/components/base/BaseTextarea.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import LoadingSpinner from '@/components/base/LoadingSpinner.vue';
import PaginationBar from '@/components/base/PaginationBar.vue';
import TeamPlanCard from '@/components/vacation/TeamPlanCard.vue';
import VacationPeriod from '@/components/vacation/VacationPeriod.vue';
import { useAsyncAction } from '@/composables/useAsyncAction';
import { useAuth } from '@/composables/useAuth';
import { usePaginatedList } from '@/composables/usePaginatedList';
import type { TeamMembers, TeamPlan } from '@/types/api';
import { earliestStartDate } from '@/utils/dates';

interface Clash {
  userId: number;
  userName?: string;
  reason?: string;
  message?: string;
}

const { user } = useAuth();
const team = ref<TeamMembers | null>(null);
const loadMembers = useAsyncAction(teamApi.members);
const myPlans = usePaginatedList((_filters, page) => teamApi.listPlans(page), {}, 5);

onMounted(async () => {
  void myPlans.load();
  team.value = (await loadMembers.run()) ?? null;
});

/** Teammates who can join (Requester role, not me). */
const teammates = computed(
  () =>
    team.value?.members.filter(
      (member) => member.id !== user.value?.id && member.roles.includes('Requester'),
    ) ?? [],
);

const minDate = earliestStartDate();
const form = reactive({ startDate: '', endDate: '', reason: '', participantIds: [] as number[] });
const formError = ref<string | null>(null);
const result = ref<TeamPlan | null>(null);
const plan = useAsyncAction(teamApi.planVacation);

/** Per-person problems reported by the API (conflicting dates or invalid participants). */
const clashes = computed<Clash[]>(() => {
  const details = plan.apiError.value?.details ?? {};
  return ((details.conflicts ?? details.invalidParticipants ?? []) as Clash[]).map((clash) => ({
    ...clash,
    userName:
      clash.userName ??
      team.value?.members.find((m) => m.id === clash.userId)?.name ??
      `User ${clash.userId}`,
  }));
});

async function submit(): Promise<void> {
  formError.value = null;
  result.value = null;
  if (!form.startDate || !form.endDate) {
    formError.value = 'Choose a start and an end date.';
  } else if (form.startDate < minDate) {
    formError.value = 'Vacations must start after today.';
  } else if (form.endDate < form.startDate) {
    formError.value = 'The end date must be on or after the start date.';
  } else if (form.participantIds.length === 0) {
    formError.value = 'Select at least one teammate.';
  }
  if (formError.value) {
    return;
  }
  const created = await plan.run({
    startDate: form.startDate,
    endDate: form.endDate,
    reason: form.reason.trim() || null,
    participantIds: form.participantIds,
  });
  if (created) {
    result.value = created;
    Object.assign(form, { startDate: '', endDate: '', reason: '', participantIds: [] });
    await myPlans.load(1);
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <AlertMessage v-if="result" variant="success" dismissible @dismiss="result = null">
      <p class="font-medium">Team vacation planned!</p>
      <p class="mt-1">
        Pending requests were created for
        {{ result.participants.map((participant) => participant.name).join(', ') }}. You can follow
        each decision under "My team plans".
      </p>
      <VacationPeriod class="mt-2" :start-date="result.startDate" :end-date="result.endDate" />
    </AlertMessage>

    <BaseCard
      :title="team ? `Plan a team vacation · ${team.team.name}` : 'Plan a team vacation'"
      subtitle="A Pending request is created for you and each selected teammate. Validators approve each one separately."
    >
      <div v-if="loadMembers.loading.value" class="py-6 text-center">
        <LoadingSpinner label="Loading your team..." />
      </div>
      <AlertMessage
        v-else-if="loadMembers.error.value"
        variant="error"
        :message="loadMembers.error.value"
      />

      <form v-else class="space-y-4" novalidate @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.startDate" label="Start date" type="date" :min="minDate" />
          <BaseInput
            v-model="form.endDate"
            label="End date"
            type="date"
            :min="form.startDate || minDate"
          />
        </div>
        <BaseTextarea
          v-model="form.reason"
          label="Reason (optional)"
          :maxlength="500"
          placeholder="e.g. Team offsite"
        />

        <fieldset>
          <legend class="mb-2 text-sm font-medium text-blue-100">Teammates</legend>
          <p v-if="teammates.length === 0" class="text-sm text-blue-300">
            No teammates can join a team vacation.
          </p>
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="member in teammates"
              :key="member.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-blue-800 bg-blue-950/60 px-3 py-2 hover:border-blue-600"
            >
              <input
                v-model="form.participantIds"
                type="checkbox"
                :value="member.id"
                class="h-4 w-4 accent-blue-500"
              />
              <span>
                <span class="block text-sm font-medium">{{ member.name }}</span>
                <span class="block text-xs text-blue-300">{{ member.email }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <AlertMessage variant="error" :message="formError" />
        <AlertMessage variant="error" :message="plan.error.value">
          <ul v-if="clashes.length" class="mt-2 list-disc space-y-1 pl-5">
            <li v-for="clash in clashes" :key="clash.userId">
              <strong>{{ clash.userName }}</strong
              >: {{ clash.message ?? clash.reason }}
            </li>
          </ul>
        </AlertMessage>

        <div class="flex justify-end">
          <BaseButton type="submit" :loading="plan.loading.value">Plan vacation</BaseButton>
        </div>
      </form>
    </BaseCard>

    <BaseCard
      title="My team plans"
      subtitle="Plans you proposed or are part of. Validators decide on each person's request separately."
    >
      <AlertMessage class="mb-4" variant="error" :message="myPlans.error.value" />
      <div
        v-if="myPlans.loading.value && myPlans.items.value.length === 0"
        class="py-6 text-center"
      >
        <LoadingSpinner label="Loading plans..." />
      </div>
      <EmptyState
        v-else-if="myPlans.items.value.length === 0"
        message="You are not part of any team vacation plan yet."
      />
      <div v-else class="space-y-3">
        <TeamPlanCard v-for="teamPlan in myPlans.items.value" :key="teamPlan.id" :plan="teamPlan" />
      </div>
      <PaginationBar
        :pagination="myPlans.pagination.value"
        :disabled="myPlans.loading.value"
        @change="myPlans.load"
      />
    </BaseCard>
  </div>
</template>
