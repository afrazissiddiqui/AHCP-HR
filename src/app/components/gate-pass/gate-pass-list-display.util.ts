/** Short date for gate pass list tables (e.g. 2026-06-03). */
export function formatGatePassListDate(raw: string | number | null | undefined): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed || trimmed === '—') {
    return trimmed;
  }

  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) {
    return isoPrefix[1];
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed;
}

export function formatGatePassListCell(
  value: string | number | null | undefined,
  key: string,
): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (key === 'submittedDate') {
    return formatGatePassListDate(value);
  }

  return String(value);
}

function gatePassSubmittedTimestamp(raw: string | number | null | undefined): number {
  const formatted = formatGatePassListDate(raw);
  if (!formatted || formatted === '—') {
    return 0;
  }

  const parsed = Date.parse(formatted);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function gatePassRecordOrderValue(record: { Id: number; submittedDate: string }): number {
  const timestamp = gatePassSubmittedTimestamp(record.submittedDate);
  if (timestamp) {
    return timestamp;
  }

  return record.Id || 0;
}

export function compareGatePassListRecords<T extends { Id: number; submittedDate: string }>(
  a: T,
  b: T,
  column: string,
  direction: 'asc' | 'desc',
): number {
  const factor = direction === 'asc' ? 1 : -1;

  if (column === 'submittedDate') {
    const dateDiff =
      gatePassSubmittedTimestamp(a.submittedDate) - gatePassSubmittedTimestamp(b.submittedDate);
    if (dateDiff !== 0) {
      return dateDiff * factor;
    }
    return (a.Id - b.Id) * factor;
  }

  if (column === 'Id') {
    return (a.Id - b.Id) * factor;
  }

  const valA = a[column as keyof T];
  const valB = b[column as keyof T];
  if (valA === undefined || valB === undefined) {
    return 0;
  }
  if (typeof valA === 'number' && typeof valB === 'number') {
    return (valA - valB) * factor;
  }

  const sa = String(valA);
  const sb = String(valB);
  if (sa > sb) {
    return factor;
  }
  if (sa < sb) {
    return -factor;
  }
  return 0;
}
