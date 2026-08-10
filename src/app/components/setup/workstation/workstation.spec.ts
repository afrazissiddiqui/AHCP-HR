import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { WorkstationComponent } from './workstation';
import { AlertService } from '../../../services/alert.service';
import { WorkstationService } from '../../../services/workstation.service';

describe('WorkstationComponent', () => {
  let fixture: ComponentFixture<WorkstationComponent>;
  let component: WorkstationComponent;
  let workstationService: jasmine.SpyObj<WorkstationService>;
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
    workstationService.fetchWorkstationDetail.and.returnValue(of({} as never));
    workstationService.deleteWorkstation.and.returnValue(of({}));

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
        { provide: AlertService, useValue: alertService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkstationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('includes the shift field when saving a new workstation', () => {
    component.formName.set('Head Office');
    component.formOfficeInTime.set('09:00');
    component.formOfficeOutTime.set('17:00');
    component.formInGraceMinutes.set('15');
    component.formOutGraceMinutes.set('10');
    component.formDescription.set('Regular office hours');

    const shiftInput = fixture.nativeElement.querySelector('input[name="shift"]') as HTMLInputElement;
    expect(shiftInput).toBeTruthy();

    shiftInput.value = 'Morning Shift';
    shiftInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    component.submitWorkstation();

    expect(workstationService.addWorkstation).toHaveBeenCalledWith(
      jasmine.objectContaining({ shift: 'Morning Shift' }),
    );
  });
});
