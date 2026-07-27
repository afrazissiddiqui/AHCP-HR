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

  it('maps submitted document values from the list response', () => {
    service.fetchKpis().subscribe((records) => {
      expect(records[0]?.department).toBe('Production');
      expect(records[0]?.work_level).toBe('2-A');
      expect(records[0]?.designation).toBe('Plant Manager');
    });

    const req = httpMock.expectOne(apiUrl('kpi-list'));
    expect(req.request.method).toBe('GET');
    req.flush([{ department: 'Production', work_level: '2-A', designation: 'Plant Manager' }]);
  });

  it('fetches KPI detail by id', () => {
    service.fetchKpiDetail(1).subscribe((record) => {
      expect(record.id).toBe('1');
      expect(record.department).toBe('Production');
      expect(record.work_level).toBe('2-A');
      expect(record.designation).toBe('Plant Manager');
      expect(Array.isArray(record['kpis'])).toBeTrue();
      expect((record['kpis'] as Record<string, unknown>[])[0]?.['kpi']).toBe('Overall Production Target Achievement');
    });

    const req = httpMock.expectOne(apiUrl('kpi-detail/1'));
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 1,
      department: 'Production',
      Work_Level: '2-A',
      Designation: 'Plant Manager',
      Employement_Nature: 'Technical',
      Employement_Category: 'Executive',
      Employement_Status: 'Permanent',
      kpis: [
        {
          kpi: 'Overall Production Target Achievement',
          weight: '20',
          weight_percentage: '≥98%',
          defination_measurement: 'Achievement of monthly production plan.',
        },
      ],
    });
  });

  it('updates KPI by id', () => {
    const updatePayload = { department: 'Quality', work_level: '2-B' };
    service.updateKpi(1, updatePayload).subscribe();

    const req = httpMock.expectOne(apiUrl('kpi-update/1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(updatePayload);
    req.flush({ success: true });
  });

  it('deletes KPI by id', () => {
    service.deleteKpi(1).subscribe();

    const req = httpMock.expectOne(apiUrl('kpi-delete/1'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });
});
