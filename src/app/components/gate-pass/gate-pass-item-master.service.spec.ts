import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { mapGatePassItemRecord } from './gate-pass-item-master.service';

describe('GatePassItemMasterService', () => {
  it('maps UOM from UOMCode payload fields', () => {
    const item = mapGatePassItemRecord({
      itemCode: 'IT-001',
      itemName: 'Test Item',
      category: 'Hardware',
      UOMCode: 'EA',
    });

    expect(item.uom).toBe('EA');
  });
});
