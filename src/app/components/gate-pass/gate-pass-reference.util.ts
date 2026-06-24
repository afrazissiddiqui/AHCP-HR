export type GatePassReferencePrefix = 'IGP' | 'OGP' | 'AGP';

/** Next sequential gate pass number, e.g. IGP-000001. */
export function nextGatePassReferenceNo(
  prefix: GatePassReferencePrefix,
  existingReferenceNos: string[],
): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let max = 0;

  for (const ref of existingReferenceNos) {
    const trimmed = ref?.trim();
    if (!trimmed || trimmed === '—') {
      continue;
    }
    const match = trimmed.match(pattern);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10) || 0);
    }
  }

  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}
