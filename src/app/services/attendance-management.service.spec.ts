import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApplicationFormService } from './application-form.service';
import {
  AttendanceManagementService,
  formatPunchTime,
} from './attendance-management.service';

describe('AttendanceManagementService calculated working hours', () => {
  let service: AttendanceManagementService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AttendanceManagementService,
        { provide: ApplicationFormService, useValue: {} },
      ],
    });
    service = TestBed.inject(AttendanceManagementService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the employee by padded card number and returns hours_worked', () => {
    let hours: string | null = null;
    service.fetchCalculatedWorkingHours(
      { mode: 'date', date: '2026-09-29' },
      '4023',
    ).subscribe((value) => (hours = value));

    const request = httpMock.expectOne((req) => req.urlWithParams.includes('card_no=00004023'));
    expect(request.request.params.get('from_date')).toBe('2026-09-29');
    expect(request.request.params.get('to_date')).toBe('2026-09-29');
    expect(request.request.headers.has('X-API-Key')).toBeTrue();
    request.flush(JSON.stringify({ data: [{ hours_worked: '6h 16m' }] }));

    expect(hours).toBe('6h 16m');
  });

  it('formats punch times in 12-hour clock with AM/PM', () => {
    expect(formatPunchTime('2026-09-29T14:30:00')).toBe('2:30 PM');
    expect(formatPunchTime('2026-09-29T00:05:00')).toBe('12:05 AM');
  });
});