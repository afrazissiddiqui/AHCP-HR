import { Injectable, signal } from '@angular/core';

export interface IgpLineItem {
  itemCode: string;
  itemName: string;
  category: string;
  packingCondition: string;
  productQuality: string;
  uom: string;
  qty: number;
  info: string;
  remarks: string;
}

export interface IgpRecord {
  Id: number;
  /** IGP NO */
  referenceNo: string;
  /** List / search label (typically business partner name) */
  title: string;
  department: string;
  status: string;
  /** Document date */
  submittedDate: string;
  remarks?: string;
  selected?: boolean;

  type: string;
  businessPartnerCode: string;
  baseDocNo: string;
  businessPartnerName: string;
  vehicleNo: string;
  fromUnit: string;
  kantaSlip: string;
  biltyNo: string;
  store: string;
  freight: string;
  weightMachineName: string;
  weight: string;
  location: string;
  employee: string;
  lines: IgpLineItem[];
  totalQty: number;
}

function emptyLine(): IgpLineItem {
  return {
    itemCode: '',
    itemName: '',
    category: '',
    packingCondition: '',
    productQuality: '',
    uom: '',
    qty: 0,
    info: '',
    remarks: '',
  };
}

export function createEmptyIgpLines(count: number): IgpLineItem[] {
  return Array.from({ length: count }, () => emptyLine());
}

/** One blank line for dynamic “Add line” on the create form. */
export function createEmptyIgpLineItem(): IgpLineItem {
  return emptyLine();
}

@Injectable({
  providedIn: 'root',
})
export class IgpService {
  private readonly igpList = signal<IgpRecord[]>([
    {
      Id: 201,
      referenceNo: 'IGP-2026-001',
      title: 'Acme Supplies',
      department: 'Procurement',
      status: 'Approved',
      submittedDate: '2026-01-08',
      remarks: 'PO delivery',
      selected: false,
      type: 'Purchase Order',
      businessPartnerCode: 'BP-1001',
      baseDocNo: 'PO-55421',
      businessPartnerName: 'Acme Supplies',
      vehicleNo: 'LES-1234',
      fromUnit: 'Main Warehouse',
      kantaSlip: 'KS-889',
      biltyNo: 'BL-221',
      store: 'Store A',
      freight: 'Prepaid',
      weightMachineName: 'Kanta-1',
      weight: '12.5',
      location: 'FSD',
      employee: 'EMP-045',
      lines: [
        { itemCode: 'SKU-01', itemName: 'Widget A', category: 'Raw', packingCondition: 'Good', productQuality: 'A', uom: 'KG', qty: 100, info: '', remarks: '' },
      ],
      totalQty: 100,
    },
    {
      Id: 202,
      referenceNo: 'IGP-2026-002',
      title: 'Northern Traders',
      department: 'Operations',
      status: 'Pending',
      submittedDate: '2026-02-14',
      remarks: '',
      selected: false,
      type: 'Sales Return Request',
      businessPartnerCode: 'BP-2200',
      baseDocNo: 'SR-1022',
      businessPartnerName: 'Northern Traders',
      vehicleNo: 'RWP-9988',
      fromUnit: 'Unit North',
      kantaSlip: '',
      biltyNo: 'BL-330',
      store: 'Store B',
      freight: 'To pay',
      weightMachineName: 'Kanta-2',
      weight: '8',
      location: 'PSH',
      employee: 'EMP-112',
      lines: createEmptyIgpLines(2),
      totalQty: 0,
    },
    {
      Id: 203,
      referenceNo: 'IGP-2026-003',
      title: 'Internal transfer',
      department: 'Engineering',
      status: 'Draft',
      submittedDate: '2026-03-01',
      remarks: 'Stand-alone document',
      selected: false,
      type: 'Stand Alone Documents',
      businessPartnerCode: '',
      baseDocNo: '',
      businessPartnerName: 'Internal',
      vehicleNo: '',
      fromUnit: 'FSD Plant',
      kantaSlip: 'KS-901',
      biltyNo: '',
      store: 'Main',
      freight: '',
      weightMachineName: 'Floor scale',
      weight: '2.1',
      location: 'FSD',
      employee: 'EMP-201',
      lines: createEmptyIgpLines(1),
      totalQty: 0,
    },
  ]);

  readonly records = this.igpList.asReadonly();

  addIgp(row: Omit<IgpRecord, 'Id' | 'selected'>): void {
    const nextId = Math.max(0, ...this.igpList().map(r => r.Id)) + 1;
    const totalQty =
      row.totalQty ??
      row.lines.reduce((sum, l) => sum + (Number.isFinite(l.qty) ? l.qty : 0), 0);
    this.igpList.update(list => [...list, { ...row, totalQty, Id: nextId, selected: false }]);
  }
}
