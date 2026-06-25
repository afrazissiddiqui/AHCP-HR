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
