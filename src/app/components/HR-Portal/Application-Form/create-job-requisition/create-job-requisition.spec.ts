import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CreateJobRequisitionComponent } from './create-job-requisition';
import { ApplicationFormService } from '../../../../services/application-form.service';
import { JobSpecificationService } from '../../../../services/job-specification.service';
import { LeaveTypeService } from '../../../../services/leave-type.service';
import { GatePassItemMasterService } from '../../../gate-pass/gate-pass-item-master.service';
import { GatePassDepartmentService } from '../../../gate-pass/gate-pass-department.service';
import { AlertService } from '../../../../services/alert.service';

describe('CreateJobRequisitionComponent validation', () => {
  let component: CreateJobRequisitionComponent;

  beforeEach(() => {
    component = new CreateJobRequisitionComponent(
      {} as Router,
      { snapshot: {} } as ActivatedRoute,
      { scrollToAnchor: () => undefined } as unknown as ViewportScroller,
      { fetchEmployeeProfileDetail: () => ({ subscribe: () => undefined }), formatEmployeeUserId: () => '', getNextEmployeeCode: () => '1234' } as unknown as ApplicationFormService,
      { fetchJobSpecificationsForApplication: () => ({ subscribe: () => undefined }) } as unknown as JobSpecificationService,
      { fetchLeaveTypes: () => ({ subscribe: () => undefined }) } as unknown as LeaveTypeService,
      { listAllocatableAssets: () => [] } as unknown as GatePassItemMasterService,
      { ensureLoaded: () => ({ subscribe: () => undefined }), departmentNames: () => [] } as unknown as GatePassDepartmentService,
      { warning: () => undefined, error: () => undefined } as unknown as AlertService,
      { markForCheck: () => undefined } as unknown as ChangeDetectorRef,
    );
  });

  it('does not require payment-related fields when submitting the application', () => {
    (component as unknown as { paymentMode: { set: (value: string) => void } }).paymentMode.set('Bank');
    (component as unknown as { validationSubmitted: { set: (value: boolean) => void } }).validationSubmitted.set(true);

    expect((component as unknown as { isRequiredMissing: (field: string) => boolean }).isRequiredMissing('paymentMode')).toBeFalse();
    expect((component as unknown as { isRequiredMissing: (field: string) => boolean }).isRequiredMissing('accountTitle')).toBeFalse();
    expect((component as unknown as { isRequiredMissing: (field: string) => boolean }).isRequiredMissing('bankName')).toBeFalse();
    expect((component as unknown as { isRequiredMissing: (field: string) => boolean }).isRequiredMissing('accountNo')).toBeFalse();
  });

  it('allows the legacy code field to be edited in the login details form', async () => {
    await TestBed.configureTestingModule({
      imports: [CreateJobRequisitionComponent],
      providers: [
        { provide: Router, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: ViewportScroller, useValue: { scrollToAnchor: () => undefined } },
        {
          provide: ApplicationFormService,
          useValue: {
            getNextEmployeeCode: () => '1234',
            formatEmployeeUserId: (value: string) => value,
            fetchEmployeeProfileDetail: () => of({ detail: null }),
            normalizeEmployeeCodeValue: (value: string) => value,
          },
        },
        {
          provide: JobSpecificationService,
          useValue: { fetchJobSpecificationsForApplication: () => of([]) },
        },
        {
          provide: LeaveTypeService,
          useValue: { fetchLeaveTypes: () => of([]) },
        },
        {
          provide: GatePassItemMasterService,
          useValue: { listAllocatableAssets: () => [] },
        },
        {
          provide: GatePassDepartmentService,
          useValue: { ensureLoaded: () => of([]), departmentNames: () => [] },
        },
        { provide: AlertService, useValue: { warning: () => undefined, error: () => undefined } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CreateJobRequisitionComponent);
    fixture.detectChanges();

    const inputs = Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[];
    const legacyInput = inputs.find((input) => input.placeholder === 'Legacy code');

    expect(legacyInput).toBeTruthy();
    expect(legacyInput?.hasAttribute('readonly')).toBeFalse();

    legacyInput!.value = 'EL-1025';
    legacyInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect((fixture.componentInstance as any).legacyCode()).toBe('EL-1025');
  });
});