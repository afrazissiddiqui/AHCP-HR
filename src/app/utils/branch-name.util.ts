export function resolveBranchNameFromBplId(value: string | number | undefined | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const normalized = raw.toLowerCase();
  const branchNames: Record<string, string> = {
    '1': 'AHCP_Peshawar',
    '2': 'AHCP_HO',
    '3': 'AHCP_Faisalabad',
    ahcp_peshawar: 'AHCP_Peshawar',
    ahcp_ho: 'AHCP_HO',
    ahcp_faisalabad: 'AHCP_Faisalabad',
    peshawar: 'AHCP_Peshawar',
    'ahcp peshawar': 'AHCP_Peshawar',
    psh: 'AHCP_Peshawar',
    ho: 'AHCP_HO',
    'head office': 'AHCP_HO',
    headoffice: 'AHCP_HO',
    faisalabad: 'AHCP_Faisalabad',
    fsd: 'AHCP_Faisalabad',
    'ahcp faisalabad': 'AHCP_Faisalabad',
  };

  if (branchNames[normalized]) {
    return branchNames[normalized];
  }

  const prefix = normalized.split(/[-_\s]/, 1)[0];
  if (prefix && branchNames[prefix]) {
    return branchNames[prefix];
  }

  if (normalized.includes('psh')) {
    return 'AHCP_Peshawar';
  }
  if (normalized.includes('fsd') || normalized.includes('faisalabad')) {
    return 'AHCP_Faisalabad';
  }
  if (normalized.includes('ho') || normalized.includes('head office')) {
    return 'AHCP_HO';
  }

  return raw;
}
