import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { PurchaseOrderListComponent } from './purchase-order-list';

describe('PurchaseOrderListComponent', () => {
  it('shows SAP DocNum as the order number when the API response uses uppercase SAP field names', () => {
    const component = Object.create(PurchaseOrderListComponent.prototype) as any;
    component.asString = PurchaseOrderListComponent.prototype['asString'];
    component.toNumber = PurchaseOrderListComponent.prototype['toNumber'];

    const mapped = component.mapOpenDocumentToListItem({
      number: '',
      DocNum: '129',
      DocDate: '2026-09-25',
      CardName: 'Demo Vendor',
      status: 'O',
      remarks: 'Priority',
      lines: [],
    });

    expect(mapped.docNum).toBe('129');
    expect(mapped.docDate).toBe('25/09/2026');
    expect(mapped.vendor).toBe('Demo Vendor');
  });
});
