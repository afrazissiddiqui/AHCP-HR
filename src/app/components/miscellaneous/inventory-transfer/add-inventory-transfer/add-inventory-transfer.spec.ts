import { resolveInventoryTransferBranchName } from './add-inventory-transfer';

describe('resolveInventoryTransferBranchName', () => {
  it('maps BPLID 1 to AHCP_Peshawar', () => {
    expect(resolveInventoryTransferBranchName('1')).toBe('AHCP_Peshawar');
  });

  it('maps BPLID 2 to AHCP_HO', () => {
    expect(resolveInventoryTransferBranchName('2')).toBe('AHCP_HO');
  });

  it('maps BPLID 3 to AHCP_Faisalabad', () => {
    expect(resolveInventoryTransferBranchName('3')).toBe('AHCP_Faisalabad');
  });
});
