import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  CreatePurchaseRequestPayload,
  PurchaseRequestService,
  normalizePurchaseRequestDocumentType,
} from './purchase-request.service';
import { apiUrl } from '../config/api.config';

describe('PurchaseRequestService', () => {
  let service: PurchaseRequestService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PurchaseRequestService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PurchaseRequestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('normalizes the SAP document type for both item and service requests', () => {
    expect(normalizePurchaseRequestDocumentType('Service')).toBe('service');
    expect(normalizePurchaseRequestDocumentType(' ITEM ')).toBe('item');
    expect(normalizePurchaseRequestDocumentType('s')).toBe('service');
    expect(normalizePurchaseRequestDocumentType('i')).toBe('item');
  });

  it('omits the invalid top-level requiredDate and keeps the valid item-level requiredDate', () => {
    const payload: CreatePurchaseRequestPayload = {
      employee_code: 'Emp-00000100',
      docDate: '2026-08-17',
      DocType: 'service',
      requiredDate: '2026-08-19',
      branch: 3,
      remarks: 'Purchase Request from Portal',
      items: [
        {
          Vendor: 'FV-000001',
          department: 'PD-F-001',
          AccountCode: 'O12001000100010',
          taxCode: 'PT05',
          requiredDate: '2026-08-19',
          total: '1000',
        },
      ],
    };

    service.create(payload).subscribe();

    const req = httpMock.expectOne(apiUrl('createPurchaseRequest'));
    const requestBody = req.request.body as Record<string, unknown>;

    expect(req.request.method).toBe('POST');
    expect(requestBody.requiredDate).toBeUndefined();
    expect((requestBody.items as Array<Record<string, unknown>>)[0].requiredDate).toBe('2026-08-19');
    expect(requestBody.DocType).toBe('service');
    req.flush({ success: true, message: 'Saved' });
  });
});
