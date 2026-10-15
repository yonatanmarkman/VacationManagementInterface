<!--
  Requester screen: my vacation requests with every field, filterable by status and paginated.
  Pending requests can be edited or cancelled; decided requests are read-only.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { VacationRequestInput } from '@/api/vacationRequestsApi';
import { vacationRequestsApi } from '@/api/vacationRequestsApi';
import AlertMessage from '@/components/base/AlertMessage.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseCard from '@/components/base/BaseCard.vue';
import BaseModal from '@/components/base/BaseModal.vue';
import BaseSelect from '@/components/base/BaseSelect.vue';
import DataTable from '@/components/base/DataTable.vue';
import PaginationBar from '@/components/base/PaginationBar.vue';
import StatusBadge from '@/components/base/StatusBadge.vue';
import type { TableColumn } from '@/components/base/types';
import TeamPlanTag from '@/components/vacation/TeamPlanTag.vue';
import VacationPeriod from '@/components/vacation/VacationPeriod.vue';
import VacationRequestForm from '@/components/vacation/VacationRequestForm.vue';
import { useAsyncAction } from '@/composables/useAsyncAction';
import { usePaginatedList } from '@/composables/usePaginatedList';
import type { VacationRequest, VacationRequestStatus } from '@/types/api';
import { formatDate, formatRange } from '@/utils/dates';

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected'].map((s) => ({ value: s, label: s }));
const COLUMNS: TableColumn[] = [
  { key: 'dates', label: 'Dates' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'comments', label: 'Validator comment' },
  { key: 'createdAt', label: 'Submitted' },
  { key: 'actions', label: '', class: 'text-right' },
];

const list = usePaginatedList(
  (filters: { status: string }, page) =>
    vacationRequestsApi.listMine(
      { status: (filters.status || undefined) as VacationRequestStatus | undefined },
      page,
    ),
  { status: '' },
);
onMounted(() => list.load());

const notice = ref<string | null>(null);

// --- Edit -------------------------------------------------------------------------------
const editing = ref<VacationRequest | null>(null);
const editInitial = computed(() =>
  editing.value
    ? {
        startDate: editing.value.startDate,
        endDate: editing.value.endDate,
        reason: editing.value.reason,
      }
    : {},
);
const editAction = useAsyncAction((request: VacationRequest, input: VacationRequestInput) =>
  vacationRequestsApi.update(request.id, input, request.version),
);

function openEdit(request: VacationRequest): void {
  editAction.clearError();
  editing.value = request;
}

async function saveEdit(input: VacationRequestInput): Promise<void> {
  if (!editing.value) return;
  const updated = await editAction.run(editing.value, input);
  if (updated) {
    notice.value = `Request updated: ${formatRange(updated.startDate, updated.endDate)}.`;
    editing.value = null;
    await list.reload();
  } else if (editAction.apiError.value?.code === 'VERSION_CONFLICT') {
    await list.reload();
  }
}

// --- Cancel -----------------------------------------------------------------------------
const cancelling = ref<VacationRequest | null>(null);
const cancelAction = useAsyncAction((request: VacationRequest) =>
  vacationRequestsApi.cancel(request.id),
);

function openCancel(request: VacationRequest): void {
  cancelAction.clearError();
  cancelling.value = request;
}

async function confirmCancel(): Promise<void> {
  if (!cancelling.value) return;
  const request = cancelling.value;
  await cancelAction.run(request);
  if (!cancelAction.error.value) {
    notice.value = `Request for ${formatRange(request.startDate, request.endDate)} cancelled.`;
    cancelling.value = null;
    await list.reload();
  }
}
</script>

<template>
  <BaseCard
    title="My vacation requests"
    subtitle="Pending requests can still be edited or cancelled."
  >
    <template #actions>
      <RouterLink v-slot="{ navigate }" to="/requests/new" custom>
        <BaseButton size="sm" @click="navigate">New request</BaseButton>
      </RouterLink>
    </template>

    <div class="mb-4 max-w-xs">
      <BaseSelect
        v-model="list.filters.status"
        label="Status"
        placeholder="All statuses"
        :options="STATUS_OPTIONS"
      />
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
      empty-message="You have no vacation requests yet."
    >
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
      <template #cell-createdAt="{ row }">
        <span class="whitespace-nowrap text-blue-200">
          {{ formatDate(row.createdAt.slice(0, 10)) }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div v-if="row.status === 'Pending'" class="flex justify-end gap-2">
          <BaseButton size="sm" variant="secondary" @click="openEdit(row)">Edit</BaseButton>
          <BaseButton size="sm" variant="danger" @click="openCancel(row)">Cancel</BaseButton>
        </div>
      </template>
    </DataTable>

    <PaginationBar
      :pagination="list.pagination.value"
      :disabled="list.loading.value"
      @change="list.load"
    />
  </BaseCard>

  <BaseModal :open="editing !== null" title="Edit vacation request" @close="editing = null">
    <VacationRequestForm
      :initial="editInitial"
      submit-label="Save changes"
      :loading="editAction.loading.value"
      :error="editAction.error.value"
      @submit="saveEdit"
    >
      <template #secondary-actions>
        <BaseButton variant="ghost" @click="editing = null">Back</BaseButton>
      </template>
    </VacationRequestForm>
  </BaseModal>

  <BaseModal :open="cancelling !== null" title="Cancel vacation request" @close="cancelling = null">
    <p v-if="cancelling" class="text-sm text-blue-100">
      Cancel your request for
      <strong class="text-white">{{ formatRange(cancelling.startDate, cancelling.endDate) }}</strong
      >? This cannot be undone.
    </p>
    <AlertMessage class="mt-4" variant="error" :message="cancelAction.error.value" />
    <template #footer>
      <BaseButton variant="ghost" @click="cancelling = null">Keep it</BaseButton>
      <BaseButton variant="danger" :loading="cancelAction.loading.value" @click="confirmCancel">
        Cancel request
      </BaseButton>
    </template>
  </BaseModal>
</template>
