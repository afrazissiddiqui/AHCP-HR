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

  it('maps PSH to AHCP_Peshawar', () => {
    expect(resolveBranchNameFromBplId('PSH')).toBe('AHCP_Peshawar');
  });

  it('maps HO to AHCP_HO', () => {
    expect(resolveBranchNameFromBplId('HO')).toBe('AHCP_HO');
  });

  it('maps FSD to AHCP_Faisalabad', () => {
    expect(resolveBranchNameFromBplId('FSD')).toBe('AHCP_Faisalabad');
  });
});
