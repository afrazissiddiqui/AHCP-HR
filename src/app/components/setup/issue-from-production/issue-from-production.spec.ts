import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IssueFromProductionComponent } from './issue-from-production';
import { AlertService } from '../../../services/alert.service';

describe('IssueFromProductionComponent', () => {
  let component: IssueFromProductionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueFromProductionComponent, HttpClientTestingModule],
      providers: [
        {
          provide: AlertService,
          useValue: {
            warning: () => undefined,
            error: () => undefined,
            success: () => undefined,
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(IssueFromProductionComponent);
    component = fixture.componentInstance;
  });

  it('maps line-item fields from receipt_from_production responses into the table rows', () => {
    const response = {
      data: [
        {
          DocEntry: 101,
          DocNum: 202,
          DocDate: '2026-07-14',
          DocDueDate: '2026-07-20',
          DocStatus: 'O',
          WhsCode: 'WH01',
          DocumentLines: [
            {
              ItemCode: 'ITM-001',
              Dscription: 'Widget A',
              Quantity: 8,
              WhsCode: 'WH02',
            },
          ],
        },
      ],
    };

    const records = (component as unknown as { extractRecords(response: unknown): Array<Record<string, unknown>> }).extractRecords(response);

    expect(records[0]).toEqual(
      jasmine.objectContaining({
        docEntry: '101',
        docNum: '202',
        docDate: '2026-07-14',
        dueDate: '2026-07-20',
        itemCode: 'ITM-001',
        itemName: 'Widget A',
        quantity: 8,
        warehouse: 'WH02',
        status: 'O',
      }),
    );
  });
});
