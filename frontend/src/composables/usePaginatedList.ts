/**
 * State and behaviour of a paginated, filterable list (my requests, validator dashboard).
 *
 * Changing a filter goes back to page 1; `reload()` keeps the current page
 * (used after approving, rejecting, editing or cancelling an item).
 */
import { reactive, ref, watch } from 'vue';
import { errorMessage } from '@/api/http';
import type { PageParams, Paginated, Pagination } from '@/types/api';

export function usePaginatedList<TItem, TFilters extends object>(
  fetchPage: (filters: TFilters, page: PageParams) => Promise<Paginated<TItem>>,
  initialFilters: TFilters,
  pageSize = 10,
) {
  const filters = reactive({ ...initialFilters }) as TFilters;
  const items = ref<TItem[]>([]) as { value: TItem[] };
  const pagination = ref<Pagination>({ page: 1, limit: pageSize, totalItems: 0, totalPages: 0 });
  const loading = ref(false);
  const error = ref<string | null>(null);
  let latestRequest = 0;

  async function load(page = 1): Promise<void> {
    const requestId = ++latestRequest;
    loading.value = true;
    error.value = null;
    try {
      const result = await fetchPage({ ...filters }, { page, limit: pageSize });
      if (requestId === latestRequest) {
        items.value = result.data;
        pagination.value = result.pagination;
      }
    } catch (caught) {
      if (requestId === latestRequest) {
        error.value = errorMessage(caught);
      }
    } finally {
      if (requestId === latestRequest) {
        loading.value = false;
      }
    }
  }

  function reload(): Promise<void> {
    return load(pagination.value.page);
  }

  function resetFilters(): void {
    Object.assign(filters, initialFilters);
  }

  watch(filters, () => void load(1), { deep: true });

  return { filters, items, pagination, loading, error, load, reload, resetFilters };
}
