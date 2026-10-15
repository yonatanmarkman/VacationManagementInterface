<!--
  "Showing 11-20 of 42" summary with Previous / Next buttons. Emits `change` with the new page.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { Pagination } from '@/types/api';
import BaseButton from './BaseButton.vue';

const props = defineProps<{ pagination: Pagination; disabled?: boolean }>();
const emit = defineEmits<{ change: [page: number] }>();

const range = computed(() => {
  const { page, limit, totalItems } = props.pagination;
  const first = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  return { first, last: Math.min(page * limit, totalItems), total: totalItems };
});
</script>

<template>
  <nav
    v-if="pagination.totalItems > 0"
    class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-blue-200"
    aria-label="Pagination"
  >
    <p>
      Showing <span class="font-medium text-white">{{ range.first }}-{{ range.last }}</span> of
      <span class="font-medium text-white">{{ range.total }}</span>
    </p>
    <div class="flex items-center gap-2">
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="disabled || pagination.page <= 1"
        @click="emit('change', pagination.page - 1)"
      >
        Previous
      </BaseButton>
      <span>Page {{ pagination.page }} of {{ Math.max(pagination.totalPages, 1) }}</span>
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="disabled || pagination.page >= pagination.totalPages"
        @click="emit('change', pagination.page + 1)"
      >
        Next
      </BaseButton>
    </div>
  </nav>
</template>
