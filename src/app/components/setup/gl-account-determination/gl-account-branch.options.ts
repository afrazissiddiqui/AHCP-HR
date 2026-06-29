export type GlAccountBranchOption = {
  code: string;
  name: string;
};

export const GL_ACCOUNT_BRANCH_OPTIONS: GlAccountBranchOption[] = [
  { code: '02', name: 'AHCP_Peshawar' },
  { code: '01', name: 'AHCP_HO' },
  { code: '03', name: 'AHCP_Faisalabad' },
];

export function glAccountBranchCode(name: string): string {
  const match = GL_ACCOUNT_BRANCH_OPTIONS.find((option) => option.name === name);
  return match?.code ?? name;
}

export function glAccountBranchLabel(codeOrName: string): string {
  const trimmed = codeOrName.trim();
  if (!trimmed) {
    return '';
  }
  const match = GL_ACCOUNT_BRANCH_OPTIONS.find(
    (option) => option.code === trimmed || option.name === trimmed,
  );
  return match?.name ?? trimmed;
}
