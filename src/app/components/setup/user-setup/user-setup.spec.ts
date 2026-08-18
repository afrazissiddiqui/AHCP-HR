import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserSetupComponent } from './user-setup';
import { UserSetupService } from '../../../services/user-setup.service';
import { ApplicationFormService } from '../../../services/application-form.service';
import { AlertService } from '../../../services/alert.service';

describe('UserSetupComponent', () => {
  let fixture: ComponentFixture<UserSetupComponent>;
  let component: UserSetupComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSetupComponent],
      providers: [
        {
          provide: UserSetupService,
          useValue: {
            fetchUsers: () => of([]),
            addUser: () => of({}),
            updateUser: () => of({}),
            deleteUser: () => of({}),
          },
        },
        {
          provide: ApplicationFormService,
          useValue: {
            fetchEmployeeProfiles: () => of([]),
          },
        },
        {
          provide: AlertService,
          useValue: {
            validation: () => Promise.resolve(),
            error: () => Promise.resolve(),
            success: () => Promise.resolve(),
            warning: () => Promise.resolve(),
            confirm: () => Promise.resolve({ isConfirmed: false }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows employee-code suggestions even when the employee name is missing', () => {
    component.employeeProfiles.set([
      { EmployeeCode: 'EMP-00001', EmployeeName: '' } as any,
      { EmployeeCode: 'EMP-00002', EmployeeName: 'Alice Johnson' } as any,
    ]);
    component.employeeCodeSearchText.set('EMP');

    const codes = component.employeeCodeOptions().map((option) => option.code);

    expect(codes).toContain('EMP-00001');
    expect(codes).toContain('EMP-00002');
  });
});
