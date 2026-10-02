import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { OpenBaseDocumentsService } from '../../gate-pass/open-base-documents.service';
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

  it('shows service request DocumentLines in the view details with their description and total', () => {
    const documentsService = Object.create(OpenBaseDocumentsService.prototype) as any;
    const listComponent = Object.create(PurchaseOrderListComponent.prototype) as any;
    listComponent.asString = PurchaseOrderListComponent.prototype['asString'];
    listComponent.toNumber = PurchaseOrderListComponent.prototype['toNumber'];

    const document = documentsService.mapApiRecordToOpenBaseDocument({
      Document: {
        DocNum: 'PR-1002',
        DocType: 'S',
        DocumentLines: [{ Dscription: 'Equipment maintenance', total: '1250' }],
      },
    });
    const row = listComponent.mapOpenDocumentToListItem(document);

    expect(row.docNum).toBe('PR-1002');
    expect(row.itemCount).toBe(1);
    expect(row.items[0].itemDescription).toBe('Equipment maintenance');
    expect(row.items[0].lineTotal).toBe(1250);
  });

});
