import {
  TableFilterConfig,
  TableFilterField,
  TableFilterFieldValue,
  TableFilterNumberRangeValue,
  TableFilterStatusValue,
  TableFilterValues,
} from './table-filter.types';

export function createEmptyFilterValues(config: TableFilterConfig): TableFilterValues {
  const values: TableFilterValues = {};
  for (const field of config.fields) {
    if (field.type === 'numberRange') {
      values[field.key] = { from: null, to: null };
    } else {
      values[field.key] = '';
    }
  }
  return values;
}

export function cloneFilterValues(values: TableFilterValues): TableFilterValues {
  const clone: TableFilterValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value && typeof value === 'object' && 'from' in value) {
      clone[key] = { ...(value as TableFilterNumberRangeValue) };
    } else {
      clone[key] = value;
    }
  }
  return clone;
}

export function getRecordFieldValue(item: unknown, fieldKey: string): unknown {
  if (item == null || typeof item !== 'object') {
    return undefined;
  }
  return (item as Record<string, unknown>)[fieldKey];
}

export function distinctFieldOptions(data: unknown[], fieldKey: string): string[] {
  return [...new Set(
    data
      .map((row) => getRecordFieldValue(row, fieldKey))
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
      .map((v) => String(v))
  )].sort((a, b) => a.localeCompare(b));
}

export function resolveSelectOptions(
  field: TableFilterField,
  data: unknown[]
): string[] {
  if (field.type !== 'select') {
    return [];
  }
  if (field.options?.length) {
    return [...field.options];
  }
  return distinctFieldOptions(data, field.fieldKey);
}

export function normalizeNumberBound(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeFilterValues(config: TableFilterConfig, values: TableFilterValues): TableFilterValues {
  const normalized = cloneFilterValues(values);
  for (const field of config.fields) {
    if (field.type !== 'numberRange') {
      continue;
    }
    const raw = normalized[field.key] as TableFilterNumberRangeValue | undefined;
    let from = normalizeNumberBound(raw?.from);
    let to = normalizeNumberBound(raw?.to);
    if (from != null && to != null && from > to) {
      [from, to] = [to, from];
    }
    normalized[field.key] = { from, to };
  }
  return normalized;
}

function isStatusValue(value: TableFilterFieldValue | undefined): value is TableFilterStatusValue {
  return value === '' || value === 'Active' || value === 'NotActive';
}

function isRangeValue(value: TableFilterFieldValue | undefined): value is TableFilterNumberRangeValue {
  return !!value && typeof value === 'object' && 'from' in value;
}

export function hasActiveFilterValues(config: TableFilterConfig, values: TableFilterValues): boolean {
  for (const field of config.fields) {
    const value = values[field.key];
    if (field.type === 'select') {
      if (typeof value === 'string' && value.trim()) {
        return true;
      }
    } else if (field.type === 'status') {
      if (isStatusValue(value) && value) {
        return true;
      }
    } else if (field.type === 'numberRange' && isRangeValue(value)) {
      if (value.from != null || value.to != null) {
        return true;
      }
    }
  }
  return false;
}

export function matchesTableFilterItem(
  item: unknown,
  config: TableFilterConfig,
  values: TableFilterValues
): boolean {
  if (!hasActiveFilterValues(config, values)) {
    return true;
  }

  for (const field of config.fields) {
    const applied = values[field.key];
    const raw = getRecordFieldValue(item, field.fieldKey);

    if (field.type === 'select') {
      const selected = typeof applied === 'string' ? applied : '';
      if (selected && String(raw ?? '') !== selected) {
        return false;
      }
      continue;
    }

    if (field.type === 'status') {
      const status = isStatusValue(applied) ? applied : '';
      if (!status) {
        continue;
      }
      const activeToken = (field.activeValue ?? 'active').toLowerCase();
      const isActive = String(raw ?? '').toLowerCase() === activeToken;
      if (status === 'Active' && !isActive) {
        return false;
      }
      if (status === 'NotActive' && isActive) {
        return false;
      }
      continue;
    }

    if (field.type === 'numberRange' && isRangeValue(applied)) {
      const num = normalizeNumberBound(raw);
      if (num == null) {
        return false;
      }
      const from = normalizeNumberBound(applied.from);
      const to = normalizeNumberBound(applied.to);
      if (from != null && num < from) {
        return false;
      }
      if (to != null && num > to) {
        return false;
      }
    }
  }

  return true;
}

export function filterTableItems<T>(
  items: T[],
  config: TableFilterConfig,
  values: TableFilterValues
): T[] {
  if (!hasActiveFilterValues(config, values)) {
    return items;
  }
  return items.filter((item) => matchesTableFilterItem(item, config, values));
}
