import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LeaveApplicationService } from './leave-application.service';

describe('LeaveApplicationService', () => {
  let service: LeaveApplicationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LeaveApplicationService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LeaveApplicationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps the wrapped detail response data envelope for the modal view', () => {
    service.fetchLeaveApplicationDetail(1).subscribe((record) => {
      expect(record.Id).toBe(1);
      expect(record.EmployeeName).toBe('Molana Hitler');
      expect(record.LeaveType).toBe('Sick');
      expect(record.RequestStatus).toBe('Submitted');
      expect(record.HeaderInfo.formNumber).toBe('LR-2026-8270');
      expect(record.LeaveRequest.totalLeaveDaysRequested).toBe(1);
    });

    const req = httpMock.expectOne((request) => request.url.includes('leave-application-detail/1'));
    req.flush({
      status: true,
      message: 'Leave application retrieved successfully',
      data: {
        id: 1,
        form_number: 'LR-2026-8270',
        employee_id: 'Emp-00003321',
        employee_name: 'Molana Hitler',
        employee_category: 'Executive',
        employment_nature: '#N/A',
        employment_type: 'Technical',
        work_grade_level: 'WL 2A',
        department: 'Quality Control',
        job_title: 'kill',
        location: '1',
        request_date: '2026-07-14T00:00:00.000000Z',
        leave_type: 'Sick',
        cause_of_leave: 'Sick',
        from_date: '2026-07-14T00:00:00.000000Z',
        to_date: '2026-07-14T00:00:00.000000Z',
        total_leave_days_requested: 1,
        request_status: 'Submitted',
        remarks: null,
        total_leaves: 12,
        leaves_availed: 10,
        remaining_leaves: 2,
      },
    });
  });
});
