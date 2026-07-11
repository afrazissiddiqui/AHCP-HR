export const GATE_PASS_LOCATION_OPTIONS = ['FSD', 'PSH', 'Head Office'] as const;

/** SAP BPLId → Location (1 Peshawar, 2 HO, 3 Faisalabad). */
const BPL_ID_TO_LOCATION: Record<string, (typeof GATE_PASS_LOCATION_OPTIONS)[number]> = {
  '1': 'PSH',
  '2': 'Head Office',
  '3': 'FSD',
};

const LOCATION_ALIASES: Record<string, (typeof GATE_PASS_LOCATION_OPTIONS)[number]> = {
  ...BPL_ID_TO_LOCATION,
  fsd: 'FSD',
  faisalabad: 'FSD',
  'faisalabad plant': 'FSD',
  psh: 'PSH',
  peshawar: 'PSH',
  'peshawar plant': 'PSH',
  'head office': 'Head Office',
  headoffice: 'Head Office',
  ho: 'Head Office',
  'h.o': 'Head Office',
  'h.o.': 'Head Office',
};

/** Maps a base-document / API location or BPLId value onto a known dropdown option. */
export function resolveGatePassLocation(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed === '—') {
    return '';
  }

  const exact = GATE_PASS_LOCATION_OPTIONS.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) {
    return exact;
  }

  return LOCATION_ALIASES[trimmed.toLowerCase()] ?? '';
}

/** Resolves SAP `BPLId` (branch) onto Location dropdown value. */
export function resolveGatePassLocationFromBplId(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  return resolveGatePassLocation(String(value).trim());
}
