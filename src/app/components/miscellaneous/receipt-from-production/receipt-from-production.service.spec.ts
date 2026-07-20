import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReceiptFromProductionService } from './receipt-from-production.service';

describe('ReceiptFromProductionService', () => {
  let service: ReceiptFromProductionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(ReceiptFromProductionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps top-level production order item fields into order items when no line array is present', () => {
    const response = {
      data: [
        {
          DocEntry: '17',
          DocNum: '1',
          ItemCode: 'FG-Own-P-00000001',
          ProdName: 'Own Flint - Preform 15 Gram',
          PlannedQty: '4364363.000000',
          CmpltQty: '117221.000000',
          RjctQty: '0.000000',
          PostDate: '2026-06-28 00:00:00.0000000',
        },
      ],
    };

    service.listProductionOrders().subscribe((orders) => {
      expect(orders.length).toBe(1);
      expect(orders[0].items).toEqual(
        jasmine.arrayContaining([
          jasmine.objectContaining({
            itemCode: 'FG-Own-P-00000001',
            itemDescription: 'Own Flint - Preform 15 Gram',
            quantity: 4364363,
          }),
        ]),
      );
    });

    const req = httpMock.expectOne((request) => request.url.includes('production_orders'));
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });
});
