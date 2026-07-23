import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { buildCreateGoodIssuePayload } from './good-issue.service';
import { createEmptyGoodIssueHeader, createEmptyGoodIssueLine } from './good-issue.model';

describe('GoodIssueService', () => {
  it('includes row-level detail fields in the payload', () => {
    const header = createEmptyGoodIssueHeader();
    const lines = [
      {
        ...createEmptyGoodIssueLine(),
        itemCode: 'ITEM-001',
        itemDescription: 'Test Item',
        warehouse: 'WH-01',
        quantity: 2,
        unitPrice: 10,
        binLocationAllocation: 'BIN-01',
        accountCode: 'ACCT-100',
        itemCost: 20,
        uomCode: 'EA',
        uomName: 'Each',
        departmentsLocations: 'Dept A',
        branch: 'BR-01',
      },
    ] as any;

    const payload = buildCreateGoodIssuePayload(header, lines);

    expect(payload.items[0]).toMatchObject({
      itemCode: 'ITEM-001',
      warehouse: 'WH-01',
      quantity: 2,
      binLocationAllocation: 'BIN-01',
      accountCode: 'ACCT-100',
      itemCost: 20,
      uomCode: 'EA',
      uomName: 'Each',
      departmentsLocations: 'Dept A',
      branch: 'BR-01',
    });
  });
});
