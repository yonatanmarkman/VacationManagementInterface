/**
 * Prop types shared by the base components and the screens that use them.
 */

/** One option of a BaseSelect. */
export interface SelectOption {
  value: string;
  label: string;
}

/** One column of a DataTable. */
export interface TableColumn {
  key: string;
  label: string;
  /** Extra classes for the header and cells of this column (e.g. 'text-right'). */
  class?: string;
}
