<!--
  Validator screen: every vacation request, filterable by status, employee, team and dates,
  sortable and paginated. Pending requests of other users can be approved or rejected.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AllRequestsFilter, SortParams } from '@/api/vacationRequestsApi';
import { vacationRequestsApi } from '@/api/vacationRequestsApi';
import { usersApi } from '@/api/usersApi';
import AlertMessage from '@/components/base/AlertMessage.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseCard from '@/components/base/BaseCard.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseSelect from '@/components/base/BaseSelect.vue';
import DataTable from '@/components/base/DataTable.vue';
import PaginationBar from '@/components/base/PaginationBar.vue';
import StatusBadge from '@/components/base/StatusBadge.vue';
import type { SelectOption, TableColumn } from '@/components/base/types';
import DecisionModal from '@/components/vacation/DecisionModal.vue';
import TeamPlanTag from '@/components/vacation/TeamPlanTag.vue';
import VacationPeriod from '@/components/vacation/VacationPeriod.vue';
import { useAsyncAction } from '@/composables/useAsyncAction';
import { useAuth } from '@/composables/useAuth';
import { usePaginatedList } from '@/composables/usePaginatedList';
import type {
  SortField,
  SortOrder,
  User,
  VacationRequest,
  VacationRequestStatus,
} from '@/types/api';
import { formatRange } from '@/utils/dates';

interface DashboardFilters {
  status: string;
  userId: string;
  teamId: string;
  startDate: string;
  endDate: string;
  sort: string;
}

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected'].map((s) => ({ value: s, label: s }));
const SORT_OPTIONS: SelectOption[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'startDate:asc', label: 'Start date (soonest)' },
  { value: 'startDate:desc', label: 'Start date (latest)' },
];
const COLUMNS: TableColumn[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'dates', label: 'Dates' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'comments', label: 'Comment' },
  { key: 'actions', label: '', class: 'text-right' },
];

const { user: currentUser } = useAuth();

function toApiFilter(filters: DashboardFilters): { filter: AllRequestsFilter; sort: SortParams } {
  const [sortBy, sortOrder] = filters.sort.split(':') as [SortField, SortOrder];
  return {
    filter: {
      status: (filters.status || undefined) as VacationRequestStatus | undefined,
      userId: filters.userId ? Number(filters.userId) : undefined,
      teamId: filters.teamId ? Number(filters.teamId) : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    },
    sort: { sortBy, sortOrder },
  };
}

const list = usePaginatedList(
  (filters: DashboardFilters, page) => {
    const { filter, sort } = toApiFilter(filters);
    return vacationRequestsApi.listAll(filter, page, sort);
  },
  { status: 'Pending', userId: '', teamId: '', startDate: '', endDate: '', sort: 'createdAt:desc' },
);

// Employees and teams for the filter dropdowns.
const users = ref<User[]>([]);
const userOptions = computed<SelectOption[]>(() =>
  users.value
    .filter((user) => !list.filters.teamId || String(user.team?.id) === list.filters.teamId)
    .map((user) => ({ value: String(user.id), label: user.name })),
);
const teamOptions = computed<SelectOption[]>(() => {
  const teams = new Map(
    users.value.flatMap((user) => (user.team ? [[user.team.id, user.team.name]] : [])),
  );
  return [...teams].map(([id, name]) => ({ value: String(id), label: name }));
});

onMounted(async () => {
  await list.load();
  try {
    users.value = (await usersApi.list({ page: 1, limit: 100 })).data;
  } catch {
    // The dropdowns stay empty; the table itself still works.
  }
});

// --- Decisions ----------------------------------------------------------------------------
const notice = ref<string | null>(null);
const deciding = ref<VacationRequest | null>(null);
const decision = ref<'Approved' | 'Rejected'>('Approved');
const decide = useAsyncAction((request: VacationRequest, comments: string) =>
  decision.value === 'Approved'
    ? vacationRequestsApi.approve(request.id, request.version, comments || undefined)
    : vacationRequestsApi.reject(request.id, request.version, comments),
);

function canDecide(request: VacationRequest): boolean {
  return request.status === 'Pending' && request.userId !== currentUser.value?.id;
}

function openDecision(request: VacationRequest, value: 'Approved' | 'Rejected'): void {
  decide.clearError();
  decision.value = value;
  deciding.value = request;
}

async function confirmDecision(comments: string): Promise<void> {
  if (!deciding.value) return;
  const result = await decide.run(deciding.value, comments);
  if (result) {
    notice.value = `${result.user?.name}'s request for ${formatRange(result.startDate, result.endDate)} was ${result.status.toLowerCase()}.`;
    deciding.value = null;
    await list.reload();
  } else if (
    ['REQUEST_NOT_PENDING', 'VERSION_CONFLICT'].includes(decide.apiError.value?.code ?? '')
  ) {
    await list.reload(); // someone else decided or changed it meanwhile: show the current state
  }
}
</script>

<template>
  <BaseCard title="Vacation requests" subtitle="Review and decide on your colleagues' requests.">
    <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <BaseSelect
        v-model="list.filters.status"
        label="Status"
        placeholder="All statuses"
        :options="STATUS_OPTIONS"
      />
      <BaseSelect
        v-model="list.filters.teamId"
        label="Team"
        placeholder="All teams"
        :options="teamOptions"
      />
      <BaseSelect
        v-model="list.filters.userId"
        label="Employee"
        placeholder="All employees"
        :options="userOptions"
      />
      <BaseInput v-model="list.filters.startDate" label="Starting from" type="date" />
      <BaseInput v-model="list.filters.endDate" label="Ending by" type="date" />
      <BaseSelect v-model="list.filters.sort" label="Sort by" :options="SORT_OPTIONS" />
    </div>
    <div class="mb-4 flex justify-end">
      <BaseButton variant="ghost" size="sm" @click="list.resetFilters()">Reset filters</BaseButton>
    </div>

    <AlertMessage
      class="mb-4"
      variant="success"
      :message="notice"
      dismissible
      @dismiss="notice = null"
    />
    <AlertMessage class="mb-4" variant="error" :message="list.error.value" />

    <DataTable
      :columns="COLUMNS"
      :rows="list.items.value"
      :loading="list.loading.value"
      empty-message="No vacation requests match these filters."
    >
      <template #cell-employee="{ row }">
        <p class="font-medium whitespace-nowrap">{{ row.user?.name }}</p>
        <p class="text-xs text-blue-300">{{ row.user?.team?.name }}</p>
      </template>
      <template #cell-dates="{ row }">
        <VacationPeriod :start-date="row.startDate" :end-date="row.endDate" />
        <TeamPlanTag v-if="row.teamPlan" :plan="row.teamPlan" />
      </template>
      <template #cell-reason="{ row }">
        <span class="text-blue-100">{{ row.reason ?? '—' }}</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-comments="{ row }">
        <span class="text-blue-100">{{ row.comments ?? '—' }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div v-if="canDecide(row)" class="flex justify-end gap-2">
          <BaseButton size="sm" @click="openDecision(row, 'Approved')">Approve</BaseButton>
          <BaseButton size="sm" variant="danger" @click="openDecision(row, 'Rejected')">
            Reject
          </BaseButton>
        </div>
        <span
          v-else-if="row.status === 'Pending'"
          class="text-xs whitespace-nowrap text-blue-300"
          title="You cannot decide on your own request"
        >
          Your request
        </span>
      </template>
    </DataTable>

    <PaginationBar
      :pagination="list.pagination.value"
      :disabled="list.loading.value"
      @change="list.load"
    />
  </BaseCard>

  <DecisionModal
    :request="deciding"
    :decision="decision"
    :loading="decide.loading.value"
    :error="decide.error.value"
    @confirm="confirmDecision"
    @close="deciding = null"
  />
</template>
