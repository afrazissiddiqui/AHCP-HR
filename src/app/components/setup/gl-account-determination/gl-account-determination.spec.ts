import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { GlAccountDeterminationService } from '../../../services/gl-account-determination.service';
import {
  GatePassBusinessPartnerService,
} from '../../gate-pass/gate-pass-business-partner.service';
import { GlAccountDeterminationComponent } from './gl-account-determination';

describe('GlAccountDeterminationComponent', () => {
  let fixture: ComponentFixture<GlAccountDeterminationComponent>;
  let component: GlAccountDeterminationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlAccountDeterminationComponent],
      providers: [
        {
          provide: AlertService,
          useValue: {
            validation: jasmine.createSpy('validation'),
            success: jasmine.createSpy('success'),
            warning: jasmine.createSpy('warning'),
            error: jasmine.createSpy('error'),
            confirm: jasmine.createSpy('confirm').and.resolveTo({ isConfirmed: true }),
          },
        },
        {
          provide: GlAccountDeterminationService,
          useValue: {
            fetchGlAccountOptions: () => of([]),
            fetchGlAccountDeterminations: () => of([]),
            addGlAccountDetermination: () => of({}),
            updateGlAccountDetermination: () => of({}),
            deleteGlAccountDetermination: () => of({}),
          },
        },
        {
          provide: GatePassBusinessPartnerService,
          useValue: {
            ensureAllLoaded: () => of(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlAccountDeterminationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('duplicates the selected row without mutating the original values', () => {
    component.rows = [
      {
        id: 'row-1',
        formName: 'Job Specification Form',
        formValue: 1,
        glItemType: 'Salary',
        salaryGlAccountCode: '1000',
        salaryGlAccountName: 'Cash',
        businessPartner: 'BP-01',
        branch: 'Islamabad',
        debitCreditType: 'Debit',
      },
      {
        id: 'row-2',
        formName: 'Application Form',
        formValue: 2,
        glItemType: 'Expense',
        salaryGlAccountCode: '2000',
        salaryGlAccountName: 'Expense',
        businessPartner: 'BP-02',
        branch: 'Karachi',
        debitCreditType: 'Credit',
      },
    ];

    component.duplicateRow('row-1');

    expect(component.rows.length).toBe(3);
    const duplicate = component.rows[1];
    expect(duplicate.id).not.toBe('row-1');
    expect(duplicate.formName).toBe('Job Specification Form');
    expect(duplicate.glItemType).toBe('Salary');
    expect(duplicate.salaryGlAccountCode).toBe('1000');
    expect(duplicate.businessPartner).toBe('BP-01');
    expect(component.rows[0].salaryGlAccountCode).toBe('1000');
  });
});
