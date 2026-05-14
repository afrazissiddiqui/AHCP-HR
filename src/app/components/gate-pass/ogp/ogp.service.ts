import { Injectable, signal } from '@angular/core';

export interface OgpLineItem {
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

export interface OgpRecord {
  Id: number;
  /** OGP NO */
  referenceNo: string;
  title: string;
  department: string;
  status: string;
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
  lines: OgpLineItem[];
  totalQty: number;
}

function emptyLine(): OgpLineItem {
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

export function createEmptyOgpLines(count: number): OgpLineItem[] {
  return Array.from({ length: count }, () => emptyLine());
}

export function createEmptyOgpLineItem(): OgpLineItem {
  return emptyLine();
}

@Injectable({
  providedIn: 'root',
})
export class OgpService {
  private readonly ogpList = signal<OgpRecord[]>([
    {
      Id: 301,
      referenceNo: 'OGP-2026-001',
      title: 'Eastern Distributors',
      department: 'Logistics',
      status: 'Approved',
      submittedDate: '2026-01-12',
      remarks: 'Full truck load',
      selected: false,
      type: 'Purchase Order',
      businessPartnerCode: 'BP-3100',
      baseDocNo: 'DO-77801',
      businessPartnerName: 'Eastern Distributors',
      vehicleNo: 'LHR-5566',
      fromUnit: 'FSD Plant',
      kantaSlip: 'KS-112',
      biltyNo: 'BL-440',
      store: 'Dispatch',
      freight: 'Collect',
      weightMachineName: 'Kanta-1',
      weight: '24.0',
      location: 'FSD',
      employee: 'EMP-088',
      lines: [
        { itemCode: 'FG-02', itemName: 'Finished good B', category: 'FG', packingCondition: 'Good', productQuality: 'A', uom: 'PCS', qty: 500, info: '', remarks: '' },
      ],
      totalQty: 500,
    },
    {
      Id: 302,
      referenceNo: 'OGP-2026-002',
      title: 'Metro Retail',
      department: 'Sales',
      status: 'Pending',
      submittedDate: '2026-02-20',
      remarks: '',
      selected: false,
      type: 'Sales Return Request',
      businessPartnerCode: 'BP-3201',
      baseDocNo: 'SO-99012',
      businessPartnerName: 'Metro Retail',
      vehicleNo: 'ISB-3011',
      fromUnit: 'PSH DC',
      kantaSlip: '',
      biltyNo: 'BL-551',
      store: 'Store C',
      freight: 'Prepaid',
      weightMachineName: 'Kanta-3',
      weight: '5.5',
      location: 'PSH',
      employee: 'EMP-120',
      lines: createEmptyOgpLines(1),
      totalQty: 0,
    },
  ]);

  readonly records = this.ogpList.asReadonly();

  addOgp(row: Omit<OgpRecord, 'Id' | 'selected'>): void {
    const nextId = Math.max(0, ...this.ogpList().map(r => r.Id)) + 1;
    const totalQty =
      row.totalQty ?? row.lines.reduce((sum, l) => sum + (Number.isFinite(l.qty) ? l.qty : 0), 0);
    this.ogpList.update(list => [...list, { ...row, totalQty, Id: nextId, selected: false }]);
  }
}
