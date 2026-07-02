/** Normalizes API text values; treats null, undefined, and literal "null" as empty. */
export function sanitizeApiText(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  const text = String(value).trim();
  if (!text) {
    return '';
  }

  const lower = text.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || text === '—') {
    return '';
  }

  return text;
}
