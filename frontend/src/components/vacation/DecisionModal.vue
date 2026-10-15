<!--
  Confirmation dialog for a validator's decision. Approving takes an optional comment;
  rejecting requires one. Emits `confirm` with the comment, or `close`.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AlertMessage from '@/components/base/AlertMessage.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseModal from '@/components/base/BaseModal.vue';
import BaseTextarea from '@/components/base/BaseTextarea.vue';
import type { VacationRequest } from '@/types/api';
import VacationPeriod from './VacationPeriod.vue';

const COMMENTS_MAX_LENGTH = 1000;

const props = defineProps<{
  request: VacationRequest | null;
  decision: 'Approved' | 'Rejected';
  loading?: boolean;
  error?: string | null;
}>();
const emit = defineEmits<{ confirm: [comments: string]; close: [] }>();

const comments = ref('');
const touched = ref(false);
const isReject = computed(() => props.decision === 'Rejected');
const commentError = computed(() =>
  isReject.value && touched.value && !comments.value.trim()
    ? 'Please explain why the request is rejected.'
    : null,
);

watch(
  () => props.request,
  () => {
    comments.value = '';
    touched.value = false;
  },
);

function confirm(): void {
  touched.value = true;
  if (isReject.value && !comments.value.trim()) {
    return;
  }
  emit('confirm', comments.value.trim());
}
</script>

<template>
  <BaseModal
    :open="request !== null"
    :title="isReject ? 'Reject vacation request' : 'Approve vacation request'"
    @close="emit('close')"
  >
    <div v-if="request" class="space-y-4">
      <div class="rounded-lg bg-blue-950/60 p-3">
        <p class="text-sm text-blue-200">{{ request.user?.name }}</p>
        <VacationPeriod :start-date="request.startDate" :end-date="request.endDate" />
        <p v-if="request.reason" class="mt-2 text-sm text-blue-100">“{{ request.reason }}”</p>
      </div>
      <BaseTextarea
        v-model="comments"
        :label="isReject ? 'Reason for rejection (required)' : 'Comment (optional)'"
        :maxlength="COMMENTS_MAX_LENGTH"
        :error="commentError"
      />
      <AlertMessage variant="error" :message="error" />
    </div>
    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">Back</BaseButton>
      <BaseButton :variant="isReject ? 'danger' : 'primary'" :loading="loading" @click="confirm">
        {{ isReject ? 'Reject' : 'Approve' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
