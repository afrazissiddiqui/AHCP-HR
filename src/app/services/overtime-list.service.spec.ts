import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
        { provide: ApplicationFormService, useValue: applicationFormService },
      ],
    });
    service = TestBed.inject(OvertimeListService);
  });

  it('lists only employees whose overtime and shift are applicable', () => {
    let records: OvertimeListRecord[] = [];

    service.fetchOvertimeList().subscribe((result) => (records = result));

    expect(records.map((record) => record.employeeId)).toEqual(['EMP-001', 'EMP-004']);
    expect(records[0].shift).toBe('M');
    expect(records[0].extEmpNo).toBe('4023');
    expect(records[0].shiftLookupFailed).toBeFalse();
    expect(records[1].shift).toBe('');
    expect(records[1].shiftLookupFailed).toBeFalse();
    expect(service.overtimeList().length).toBe(2);
  });
});
