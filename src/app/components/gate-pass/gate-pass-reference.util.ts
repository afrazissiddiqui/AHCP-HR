export type GatePassReferencePrefix = 'IGP' | 'OGP' | 'AGP';

const REFERENCE_RESERVATION_KEY = 'ahcp-gate-pass-reference-reservations';
const RESERVATION_TTL_MS = 10 * 60 * 1000;

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

/**
 * Reserves the next number in this browser so concurrently opened forms do not
 * submit the same reference before the server list has refreshed.
 */
export function reserveNextGatePassReferenceNo(
  prefix: GatePassReferencePrefix,
  existingReferenceNos: string[],
): string {
  const references = readReservations();
  const activeReservations = references.filter(
    (reservation) => reservation.expiresAt > Date.now(),
  );
  const nextReference = nextGatePassReferenceNo(prefix, [
    ...existingReferenceNos,
    ...activeReservations
      .filter((reservation) => reservation.prefix === prefix)
      .map((reservation) => reservation.referenceNo),
  ]);

  activeReservations.push({
    prefix,
    referenceNo: nextReference,
    expiresAt: Date.now() + RESERVATION_TTL_MS,
  });
  writeReservations(activeReservations);

  return nextReference;
}

interface ReferenceReservation {
  prefix: GatePassReferencePrefix;
  referenceNo: string;
  expiresAt: number;
}

function readReservations(): ReferenceReservation[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REFERENCE_RESERVATION_KEY) ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isReferenceReservation);
  } catch {
    return [];
  }
}

function writeReservations(reservations: ReferenceReservation[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(REFERENCE_RESERVATION_KEY, JSON.stringify(reservations));
  } catch {
    // Number generation still works if browser storage is unavailable.
  }
}

function isReferenceReservation(value: unknown): value is ReferenceReservation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const reservation = value as Partial<ReferenceReservation>;
  return (
    (reservation.prefix === 'IGP' || reservation.prefix === 'OGP' || reservation.prefix === 'AGP') &&
    typeof reservation.referenceNo === 'string' &&
    typeof reservation.expiresAt === 'number'
  );
}
