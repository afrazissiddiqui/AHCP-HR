import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AlertService } from '../../../../services/alert.service';
import { AuthService } from '../../../../services/auth.service';
import { MiscellaneousLayoutService } from '../../miscellaneous-layout.service';
import { AddReceiptFromProduction } from './add-receipt-from-production';
import { ReceiptFromProductionService, buildCreateReceiptFromProductionPayload } from '../receipt-from-production.service';
import { createEmptyReceiptFromProductionLine } from '../receipt-from-production.model';

describe('AddReceiptFromProduction', () => {
  let component: AddReceiptFromProduction;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddReceiptFromProduction],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
        {
          provide: AuthService,
          useValue: { getSessionUser: () => ({ name: 'Test User' }) },
        },
        {
          provide: AlertService,
          useValue: {
            validation: jasmine.createSpy('validation'),
            success: jasmine.createSpy('success'),
            error: jasmine.createSpy('error'),
          },
        },
        {
          provide: MiscellaneousLayoutService,
          useValue: {
            backToModuleHome: jasmine.createSpy('backToModuleHome'),
            toggleSidebar: jasmine.createSpy('toggleSidebar'),
          },
        },
        {
          provide: ReceiptFromProductionService,
          useValue: {
            create: () => of({}),
            listProductionOrders: () => of([]),
          },
        },
      ],
    }).compileComponents();

    component = TestBed.createComponent(AddReceiptFromProduction).componentInstance;
  });

  it('only populates header values when a production order is selected', () => {
    component.applyProductionOrder({
      docEntry: '53',
      docNum: '4',
      postDate: '2026-07-20',
      dueDate: '2026-07-20',
      startDate: '2026-07-20',
      status: 'R',
      warehouse: 'FSD-WH03',
      branch: '3',
      batchNumber: 'Toll-FSD-2026-00000003',
      items: [
        {
          lineNum: '1',
          itemCode: 'FG-Toll-P-00000069',
          itemDescription: 'Toll Flint - Preform 45 Gram',
          quantity: 8064,
          warehouse: 'FSD-WH03',
          batchNumber: 'Toll-FSD-2026-00000003',
          manufacturingDate: '2026-07-20',
          expiryDate: '2026-07-30',
          baseLine: '1',
        },
      ],
    } as any);

    expect(component.headerForm().baseProductionOrderDocEntry).toBe('53');
    expect(component.headerForm().baseProductionOrderDocNum).toBe('4');
    expect(component.headerForm().postingDate).toBe('2026-07-20');
    expect(component.headerForm().dueDate).toBe('2026-07-20');
    expect(component.headerForm().branchId).toBe('3');
    expect(component.contentLines().length).toBe(1);
    expect(component.contentLines()[0].itemCode).toBe('FG-Toll-P-00000069');
    expect(component.contentLines()[0].itemDescription).toBe('Toll Flint - Preform 45 Gram');
    expect(component.contentLines()[0].warehouse).toBe('FSD-WH03');
  });

  it('uses the manually selected warehouse when creating the payload', () => {
    component.contentLines.set([
      {
        ...createEmptyReceiptFromProductionLine(),
        itemCode: 'FG-Toll-P-00000069',
        quantity: 10,
        warehouse: 'PSH-WH06',
      },
    ]);

    component.updateContentLine(0, 'warehouse', 'FSD-WH03');

    const payload = buildCreateReceiptFromProductionPayload(component.headerForm(), component.contentLines());

    expect(payload.warehouse).toBe('FSD-WH03');
  });

  it('prefers the changed line warehouse over a prefilled header warehouse', () => {
    component.headerForm.set({
      ...component.headerForm(),
      warehouse: 'PSH-WH06',
    });

    component.contentLines.set([
      {
        ...createEmptyReceiptFromProductionLine(),
        itemCode: 'FG-Toll-P-00000069',
        quantity: 10,
        warehouse: 'PSH-WH06',
      },
    ]);

    component.updateContentLine(0, 'warehouse', 'FSD-WH03');

    const payload = buildCreateReceiptFromProductionPayload(component.headerForm(), component.contentLines());

    expect(payload.warehouse).toBe('FSD-WH03');
  });
});
