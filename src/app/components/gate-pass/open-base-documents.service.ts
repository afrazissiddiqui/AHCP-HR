import { Injectable } from '@angular/core';

/** Line payload carried from a base document into the gate pass form. */
export interface BaseDocLinePayload {
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

/** A base document that is still open and can be linked to a gate pass. */
export interface OpenBaseDocument {
  number: string;
  title: string;
  partner?: string;
  date?: string;
  businessPartnerCode?: string;
  businessPartnerName?: string;
  vehicleNo?: string;
  fromUnit?: string;
  kantaSlip?: string;
  department?: string;
  biltyNo?: string;
  store?: string;
  freight?: string;
  weightMachineName?: string;
  weight?: string;
  location?: string;
  referenceNo?: string;
  remarks?: string;
  lines?: BaseDocLinePayload[];
}

function line(
  itemCode: string,
  itemName: string,
  category: string,
  packingCondition: string,
  productQuality: string,
  uom: string,
  qty: number,
  info: string,
  remarks: string
): BaseDocLinePayload {
  return { itemCode, itemName, category, packingCondition, productQuality, uom, qty, info, remarks };
}

const OPEN_BY_TYPE: Record<string, OpenBaseDocument[]> = {
  'Purchase Order': [
    {
      number: 'PO-2026-0104',
      title: 'Packaging materials',
      partner: 'Acme Supplies Ltd',
      date: '2026-05-12',
      businessPartnerCode: 'BP-ACME',
      businessPartnerName: 'Acme Supplies Ltd',
      vehicleNo: 'LHR-9012',
      fromUnit: 'Main plant',
      kantaSlip: 'KS-10488',
      department: 'Procurement',
      biltyNo: 'BL-77821',
      store: 'Store A',
      freight: 'Prepaid',
      weightMachineName: 'Kanta-1',
      weight: '18.2',
      location: 'FSD',
      referenceNo: '',
      remarks: 'PO packaging — partial receipt scheduled.',
      lines: [
        line('PKG-01', 'Corrugated boxes 3-ply', 'Packaging', 'Sealed', 'Grade A', 'EA', 1200, 'Batch A', ''),
        line('PKG-02', 'Stretch film rolls', 'Packaging', 'Sealed', 'Grade A', 'ROLL', 40, '18 inch', ''),
      ],
    },
    {
      number: 'PO-2026-0109',
      title: 'Spare parts batch 2',
      partner: 'Northern Traders',
      date: '2026-05-14',
      businessPartnerCode: 'BP-NTRD',
      businessPartnerName: 'Northern Traders',
      vehicleNo: 'RWP-4450',
      fromUnit: 'Unit 2',
      kantaSlip: 'KS-10502',
      department: 'Operations',
      biltyNo: 'BL-77901',
      store: 'Spares',
      freight: 'To pay',
      weightMachineName: 'Kanta-2',
      weight: '2.4',
      location: 'PSH',
      referenceNo: '',
      remarks: 'Mechanical spares — gate pass against open PO.',
      lines: [
        line('SP-M12', 'Bearing set M12', 'Spares', 'Oiled', 'Standard', 'SET', 24, 'OEM', ''),
        line('SP-BLT', 'Drive belt B-100', 'Spares', 'Wrapped', 'Standard', 'PC', 8, '', ''),
      ],
    },
    {
      number: 'PO-2026-0115',
      title: 'Raw cotton — grade A',
      partner: 'Cotton Mills Co.',
      date: '2026-05-15',
      businessPartnerCode: 'BP-COTN',
      businessPartnerName: 'Cotton Mills Co.',
      vehicleNo: 'FSB-2201',
      fromUnit: 'Ginning yard',
      kantaSlip: 'KS-10520',
      department: 'Procurement',
      biltyNo: 'BL-77944',
      store: 'Raw material',
      freight: 'Prepaid',
      weightMachineName: 'Weighbridge East',
      weight: '22.0',
      location: 'FSD',
      referenceNo: '',
      remarks: 'Cotton intake — quality lab cleared.',
      lines: [line('RM-CTN', 'Raw cotton grade A', 'Raw', 'Bales', 'Grade A', 'KG', 22000, 'Lot 15-A', '')],
    },
  ],
  'Sales Return Request': [
    {
      number: 'SRR-2026-0031',
      title: 'Return — damaged cartons',
      partner: 'Retail Chain East',
      date: '2026-05-08',
      businessPartnerCode: 'BP-RCE',
      businessPartnerName: 'Retail Chain East',
      vehicleNo: 'KHI-7711',
      fromUnit: 'RDC East',
      kantaSlip: 'KS-10340',
      department: 'Sales',
      biltyNo: 'BL-77001',
      store: 'Returns dock',
      freight: 'Customer',
      weightMachineName: 'Kanta-1',
      weight: '3.1',
      location: 'PSH',
      referenceNo: '',
      remarks: 'Sales return authorization SR-31.',
      lines: [line('RET-01', 'Mixed SKU return pallet', 'Returns', 'Mixed', 'Hold', 'PLT', 2, 'Inspect', '')],
    },
    {
      number: 'SRR-2026-0034',
      title: 'Return — quality hold',
      partner: 'Wholesale Hub',
      date: '2026-05-11',
      businessPartnerCode: 'BP-WHUB',
      businessPartnerName: 'Wholesale Hub',
      vehicleNo: 'LHR-8899',
      fromUnit: 'Hub DC',
      kantaSlip: 'KS-10388',
      department: 'Logistics',
      biltyNo: 'BL-77088',
      store: 'QA hold',
      freight: 'To pay',
      weightMachineName: 'Kanta-2',
      weight: '5.0',
      location: 'FSD',
      referenceNo: '',
      remarks: 'Quality hold release pending QA sign-off.',
      lines: [
        line('FG-220', 'Finished goods lot 220', 'FG', 'Palletized', 'Hold', 'CTN', 320, 'QA tag Q-34', ''),
      ],
    },
  ],
  'Stand Alone Documents': [
    {
      number: 'STD-2026-0200',
      title: 'Misc. movement authorization',
      partner: 'Internal',
      date: '2026-05-01',
      businessPartnerCode: 'INT',
      businessPartnerName: 'Internal transfer',
      vehicleNo: 'INT-001',
      fromUnit: 'Admin',
      kantaSlip: 'KS-10001',
      department: 'Operations',
      biltyNo: '',
      store: 'General',
      freight: 'N/A',
      weightMachineName: 'Kanta-1',
      weight: '0.5',
      location: 'FSD',
      referenceNo: '',
      remarks: 'Stand-alone movement per management memo 44.',
      lines: [line('MISC-01', 'Promotional samples bundle', 'Misc', 'Box', 'N/A', 'BOX', 3, 'Non-valuated', '')],
    },
    {
      number: 'STD-2026-0207',
      title: 'Donation / sample dispatch',
      partner: 'CSR program',
      date: '2026-05-16',
      businessPartnerCode: 'CSR',
      businessPartnerName: 'CSR program',
      vehicleNo: 'LHR-1200',
      fromUnit: 'CSR office',
      kantaSlip: 'KS-10601',
      department: 'Marketing',
      biltyNo: 'BL-78000',
      store: 'Samples',
      freight: 'Company',
      weightMachineName: 'Kanta-2',
      weight: '0.2',
      location: 'PSH',
      referenceNo: '',
      remarks: 'Donation dispatch — no commercial invoice.',
      lines: [line('SMP-CSR', 'Product sample kit CSR', 'Samples', 'Carton', 'N/A', 'KIT', 15, '', '')],
    },
  ],
};

@Injectable({ providedIn: 'root' })
export class OpenBaseDocumentsService {
  /** Open (linkable) documents for the selected gate-pass document type. */
  listOpenByType(documentType: string): OpenBaseDocument[] {
    const key = documentType?.trim() || '';
    const list = OPEN_BY_TYPE[key];
    if (!list) return [];
    return list.map(doc => ({
      ...doc,
      lines: doc.lines?.map(l => ({ ...l })),
    }));
  }
}
