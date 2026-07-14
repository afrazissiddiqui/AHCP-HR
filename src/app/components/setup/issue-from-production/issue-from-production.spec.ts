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

  it('builds the receipt-from-production payload using the selected production order values', () => {
    const record = {
      docEntry: 17,
      docDate: '2026-07-02',
      itemCode: 'FG-001',
      itemName: 'Finished Goods',
      quantity: 1,
      warehouse: 'PSH-WH06',
      batchNumber: 'FG250702001',
    };

    const payload = (component as unknown as {
      buildReceiptFromProductionPayload(record: Record<string, unknown>): Record<string, unknown>;
    }).buildReceiptFromProductionPayload(record);

    expect(payload).toEqual(
      jasmine.objectContaining({
        docEntry: 17,
        docDate: '2026-07-02',
        taxDate: '2026-07-02',
        docDueDate: '2026-07-02',
        remarks: 'Receipt From Production Api hit',
        warehouse: 'PSH-WH06',
        quantity: 1,
        batchNumber: 'FG250702001',
        branch: '1',
      }),
    );
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
