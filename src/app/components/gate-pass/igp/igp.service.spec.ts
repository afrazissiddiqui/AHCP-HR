import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IgpService } from './igp.service';
import { AuthService } from '../../../services/auth.service';

describe('IgpService', () => {
  let service: IgpService;
  let httpMock: HttpTestingController;
  let authService: { getSessionUser: jasmine.Spy };

  beforeEach(() => {
    authService = {
      getSessionUser: jasmine.createSpy('getSessionUser'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        IgpService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(IgpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('keeps records when the API exposes branch values through alternate fields', (done) => {
    authService.getSessionUser.and.returnValue({ is_admin: false, branch: '1' } as any);

    service.fetchInwardGatePasses().subscribe({
      next: (records) => {
        expect(records.length).toBe(1);
        expect(records[0].referenceNo).toBe('IGP-100');
        done();
      },
      error: done.fail,
    });

    const req = httpMock.expectOne((request) => request.method === 'GET');
    req.flush([
      {
        referenceNo: 'IGP-100',
        businessPartnerName: 'ABC Traders',
        branchName: 'Peshawar',
      },
    ]);
  });
});
