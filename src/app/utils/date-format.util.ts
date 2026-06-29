/** Formats digits into DD-MM-YYYY as the user types. */
export function formatDateDdMmYyyyInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts: string[] = [];

  if (digits.length > 0) {
    parts.push(digits.slice(0, 2));
  }
  if (digits.length > 2) {
    parts.push(digits.slice(2, 4));
  }
  if (digits.length > 4) {
    parts.push(digits.slice(4, 8));
  }

  return parts.join('-');
}

/** Normalizes API / ISO values to DD-MM-YYYY for display and editing. */
export function formatDateOfBirthFromApi(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }

  return formatDateDdMmYyyyInput(trimmed);
}

/** Converts DD-MM-YYYY to yyyy-MM-dd for API payloads. */
export function formatDateOfBirthToApi(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  return trimmed.slice(0, 10);
}

/** Normalizes API ISO / date values to yyyy-MM-dd for date inputs. */
export function formatDateForInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  return trimmed.slice(0, 10);
}

/** Converts yyyy-MM-dd or DD-MM-YYYY to ISO midnight UTC for API payloads. */
export function formatDateToApiIso(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.includes('T')) {
    return trimmed;
  }

  const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}T00:00:00.000000Z`;
  }

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}T00:00:00.000000Z`;
  }

  return trimmed;
}

/** Displays a stored date as DD-MM-YYYY without time components. */
export function displayDateOnly(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '—';
  }

  const formatted = formatDateOfBirthFromApi(String(value));
  return formatted || '—';
}

/** Displays a stored date as DD/MM/YYYY without time components. */
export function displayDateSlash(value: string | number | undefined | null): string {
  const formatted = displayDateOnly(value);
  return formatted === '—' ? '—' : formatted.replace(/-/g, '/');
}

/** Formats user input into DD/MM/YYYY as the user types. */
export function formatDateInputSlash(value: string): string {
  return formatDateDdMmYyyyInput(value).replace(/-/g, '/');
}

/** Converts DD/MM/YYYY display input to yyyy-MM-dd for API payloads. */
export function formatDateSlashToApi(value: string): string {
  return formatDateOfBirthToApi(value.replace(/\//g, '-'));
}

/** Normalizes API / ISO values to DD/MM/YYYY for display and editing. */
export function formatApiToDateSlash(value: string): string {
  return formatDateOfBirthFromApi(value).replace(/-/g, '/');
}

/** Parses DD/MM/YYYY, DD-MM-YYYY, or yyyy-MM-dd into a local Date. */
export function parseSlashOrIsoDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dmyMatch = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
