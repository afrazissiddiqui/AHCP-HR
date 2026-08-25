import { TestBed } from '@angular/core/testing';
import { WithholdingTaxComponent } from './withholding-tax';
import { ApplicationFormService } from '../../../services/application-form.service';
import { AlertService } from '../../../services/alert.service';
import {
  computeMonthlyWithholdingTax,
  WithholdingTaxService,
} from '../../../services/withholding-tax.service';

describe('WithholdingTaxComponent', () => {
  let component: WithholdingTaxComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithholdingTaxComponent],
      providers: [
        {
          provide: ApplicationFormService,
          useValue: {
            getApplicationRecords: () => [],
            fetchEmployeeProfiles: () => ({ subscribe: () => undefined }),
          },
        },
        {
          provide: AlertService,
          useValue: {
            error: jasmine.createSpy('error'),
          },
        },
        {
          provide: WithholdingTaxService,
          useValue: {
            addWithholdingTax: () => ({ subscribe: () => undefined }),
            deleteWithholdingTax: () => ({ pipe: () => ({ subscribe: () => undefined }) }),
            fetchWithholdingTaxes: () => ({ subscribe: () => undefined }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(WithholdingTaxComponent);
    component = fixture.componentInstance;
  });

  it('tracks tax bracket rows by index so edits do not recreate the row DOM', () => {
    expect(component.trackByTaxBracket(3)).toBe(3);
  });

  it('calculates monthly tax from annual gross salary above the lower limit', () => {
    expect(
      computeMonthlyWithholdingTax(134000 / 12, [
        {
          id: 1,
          lower_limit: 100000,
          upper_limit: 200000,
          tax_rate: 3,
          amount: 0,
          description: '',
          status: 'Active',
        },
      ]),
    ).toBe(85);
  });
});
