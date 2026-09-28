import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApplicationFormRecord, ApplicationFormService } from './application-form.service';
import { OvertimeListRecord, OvertimeListService } from './overtime-list.service';

describe('OvertimeListService', () => {
  let service: OvertimeListService;
  beforeEach(() => {
    const applicationFormService = jasmine.createSpyObj<ApplicationFormService>('ApplicationFormService', [
      'fetchEmployeeProfiles',
    ]);
    applicationFormService.fetchEmployeeProfiles.and.returnValue(of([
      {
        EmployeeCode: 'EMP-001',
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

    expect(records.map((record) => record.employeeId)).toEqual(['EMP-001']);
    expect(service.overtimeList().length).toBe(1);
  });
});
