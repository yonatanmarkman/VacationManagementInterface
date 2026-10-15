<!--
  Generic table. Columns are declared as { key, label }; each cell shows `row[key]` unless the
  parent provides a `cell-<key>` slot (e.g. `#cell-status="{ row }"`). Scrolls horizontally on
  small screens. Shows a spinner while loading and `emptyMessage` when there are no rows.
-->
<script setup lang="ts" generic="TRow extends { id: number }">
import EmptyState from './EmptyState.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import type { TableColumn } from './types';

defineProps<{
  columns: TableColumn[];
  rows: TRow[];
  loading?: boolean;
  emptyMessage?: string;
}>();

function cellValue(row: TRow, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}
</script>

<template>
  <div class="relative">
    <div class="overflow-x-auto rounded-lg border border-blue-800">
      <table class="min-w-full divide-y divide-blue-800 text-sm">
        <thead class="bg-blue-950/60">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-blue-200"
              :class="column.class"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-blue-800">
          <tr v-for="row in rows" :key="row.id" class="hover:bg-blue-800/40">
            <td
              v-for="column in columns"
              :key="column.key"
              class="px-4 py-3 align-top text-white"
              :class="column.class"
            >
              <slot :name="`cell-${column.key}`" :row="row">
                {{ cellValue(row, column.key) ?? '—' }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center rounded-lg bg-blue-900/60"
    >
      <LoadingSpinner label="Loading..." />
    </div>
    <EmptyState
      v-if="!loading && rows.length === 0"
      class="mt-4"
      :message="emptyMessage ?? 'Nothing to show.'"
    />
  </div>
</template>
