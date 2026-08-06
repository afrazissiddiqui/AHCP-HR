import { filterRecordsBySessionBranches, getAllowedBranches } from './branch-filter.util';

describe('branch filter utilities', () => {
  it('treats non-admin flags like 0 or "0" as non-admin users for branch filtering', () => {
    const allowedBranches = getAllowedBranches({ is_admin: '0' as unknown as boolean, branch: 'FSD' } as any);

    expect([...allowedBranches]).toEqual(['ahcp_faisalabad']);
  });

  it('treats false-like strings as non-admin users for branch filtering', () => {
    const allowedBranches = getAllowedBranches({ is_admin: 'false', branch: 'Psh' } as any);

    expect([...allowedBranches]).toEqual(['ahcp_peshawar']);
  });

  it('filters out records from other branches when the user is tagged with Faisalabad', () => {
    const filtered = filterRecordsBySessionBranches(
      [{ branch: 'FSD' }, { branch: 'PSH' }],
      (record) => record.branch,
      { is_admin: 0 as unknown as boolean, branch: 'Faisalabad' },
    );

    expect(filtered).toEqual([{ branch: 'FSD' }]);
  });
});
