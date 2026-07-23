import { resolveBranchNameFromBplId } from './branch-name.util';

describe('resolveBranchNameFromBplId', () => {
  it('maps BPLID 1 to AHCP_Peshawar', () => {
    expect(resolveBranchNameFromBplId('1')).toBe('AHCP_Peshawar');
  });

  it('maps BPLID 2 to AHCP_HO', () => {
    expect(resolveBranchNameFromBplId('2')).toBe('AHCP_HO');
  });

  it('maps BPLID 3 to AHCP_Faisalabad', () => {
    expect(resolveBranchNameFromBplId('3')).toBe('AHCP_Faisalabad');
  });
});
