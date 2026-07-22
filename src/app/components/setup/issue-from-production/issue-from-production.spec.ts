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

  it('defaults the warehouse for every selected item from the chosen branch', () => {
    component.headerForm.set({
      ...component.headerForm(),
      branchId: '3',
      branchName: 'AHCP_Faisalabad',
    });
    component.selectedProductionOrder.set({
      docEntry: '17',
      docNum: 'PO-100',
      postDate: '2026-07-02',
      dueDate: '2026-07-02',
      warehouse: 'WH01',
      batchNumber: 'B1',
      status: 'O',
      items: [
        {
          lineNum: '1',
          itemCode: 'FG-001',
          itemDescription: 'Finished Goods A',
          quantity: 2,
          warehouse: '',
          batchNumber: '',
          manufacturingDate: '',
          expiryDate: '',
          baseLine: '1',
        },
        {
          lineNum: '2',
          itemCode: 'FG-002',
          itemDescription: 'Finished Goods B',
          quantity: 3,
          warehouse: '',
          batchNumber: '',
          manufacturingDate: '',
          expiryDate: '',
          baseLine: '2',
        },
      ],
    });
    component.selectedProductionOrderItemKeys.set(new Set(['1:FG-001', '2:FG-002']));

    component.applySelectedProductionOrderItems();

    expect(component.contentLines().map((line) => line.warehouse)).toEqual(['FSD-WH03', 'FSD-WH03']);
  });

  it('selects and clears all production order items from the modal', () => {
    component.selectedProductionOrder.set({
      docEntry: '17',
      docNum: 'PO-100',
      postDate: '2026-07-02',
      dueDate: '2026-07-02',
      warehouse: 'WH01',
      batchNumber: 'B1',
      status: 'O',
      items: [
        {
          lineNum: '1',
          itemCode: 'FG-001',
          itemDescription: 'Finished Goods A',
          quantity: 2,
          warehouse: '',
          batchNumber: '',
          manufacturingDate: '',
          expiryDate: '',
          baseLine: '1',
        },
        {
          lineNum: '2',
          itemCode: 'FG-002',
          itemDescription: 'Finished Goods B',
          quantity: 3,
          warehouse: '',
          batchNumber: '',
          manufacturingDate: '',
          expiryDate: '',
          baseLine: '2',
        },
      ],
    });

    component.toggleSelectAllProductionOrderItems();
    expect(component.selectedProductionOrderItemKeys().size).toBe(2);

    component.toggleSelectAllProductionOrderItems();
    expect(component.selectedProductionOrderItemKeys().size).toBe(0);
  });

  it('updates the active batch line with the selected batch and a quantity', () => {
    component.contentLines.set([
      {
        itemCode: 'FG-001',
        itemDescription: 'Finished Goods A',
        warehouse: 'FSD-WH03',
        quantity: 2,
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        baseEntry: '17',
        baseLine: '1',
        availableBatches: [{ batchNo: 'B-100', quantity: 5 }],
      },
    ]);

    component.activeBatchSelectionLineIndex.set(0);
    component.selectBatchForActiveLine({ batchNo: 'B-100', quantity: 5 });
    component.updateBatchIssueQuantity({ batchNo: 'B-100', quantity: 5 }, '4');

    expect(component.contentLines()[0].batchNumber).toBe('B-100');
    expect(component.contentLines()[0].quantity).toBe(2);
    expect(component.contentLines()[0].availableBatches[0].issueQuantity).toBe(4);
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
