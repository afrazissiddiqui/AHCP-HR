import { TestBed } from '@angular/core/testing';
import { WithholdingTaxComponent } from './withholding-tax';
import { ApplicationFormService } from '../../../services/application-form.service';
import { AlertService } from '../../../services/alert.service';

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
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(WithholdingTaxComponent);
    component = fixture.componentInstance;
  });

  it('tracks tax bracket rows by index so edits do not recreate the row DOM', () => {
    expect(component.trackByTaxBracket(3)).toBe(3);
  });
});
