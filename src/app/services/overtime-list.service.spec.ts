import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApplicationFormService } from './application-form.service';
import { OvertimeListService } from './overtime-list.service';

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
        },
      },
    ] as never));

    TestBed.configureTestingModule({
      providers: [
        OvertimeListService,
        { provide: ApplicationFormService, useValue: applicationFormService },
      ],
    });
    service = TestBed.inject(OvertimeListService);
  });

  it('lists only employees whose overtime is applicable', () => {
    let records: unknown[] = [];

    service.fetchOvertimeList().subscribe((result) => (records = result));

    expect(records.map((record) => record.employeeId)).toEqual(['EMP-001']);
    expect(service.overtimeList().length).toBe(1);
  });
});
