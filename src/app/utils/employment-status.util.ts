import { sanitizeApiText } from './api-text.util';

/** Normalizes employment status labels/legacy values to Permanent or Contractual. */
export function normalizeEmploymentStatus(value: string | undefined | null): string {
  const sanitized = sanitizeApiText(value);
  if (!sanitized) {
    return '';
  }

  const compact = sanitized.toLowerCase().replace(/[\s_-]+/g, '');
  if (compact === 'active' || compact === 'permanent') {
    return 'Permanent';
  }
  if (compact === 'inactive' || compact === 'contractual' || compact === 'temporary') {
    return 'Contractual';
  }

  return sanitized;
}
