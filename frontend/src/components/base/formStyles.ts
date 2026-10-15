/**
 * Shared Tailwind classes for form controls, so inputs, selects and textareas look the same.
 */
export const LABEL_CLASS = 'mb-1 block text-sm font-medium text-blue-100';

export const CONTROL_CLASS =
  'block w-full rounded-lg border bg-blue-950 px-3 py-2 text-sm text-white scheme-dark ' +
  'placeholder:text-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-400 ' +
  'disabled:opacity-60';

export const controlBorder = (hasError: boolean): string =>
  hasError ? 'border-red-400' : 'border-blue-700';

export const ERROR_CLASS = 'mt-1 text-xs text-red-300';
export const HINT_CLASS = 'mt-1 text-xs text-blue-300';
