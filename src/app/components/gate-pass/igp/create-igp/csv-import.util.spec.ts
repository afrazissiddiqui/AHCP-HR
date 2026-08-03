import { parseIgpBulkUploadCsv } from './csv-import.util';

describe('parseIgpBulkUploadCsv', () => {
  it('maps common CSV headers into IGP line items', () => {
    const csv = [
      'Item Code,Item Name,Qty,Category,Remarks',
      'ITEM-001,Widget A,10,Finished,First row',
      'ITEM-002,Widget B,5,Spare,Second row',
    ].join('\n');

    const rows = parseIgpBulkUploadCsv(csv);

    expect(rows).toEqual([
      jasmine.objectContaining({
        itemCode: 'ITEM-001',
        itemName: 'Widget A',
        qty: 10,
        category: 'Finished',
        remarks: 'First row',
      }),
      jasmine.objectContaining({
        itemCode: 'ITEM-002',
        itemName: 'Widget B',
        qty: 5,
        category: 'Spare',
        remarks: 'Second row',
      }),
    ]);
  });

  it('handles quoted values and trims empty rows', () => {
    const csv = [
      'Item Code,Item Name,Qty,Remarks',
      '"ITEM-003","Widget, with comma",3,"Needs review"',
      '',
      '   ',
    ].join('\n');

    const rows = parseIgpBulkUploadCsv(csv);

    expect(rows).toEqual([
      jasmine.objectContaining({
        itemCode: 'ITEM-003',
        itemName: 'Widget, with comma',
        qty: 3,
        remarks: 'Needs review',
      }),
    ]);
  });

  it('accepts alternate header names used in common CSV exports', () => {
    const csv = [
      'Code,Name,Quantity,Pack,Quality,UOM,Info,Comment',
      'ALT-001,Widget C,12,Loose,Good,EA,Imported row,Needs follow up',
    ].join('\n');

    const rows = parseIgpBulkUploadCsv(csv);

    expect(rows).toEqual([
      jasmine.objectContaining({
        itemCode: 'ALT-001',
        itemName: 'Widget C',
        qty: 12,
        packingCondition: 'Loose',
        productQuality: 'Good',
        uom: 'EA',
        info: 'Imported row',
        remarks: 'Needs follow up',
      }),
    ]);
  });
});
