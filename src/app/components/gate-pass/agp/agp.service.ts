import { Injectable, signal } from '@angular/core';

export interface AgpLineItem {
  itemCode: string;
  itemName: string;
  /** SAP Item Master (OITM) linkage */
  oitmCode: string;
  serialNumbers: string;
  category: string;
  packingCondition: string;
  productQuality: string;
  uom: string;
  qtySent: number;
  qtyReceived: number;
  info: string;
  remarks: string;
}

export interface AgpRecord {
  Id: number;
  /** AGP NO */
  referenceNo: string;
  /** List / search label (typically business partner name) */
  title: string;
  requestingDepartment: string;
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

  reasonForMovement: string;
  requestingEmployee: string;
  requestedBy: string;
  issuedTo: string;

  articleOutDate: string;
  articleReturnedDate: string;

  transporterName: string;
  transporterCnic: string;
  transporterPhone: string;
  biltyNo: string;
  freightAmount: number;

  attachmentFileName?: string;
  headOfSupplyChainApproval: boolean;

  lines: AgpLineItem[];
  totalQtySent: number;
  totalQtyReceived: number;

  /** @deprecated Use requestingDepartment — kept for list/search compatibility */
  department?: string;
}

function emptyLine(): AgpLineItem {
  return {
    itemCode: '',
    itemName: '',
    oitmCode: '',
    serialNumbers: '',
    category: '',
    packingCondition: '',
    productQuality: '',
    uom: '',
    qtySent: 0,
    qtyReceived: 0,
    info: '',
    remarks: '',
  };
}

export function createEmptyAgpLines(count: number): AgpLineItem[] {
  return Array.from({ length: count }, () => emptyLine());
}

/** One blank line for dynamic “Add line” on the create form. */
export function createEmptyAgpLineItem(): AgpLineItem {
  return emptyLine();
}

@Injectable({
  providedIn: 'root',
})
export class AgpService {
  private readonly agpList = signal<AgpRecord[]>([
    {
      Id: 301,
      referenceNo: 'AGP-2026-001',
      title: 'Textile Components Ltd',
      requestingDepartment: 'Procurement',
      department: 'Procurement',
      status: 'Approved',
      submittedDate: '2026-01-10',
      remarks: 'Article receipt against PO',
      selected: false,
      type: 'Purchase Order',
      businessPartnerCode: 'BP-3100',
      baseDocNo: 'PO-2026-0104',
      businessPartnerName: 'Textile Components Ltd',
      vehicleNo: 'LHR-5501',
      reasonForMovement: 'Purchase receipt',
      requestingEmployee: 'EMP-301',
      requestedBy: 'Ahmed Khan',
      issuedTo: 'Article warehouse — Store A',
      articleOutDate: '2026-01-08',
      articleReturnedDate: '',
      transporterName: 'Ali Transport',
      transporterCnic: '35202-1234567-1',
      transporterPhone: '0300-1234567',
      biltyNo: 'BL-77821',
      freightAmount: 15000,
      attachmentFileName: 'invoice-AGP-001.pdf',
      headOfSupplyChainApproval: true,
      lines: [
        {
          itemCode: 'ART-01',
          itemName: 'Cotton yarn 40s',
          oitmCode: 'OITM-ART-01',
          serialNumbers: 'SN-1001, SN-1002',
          category: 'Article',
          packingCondition: 'Bales',
          productQuality: 'A',
          uom: 'KG',
          qtySent: 500,
          qtyReceived: 500,
          info: '',
          remarks: '',
        },
      ],
      totalQtySent: 500,
      totalQtyReceived: 500,
    },
    {
      Id: 302,
      referenceNo: 'AGP-2026-002',
      title: 'Retail Chain East',
      requestingDepartment: 'Sales',
      department: 'Sales',
      status: 'Pending',
      submittedDate: '2026-02-20',
      remarks: '',
      selected: false,
      type: 'Sales Return Request',
      businessPartnerCode: 'BP-RCE',
      baseDocNo: 'SRR-2026-0031',
      businessPartnerName: 'Retail Chain East',
      vehicleNo: 'KHI-7711',
      reasonForMovement: 'Sales return',
      requestingEmployee: 'EMP-302',
      requestedBy: 'Sara Malik',
      issuedTo: 'Returns dock',
      articleOutDate: '2026-02-18',
      articleReturnedDate: '2026-02-20',
      transporterName: 'Fast Cargo',
      transporterCnic: '35202-9876543-2',
      transporterPhone: '0321-7654321',
      biltyNo: 'BL-77001',
      freightAmount: 8500,
      headOfSupplyChainApproval: false,
      lines: createEmptyAgpLines(2),
      totalQtySent: 0,
      totalQtyReceived: 0,
    },
    {
      Id: 303,
      referenceNo: 'AGP-2026-003',
      title: 'CSR program',
      requestingDepartment: 'Marketing',
      department: 'Marketing',
      status: 'Pending',
      submittedDate: '2026-03-05',
      remarks: 'Stand-alone article movement',
      selected: false,
      type: 'Stand Alone Documents',
      businessPartnerCode: 'CSR',
      baseDocNo: 'STD-2026-0207',
      businessPartnerName: 'CSR program',
      vehicleNo: 'LHR-1200',
      reasonForMovement: 'Sample dispatch',
      requestingEmployee: 'EMP-303',
      requestedBy: 'Hassan Raza',
      issuedTo: 'CSR program — external',
      articleOutDate: '2026-03-04',
      articleReturnedDate: '',
      transporterName: 'Company fleet',
      transporterCnic: '35202-1112233-3',
      transporterPhone: '0333-4455667',
      biltyNo: 'BL-78000',
      freightAmount: 0,
      headOfSupplyChainApproval: false,
      lines: createEmptyAgpLines(1),
      totalQtySent: 0,
      totalQtyReceived: 0,
    },
  ]);

  readonly records = this.agpList.asReadonly();

  addAgp(row: Omit<AgpRecord, 'Id' | 'selected'>): void {
    const nextId = Math.max(0, ...this.agpList().map(r => r.Id)) + 1;
    const totalQtySent =
      row.totalQtySent ??
      row.lines.reduce((sum, l) => sum + (Number.isFinite(l.qtySent) ? l.qtySent : 0), 0);
    const totalQtyReceived =
      row.totalQtyReceived ??
      row.lines.reduce((sum, l) => sum + (Number.isFinite(l.qtyReceived) ? l.qtyReceived : 0), 0);
    this.agpList.update(list => [
      ...list,
      {
        ...row,
        department: row.requestingDepartment,
        totalQtySent,
        totalQtyReceived,
        Id: nextId,
        selected: false,
      },
    ]);
  }
}
