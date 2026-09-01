import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '../../../../services/alert.service';
import { AuthService } from '../../../../services/auth.service';
import { OitmItemsService } from '../../../../services/oitm-items.service';
import { SalesOrderService } from '../../../../services/sales-order.service';
import { GatePassBusinessPartnerService } from '../../../gate-pass/gate-pass-business-partner.service';
import { DeliveryLine, createEmptyDeliveryHeader } from '../delivery.model';
import { buildCreateDeliveryPayload } from '../delivery.service';
import { AddDelivery } from './add-delivery';

describe('AddDelivery batch selection', () => {
  let component: AddDelivery;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDelivery, HttpClientTestingModule],
      providers: [
        {
          provide: AlertService,
          useValue: {
            validation: () => undefined,
            warning: () => undefined,
            error: () => undefined,
            success: () => undefined,
            successAndWait: async () => undefined,
          },
        },
        {
          provide: AuthService,
          useValue: {
            getSessionUser: () => ({ name: 'Test User' }),
          },
        },
        {
          provide: OitmItemsService,
          useValue: {
            ensureLoaded: () => of([]),
            getCatalog: () => [],
          },
        },
        {
          provide: SalesOrderService,
          useValue: {
            list: () => of([]),
          },
        },
        {
          provide: GatePassBusinessPartnerService,
          useValue: {
            ensureCustomersLoaded: () => of([]),
            searchCustomers: () => [],
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AddDelivery);
    component = fixture.componentInstance;
  });

  it('builds a delivery payload from selected batch issue quantities', () => {
    const header = createEmptyDeliveryHeader();
    header.customer = 'CUST-001';
    header.branchId = '1';
    header.baseSalesOrderDocEntry = '10';
    header.documentDate = '2026-09-01';
    header.postingDate = '2026-09-01';

    const line: DeliveryLine = {
      itemCode: 'FG-001',
      itemDescription: 'Finished Goods',
      baseDocEntry: '10',
      baseLine: '1',
      quantity: 10,
      warehouse: 'WH01',
      unitOfMeasure: 'PC',
      unitPrice: 20,
      batchSerialNumber: '',
      taxCode: '',
      bpCatalogNo: '',
      discountPercent: 0,
      binLocation: '',
      cogsDepartment: '',
      country: '',
      branch: '',
      blanketAgreementNo: '',
      standardItemIdentification: '',
      commodityClassification: '',
      qtyPerJumboCarton: null,
      jumboCartonsCount: null,
      availableBatches: [
        { batchNo: 'B-100', quantity: 6, issueQuantity: 4 },
        { batchNo: 'B-200', quantity: 7, issueQuantity: 6 },
      ],
    };

    const payload = buildCreateDeliveryPayload(header, [line]);

    expect(payload.items[0].batches).toEqual([
      { batchNumber: 'B-100', quantity: 4 },
      { batchNumber: 'B-200', quantity: 6 },
    ]);
  });

  it('constrains batch issue quantity to the minimum of available and remaining required', () => {
    const line = {
      itemCode: 'FG-001',
      itemDescription: 'Finished Goods',
      warehouse: 'FSD-WH03',
      quantity: 10,
      batchSerialNumber: '',
      availableBatches: [
        { batchNo: 'B-100', quantity: 8, issueQuantity: 0 },
        { batchNo: 'B-200', quantity: 5, issueQuantity: 0 },
      ],
    } as DeliveryLine;

    const batch = line.availableBatches[0];
    expect((component as any).getMaxAvailableForBatch(batch, line)).toBe(3);
  });

  it('maps NumAtCard from SAP sales orders into the customer reference number', () => {
    const httpTesting = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(SalesOrderService);

    service.list().subscribe((orders) => {
      expect(orders[0].customerPoNo).toBe('0024');
    });

    const req = httpTesting.expectOne((request) => request.url.includes('sales_orders'));
    req.flush({
      sales_orders: {
        data: [
          {
            DocEntry: '101',
            DocNum: 'SO-1001',
            DocDate: '2026-09-01',
            DocDueDate: '2026-09-08',
            DocStatus: 'O',
            CardCode: 'CUST-01',
            CardName: 'Customer One',
            Address: 'Some address',
            NumAtCard: '0024',
            BPLId: '1',
            items: [],
          },
        ],
      },
    });

    httpTesting.verify();
  });
});
