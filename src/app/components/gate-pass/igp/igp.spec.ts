import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DestroyRef, signal } from '@angular/core';
import { of } from 'rxjs';
import { IgpComponent } from './igp';
import { IgpService, type IgpRecord } from './igp.service';
import { AlertService } from '../../../services/alert.service';
import { GatePassLayoutService } from '../gate-pass-layout.service';
import { ShellbarSearchService } from '../../../services/shellbar-search.service';
import { Router } from '@angular/router';

describe('IgpComponent', () => {
  let component: IgpComponent;
  let fixture: ComponentFixture<IgpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IgpComponent],
      providers: [
        {
          provide: IgpService,
          useValue: {
            records: signal<IgpRecord[]>([]),
            fetchInwardGatePasses: () => of([]),
            fetchInwardGatePassDetail: () => of({} as IgpRecord),
            deleteInwardGatePass: () => of({}),
            removeIgpRecord: () => undefined,
          },
        },
        { provide: Router, useValue: { navigateByUrl: () => Promise.resolve(true) } },
        { provide: GatePassLayoutService, useValue: { toggleSidebar: () => undefined } },
        {
          provide: AlertService,
          useValue: {
            warning: () => undefined,
            error: () => undefined,
            success: () => undefined,
            confirm: () => Promise.resolve({ isConfirmed: true }),
          },
        },
        { provide: ShellbarSearchService, useValue: { syncQuery: () => undefined } },
        { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IgpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('builds printable content with the selected IGP details and line items', () => {
    const record = {
      Id: '101',
      referenceNo: 'IGP-001',
      type: 'Inward',
      submittedDate: '2026-07-14',
      businessPartnerName: 'ABC Traders',
      department: 'Stores',
      vehicleNo: 'ABC-123',
      location: 'Lahore',
      totalQty: 25,
      status: 'Posted',
      remarks: 'Ready for dispatch',
      lines: [
        {
          itemCode: 'ITM-1',
          itemName: 'Widget',
          qty: 10,
          serialNumbers: 'BATCH-1',
          category: 'General',
          packingCondition: 'Box',
          productQuality: 'Good',
          uom: 'PCS',
          info: 'Fragile',
          remarks: 'Handle with care',
        },
      ],
    } as unknown as IgpRecord;

    const markup = component.buildPrintableDocument(record);

    expect(markup).toContain('IGP-001');
    expect(markup).toContain('ABC Traders');
    expect(markup).toContain('Widget');
    expect(markup).toContain('Line items');
  });
});
