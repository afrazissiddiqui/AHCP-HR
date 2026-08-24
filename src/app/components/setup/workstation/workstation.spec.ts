import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { WorkstationComponent } from './workstation';
import { AlertService } from '../../../services/alert.service';
import { ApplicationFormService } from '../../../services/application-form.service';
import { WorkstationRecord, WorkstationService } from '../../../services/workstation.service';

describe('WorkstationComponent', () => {
  let fixture: ComponentFixture<WorkstationComponent>;
  let component: WorkstationComponent;
  let workstationService: jasmine.SpyObj<WorkstationService>;
  let applicationFormService: jasmine.SpyObj<ApplicationFormService>;
  let alertService: jasmine.SpyObj<AlertService>;

  beforeEach(async () => {
    workstationService = jasmine.createSpyObj<WorkstationService>('WorkstationService', [
      'fetchWorkstations',
      'addWorkstation',
      'updateWorkstation',
      'fetchWorkstationDetail',
      'deleteWorkstation',
    ]);
    workstationService.fetchWorkstations.and.returnValue(of([]));
    workstationService.addWorkstation.and.returnValue(of({}));
    workstationService.updateWorkstation.and.returnValue(of({}));
    workstationService.fetchWorkstationDetail.and.returnValue(of({} as WorkstationRecord));
    workstationService.deleteWorkstation.and.returnValue(of({}));

    applicationFormService = jasmine.createSpyObj<ApplicationFormService>('ApplicationFormService', [
      'fetchEmployeeProfiles',
    ]);
    applicationFormService.fetchEmployeeProfiles.and.returnValue(of([]));

    alertService = jasmine.createSpyObj<AlertService>('AlertService', [
      'validation',
      'success',
      'error',
      'warning',
      'confirm',
    ]);
    alertService.confirm.and.resolveTo({ isConfirmed: true } as never);

    await TestBed.configureTestingModule({
      imports: [WorkstationComponent],
      providers: [
        { provide: WorkstationService, useValue: workstationService },
        { provide: ApplicationFormService, useValue: applicationFormService },
        { provide: AlertService, useValue: alertService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkstationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('submits the workstation add payload expected by the API', () => {
    component.formName.set('Head Office');
    component.formOfficeInTime.set('09:00');
    component.formOfficeOutTime.set('18:00');
    component.formInGraceMinutes.set('10');
    component.formOutGraceMinutes.set('15');
    component.formShift.set('Morning');
    component.formDescription.set('Used for regular office attendance policy.');

    component.submitWorkstation();

    expect(workstationService.addWorkstation).toHaveBeenCalledWith(
      {
        name: 'Head Office',
        office_in_time: '09:00',
        office_out_time: '18:00',
        in_grace_minutes: 10,
        out_grace_minutes: 15,
        description: 'Used for regular office attendance policy.',
        shift: 'Morning',
        status: 'Active',
      },
    );
  });

  it('accepts numeric values emitted by minute inputs', () => {
    component.formName.set('Head Office');
    component.formOfficeInTime.set('09:00');
    component.formOfficeOutTime.set('18:00');
    component.formInGraceMinutes.set(10);
    component.formOutGraceMinutes.set(15);

    component.submitWorkstation();

    expect(workstationService.addWorkstation).toHaveBeenCalled();
  });

  it('renders the shift returned by the workstation list', () => {
    workstationService.fetchWorkstations.and.returnValue(
      of([
        {
          id: 1,
          name: 'Head Office',
          code: '',
          officeInTime: '09:00',
          officeOutTime: '18:00',
          inGraceMinutes: 10,
          outGraceMinutes: 15,
          shift: 'Morning Shift',
          description: '',
          status: 'Active',
        },
      ]),
    );

    component.loadWorkstations();
    fixture.detectChanges();

    const workstationRow = fixture.nativeElement.querySelector('table.entry-table tbody tr') as HTMLElement;
    expect(workstationRow.textContent).toContain('Morning Shift');
  });

  it('renders an employee table with the requested columns', () => {
    const tables = fixture.nativeElement.querySelectorAll('table.entry-table');
    expect(tables.length).toBe(2);

    const employeeHeaders = Array.from(tables[1].querySelectorAll('th')).map((header) => (header as HTMLElement).textContent?.trim());
    expect(employeeHeaders).toEqual(['Employee ID', 'Employee Name', 'Shift Alot', 'Reporting Manager']);
  });

  it('lists only application profiles where shift is applicable', () => {
    applicationFormService.fetchEmployeeProfiles.and.returnValue(
      of([
        {
          EmployeeCode: 'E001',
          EmployeeName: 'Shift Employee',
          Department: '',
          EmployeeNature: '',
          Designation: '',
          ReportingManager: 'Manager',
          EmploymentType: '',
          EmploymentStatus: '',
          EmploymentCategory: '',
          status: '',
          detail: {
            hrSettings: { attendanceShiftManagement: 'Yes' },
          } as never,
        },
        {
          EmployeeCode: 'E002',
          EmployeeName: 'Office Employee',
          Department: '',
          EmployeeNature: '',
          Designation: '',
          ReportingManager: '',
          EmploymentType: '',
          EmploymentStatus: '',
          EmploymentCategory: '',
          status: '',
          detail: {
            hrSettings: { attendanceShiftManagement: 'No' },
          } as never,
        },
      ]),
    );

    component['loadShiftApplicableEmployees']();
    fixture.detectChanges();

    const employeeRows = fixture.nativeElement.querySelectorAll('table.entry-table')[1].querySelectorAll('tbody tr');
    expect(employeeRows.length).toBe(1);
    expect(employeeRows[0].textContent).toContain('E001');
    expect(employeeRows[0].textContent).not.toContain('E002');
  });
});
