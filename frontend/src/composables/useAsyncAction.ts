/**
 * Wraps an async action (form submit, button click) with loading and error state,
 * so components do not repeat try/catch/finally boilerplate.
 */
import { ref } from 'vue';
import { ApiError, errorMessage } from '@/api/http';

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const apiError = ref<ApiError | null>(null);

  /** Runs the action; returns its result, or undefined if it failed (the error is stored). */
  async function run(...args: TArgs): Promise<TResult | undefined> {
    loading.value = true;
    error.value = null;
    apiError.value = null;
    try {
      return await action(...args);
    } catch (caught) {
      error.value = errorMessage(caught);
      apiError.value = caught instanceof ApiError ? caught : null;
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
    apiError.value = null;
  }

  return { run, loading, error, apiError, clearError };
}
