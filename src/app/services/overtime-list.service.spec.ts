import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { apiUrl } from '../config/api.config';
import { formatIsoDate } from './attendance-management.service';
import { ApplicationFormRecord, ApplicationFormService } from './application-form.service';
import { OvertimeListRecord, OvertimeListService } from './overtime-list.service';

describe('OvertimeListService', () => {
  let service: OvertimeListService;
  beforeEach(() => {
    const currentDate = new Date();
    const currentDateText = formatIsoDate(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDateText = formatIsoDate(currentDate);
    const applicationFormService = jasmine.createSpyObj<ApplicationFormService>('ApplicationFormService', [
      'fetchEmployeeProfiles',
      'fetchEmployeeRosterList',
      'getApplicationRecords',
    ]);
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post']);
    http.get.and.returnValue(of([
      {
        id: 1,
        employee_code: 'EMP-001',
        employee_name: 'Ayesha Khan',
        ext_emp_no: '4023',
        shift: 'M',
        department: 'IT',
        branch: 'Islamabad',
        reporting_manager: 'Manager A',
        overtime_hours: 2.5,
        overtime_rate: 150,
        exceptional_ot: 0,
      },
      {
        id: 2,
        employee_code: 'EMP-004',
        employee_name: 'Daniyal Ali',
        ext_emp_no: '4024',
        shift: 'E',
        department: 'HR',
        branch: 'Lahore',
        reporting_manager: 'Manager B',
        overtime_hours: 1.5,
        overtime_rate: 175,
        exceptional_ot: 0.5,
      },
    ]));
    http.post.and.returnValue(of({}));
    applicationFormService.getApplicationRecords.and.returnValue([]);
    applicationFormService.fetchEmployeeRosterList.and.returnValue(of([
      {
        employee_id: 'EMP-001',
        employee_name: 'Ayesha Khan',
        department: '',
        designation: '',
        employment_status: '',
        shift_date: currentDateText,
        shift: 'M',
        role: '',
        hub: '',
        note: null,
      },
      {
        employee_id: 'EMP-001',
        employee_name: 'Ayesha Khan',
        department: '',
        designation: '',
        employment_status: '',
        shift_date: nextDateText,
        shift: 'E',
        role: '',
        hub: '',
        note: null,
      },
    ]));
    applicationFormService.fetchEmployeeProfiles.and.returnValue(of([
      {
        EmployeeCode: 'EMP-001',
        ExtEmpNo: '4023',
        EmployeeName: 'Ayesha Khan',
        Department: '',
        EmployeeNature: '',
        Designation: '',
        ReportingManager: '',
        EmploymentType: '',
        EmploymentStatus: '',
        EmploymentCategory: '',
        status: '',
        detail: {
          remuneration: { overTimeApplicable: 'Yes' },
          hrSettings: { attendanceShiftManagement: 'Yes' },
        },
      },
      {
        EmployeeCode: 'EMP-002',
        EmployeeName: 'Bilal Ahmed',
        Department: '',
        EmployeeNature: '',
        Designation: '',
        ReportingManager: '',
        EmploymentType: '',
        EmploymentStatus: '',
        EmploymentCategory: '',
        status: '',
        detail: {
          remuneration: { overTimeApplicable: 'No' },
          hrSettings: { attendanceShiftManagement: 'Yes' },
        },
      },
      {
        EmployeeCode: 'EMP-003',
        EmployeeName: 'Celine Shah',
        Department: '',
        EmployeeNature: '',
        Designation: '',
        ReportingManager: '',
        EmploymentType: '',
        EmploymentStatus: '',
        EmploymentCategory: '',
        status: '',
        detail: {
          remuneration: { overTimeApplicable: 'Yes' },
          hrSettings: { attendanceShiftManagement: 'No' },
        },
      },
      {
        EmployeeCode: 'EMP-004',
        EmployeeName: 'Daniyal Ali',
        Department: '',
        EmployeeNature: '',
        Designation: '',
        ReportingManager: '',
        EmploymentType: '',
        EmploymentStatus: '',
        EmploymentCategory: '',
        status: '',
        detail: {
          remuneration: { overTimeApplicable: 'Yes' },
          hrSettings: { attendanceShiftManagement: 'Yes' },
        },
      },
    ] as unknown as ApplicationFormRecord[]));

    TestBed.configureTestingModule({
      providers: [
        OvertimeListService,
        { provide: HttpClient, useValue: http },
        { provide: ApplicationFormService, useValue: applicationFormService },
      ],
    });
    service = TestBed.inject(OvertimeListService);
  });

  it('fetches overtime records from the overtime-records API', () => {
    let records: OvertimeListRecord[] = [];
    const http = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;

    service.fetchOvertimeList().subscribe((result) => (records = result));

    expect(http.get).toHaveBeenCalledWith(apiUrl('overtime-records'));
    expect(records.map((record) => record.employeeId)).toEqual(['EMP-001', 'EMP-004']);
    expect(records[0].shift).toBe('M');
    expect(records[0].extEmpNo).toBe('4023');
    expect(records[0].shiftLookupFailed).toBeFalse();
    expect(records[1].shift).toBe('E');
    expect(records[1].shiftLookupFailed).toBeFalse();
    expect(service.overtimeList().length).toBe(2);
  });

  it('posts overtime records as an array to the add endpoint', () => {
    const payload = [{
      employee_code: 'Emp-00003315',
      employee_name: 'Muhammad Ali Akbar',
      overtime_date: '2026-10-01',
      shift_id: '1',
      working_hours: 8,
      shift_hours: 8,
      overtime_hours: 2.5,
      overtime_rate: 150,
      exceptional_ot: 0,
    }];
    const http = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;

    service.addOvertimeRecords(payload).subscribe();

    expect(http.post).toHaveBeenCalledWith(apiUrl('overtime-record-add'), payload);
  });
});
