import { createEmptyGoodReceiptHeader, createEmptyGoodReceiptLine, GoodReceiptLine } from './good-receipt.model';
import { buildCreateGoodReceiptPayload } from './good-receipt.service';

describe('buildCreateGoodReceiptPayload', () => {
  it('maps row account code to AcctCode in payload items', () => {
    const header = createEmptyGoodReceiptHeader();
    const lines: GoodReceiptLine[] = [
      {
        ...createEmptyGoodReceiptLine(),
        itemCode: 'FG-001',
        warehouse: 'WH01',
        quantity: 10,
        unitPrice: 250,
        batchNumber: 'BATCH-01',
        manufacturingDate: '2026-07-02',
        expiryDate: '2029-07-28',
        accountCode: 'T01001005000050',
        branch: '3',
      },
    ];

    const payload = buildCreateGoodReceiptPayload(header, lines);

    expect(payload.items[0]).toEqual(jasmine.objectContaining({
      AcctCode: 'T01001005000050',
    }));
    expect(payload.items[0]).not.toHaveProperty('accountCode');
  });
});
