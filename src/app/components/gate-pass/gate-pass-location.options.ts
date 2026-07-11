export const GATE_PASS_LOCATION_OPTIONS = ['FSD', 'PSH', 'Head Office'] as const;

const LOCATION_ALIASES: Record<string, (typeof GATE_PASS_LOCATION_OPTIONS)[number]> = {
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

/** Maps a base-document / API location value onto a known dropdown option. */
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
