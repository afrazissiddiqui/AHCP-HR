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

  it('loads documents from the nested inventory transfer response envelope', () => {
    let records = [] as ReturnType<ItrFormService['records']>;
    service.fetchItrForms().subscribe((result) => {
      records = result as ReturnType<ItrFormService['records']>;
    });

    const req = httpMock.expectOne(apiUrl('inventory_transfer_request'));
    req.flush({
      status: true,
      inventory_transfer_request: {
        count: 1,
        data: [
          {
            DocEntry: '1001',
            DocNum: '42',
            DocStatus: 'O',
            items: [{ ItemCode: 'ITEM-1', Dscription: 'Replacement part' }],
          },
        ],
      },
    });

    expect(records.length).toBe(1);
    expect(records[0].id).toBe('1001');
    expect(records[0].documentNo).toBe('42');
    expect(records[0].machineId).toBe('ITEM-1');
  });
});
