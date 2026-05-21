/** Active / not-active status filter (case-insensitive match on record field). */
export type TableFilterStatusValue = '' | 'Active' | 'NotActive';

export interface TableFilterNumberRangeValue {
  from: number | null;
  to: number | null;
}

export type TableFilterFieldValue = string | TableFilterStatusValue | TableFilterNumberRangeValue;

/** Applied or draft values keyed by field `key` from config. */
export type TableFilterValues = Record<string, TableFilterFieldValue>;

export interface TableFilterSelectField {
  type: 'select';
  /** Unique key within this filter config. */
  key: string;
  label: string;
  /** Property name on each table row used for matching and option discovery. */
  fieldKey: string;
  /** Static dropdown options; omit to derive distinct values from `data`. */
  options?: string[];
}

export interface TableFilterStatusField {
  type: 'status';
  key: string;
  label: string;
  fieldKey: string;
  /** Value treated as active (default: `active`, case-insensitive). */
  activeValue?: string;
}

export interface TableFilterNumberRangeField {
  type: 'numberRange';
  key: string;
  label: string;
  fieldKey: string;
  fromLabel?: string;
  toLabel?: string;
  fromPlaceholder?: string;
  toPlaceholder?: string;
}

export type TableFilterField =
  | TableFilterSelectField
  | TableFilterStatusField
  | TableFilterNumberRangeField;

/** Per-table / per-form filter definition — reuse with a stable `id`. */
export interface TableFilterConfig {
  id: string;
  title?: string;
  fields: TableFilterField[];
}
