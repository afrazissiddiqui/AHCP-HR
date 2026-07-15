import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { KpiSetupService } from './kpi-setup.service';
import { apiUrl } from '../config/api.config';

describe('KpiSetupService', () => {
  let service: KpiSetupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(KpiSetupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts KPI payload to the add endpoint', () => {
    const payload = {
      department: 'Production',
      Employement_Nature: 'Technical',
      Work_Level: '2-A',
      Employement_Category: 'Executive',
      Employement_Status: 'Permanent',
      Designation: 'Plant Manager',
      kpis: [
        {
          kpi: 'Overall Production Target Achievement',
          weight: '20',
          weight_percentage: '≥98%',
          defination_measurement: 'Achievement of monthly production plan across all production lines and grammages.',
        },
      ],
    };

    service.createKpi(payload).subscribe();

    const req = httpMock.expectOne(apiUrl('kpi-add'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true });
  });
});
