import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ItrFormService } from './itr-form.service';
import { apiUrl } from '../../../../config/api.config';

describe('ItrFormService', () => {
  let service: ItrFormService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(ItrFormService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads ITR data from the inventory transfer request endpoint', () => {
    service.fetchItrForms().subscribe();

    const req = httpMock.expectOne(apiUrl('inventory_transfer_request'));
    expect(req.request.method).toBe('GET');
    req.flush([{ docEntry: '1001' }]);
  });
});
