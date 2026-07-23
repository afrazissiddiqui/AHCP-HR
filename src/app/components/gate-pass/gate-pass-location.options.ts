export const GATE_PASS_LOCATION_OPTIONS = ['FSD', 'PSH', 'Head Office'] as const;

const LOCATION_ALIASES: Record<string, (typeof GATE_PASS_LOCATION_OPTIONS)[number]> = {
  fsd: 'FSD',
  faisalabad: 'FSD',
  'faisalabad plant': 'FSD',
  ahcp_faisalabad: 'FSD',
  psh: 'PSH',
  peshawar: 'PSH',
  'peshawar plant': 'PSH',
  ahcp_peshawar: 'PSH',
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

  const numericBplMatch = resolveGatePassLocationFromBplId(trimmed);
  if (numericBplMatch) {
    return numericBplMatch;
  }

  return LOCATION_ALIASES[trimmed.toLowerCase()] ?? '';
}

/** Resolves SAP `BPLId` (branch) onto Location dropdown value. */
export function resolveGatePassLocationFromBplId(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  const id = Number(raw);
  if (Number.isFinite(id)) {
    switch (id) {
      case 1:
        return 'PSH';
      case 2:
        return 'Head Office';
      case 3:
        return 'FSD';
      default:
        return '';
    }
  }

  const normalized = raw.toLowerCase();
  if (normalized.includes('peshawar') || normalized.includes('ahcp_peshawar')) {
    return 'PSH';
  }
  if (normalized.includes('faisalabad') || normalized.includes('ahcp_faisalabad')) {
    return 'FSD';
  }
  if (normalized.includes('head office') || normalized.includes('ho')) {
    return 'Head Office';
  }

  return '';
}
