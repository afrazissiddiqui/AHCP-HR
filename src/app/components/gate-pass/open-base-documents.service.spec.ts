import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeAll, describe, expect, it, beforeEach, afterEach } from 'vitest';
import { apiUrl } from '../../config/api.config';
import { OpenBaseDocumentsService } from './open-base-documents.service';

describe('OpenBaseDocumentsService', () => {
  let service: OpenBaseDocumentsService;
  let httpMock: HttpTestingController;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OpenBaseDocumentsService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(OpenBaseDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches purchase requests from the purchase_requests API', () => {
    const response = [
      {
        docNum: 'PR-1001',
        cardName: 'Test Vendor',
        docDate: '2026-08-12',
        lines: [{ itemCode: 'ITM-01', itemName: 'Item 1', quantity: 2 }],
      },
    ];

    service.fetchPurchaseRequests().subscribe((documents) => {
      expect(documents.length).toBe(1);
      expect(documents[0].number).toBe('PR-1001');
      expect(documents[0].partner).toBe('Test Vendor');
    });

    const req = httpMock.expectOne(apiUrl('purchase_requests'));
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });
});
