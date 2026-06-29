import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { apiUrl } from '../../config/api.config';

export type GatePassModule = 'igp' | 'ogp' | 'agp';

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
  /** AGP-specific header fields (optional on demo base documents). */
  reasonForMovement?: string;
  requestingEmployee?: string;
  requestedBy?: string;
  issuedTo?: string;
  articleOutDate?: string;
  articleReturnedDate?: string;
  transporterName?: string;
  transporterCnic?: string;
  transporterPhone?: string;
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
  remarks: string,
): BaseDocLinePayload {
  return { itemCode, itemName, category, packingCondition, productQuality, uom, qty, info, remarks };
}

function cloneDocuments(list: OpenBaseDocument[]): OpenBaseDocument[] {
  return list.map((doc) => ({
    ...doc,
    lines: doc.lines?.map((l) => ({ ...l })),
  }));
}

const IGP_OPEN_BY_TYPE: Record<string, OpenBaseDocument[]> = {
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
      freight: '1250',
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
      freight: '850',
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
      freight: '4200',
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
      freight: '0',
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
      freight: '650',
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
      freight: '0',
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
      freight: '200',
      weightMachineName: 'Kanta-2',
      weight: '0.2',
      location: 'PSH',
      referenceNo: '',
      remarks: 'Donation dispatch — no commercial invoice.',
      lines: [line('SMP-CSR', 'Product sample kit CSR', 'Samples', 'Carton', 'N/A', 'KIT', 15, '', '')],
    },
  ],
};

const OGP_OPEN_BY_TYPE: Record<string, OpenBaseDocument[]> = {
  Delivery: [
    {
      number: 'DEL-2026-0041',
      title: 'Customer shipment — North region',
      partner: 'Metro Retail Group',
      date: '2026-05-18',
      businessPartnerCode: 'BP-MRG',
      businessPartnerName: 'Metro Retail Group',
      vehicleNo: 'LHR-3344',
      fromUnit: 'FG warehouse',
      kantaSlip: 'KS-10640',
      department: 'Sales',
      biltyNo: 'BL-78110',
      store: 'Dispatch bay 2',
      freight: '2800',
      weightMachineName: 'Weighbridge East',
      weight: '14.6',
      location: 'FSD',
      referenceNo: '',
      remarks: 'Delivery order against SO-2026-1188.',
      lines: [
        line('FG-101', 'Finished yarn cones 40s', 'FG', 'Palletized', 'Grade A', 'CTN', 480, 'SO line 10', ''),
        line('FG-102', 'Finished fabric rolls', 'FG', 'Wrapped', 'Grade A', 'ROLL', 120, 'SO line 20', ''),
      ],
    },
    {
      number: 'DEL-2026-0055',
      title: 'Distributor bulk dispatch',
      partner: 'National Distributors Ltd',
      date: '2026-05-19',
      businessPartnerCode: 'BP-NDL',
      businessPartnerName: 'National Distributors Ltd',
      vehicleNo: 'RWP-7788',
      fromUnit: 'Main plant',
      kantaSlip: 'KS-10655',
      department: 'Logistics',
      biltyNo: 'BL-78144',
      store: 'Loading dock A',
      freight: '5200',
      weightMachineName: 'Kanta-1',
      weight: '19.8',
      location: 'PSH',
      referenceNo: '',
      remarks: 'Full truck load — route permit attached.',
      lines: [line('FG-310', 'Packed garments cartons', 'FG', 'Sealed', 'Export', 'CTN', 960, 'Batch D-55', '')],
    },
    {
      number: 'DEL-2026-0063',
      title: 'Export order — 40ft container',
      partner: 'Global Textile Imports',
      date: '2026-05-20',
      businessPartnerCode: 'BP-GTI',
      businessPartnerName: 'Global Textile Imports',
      vehicleNo: 'KHI-9901',
      fromUnit: 'Export yard',
      kantaSlip: 'KS-10670',
      department: 'Sales',
      biltyNo: 'BL-78190',
      store: 'Export staging',
      freight: '12500',
      weightMachineName: 'Weighbridge East',
      weight: '24.5',
      location: 'Head Office',
      referenceNo: '',
      remarks: 'Export delivery — customs cleared.',
      lines: [
        line('EXP-01', 'Greige fabric bales', 'Export', 'Bales', 'Grade A', 'BALE', 180, 'Container 1', ''),
        line('EXP-02', 'Accessory cartons', 'Export', 'Carton', 'Grade A', 'CTN', 240, 'Container 1', ''),
      ],
    },
  ],
  'Purchase Order': [
    {
      number: 'PO-OUT-2026-0118',
      title: 'Return shipment to vendor',
      partner: 'Precision Parts Co.',
      date: '2026-05-17',
      businessPartnerCode: 'BP-PPC',
      businessPartnerName: 'Precision Parts Co.',
      vehicleNo: 'FSB-1122',
      fromUnit: 'QA reject area',
      kantaSlip: 'KS-10622',
      department: 'Procurement',
      biltyNo: 'BL-78055',
      store: 'Reject store',
      freight: '950',
      weightMachineName: 'Kanta-2',
      weight: '1.8',
      location: 'FSD',
      referenceNo: '',
      remarks: 'Defective batch return against PO-2026-0098.',
      lines: [line('REJ-88', 'Rejected bearing assemblies', 'Returns', 'Boxed', 'Reject', 'SET', 36, 'RMA-118', '')],
    },
    {
      number: 'PO-OUT-2026-0120',
      title: 'Subcontractor material send-out',
      partner: 'Fine Stitching Unit',
      date: '2026-05-18',
      businessPartnerCode: 'BP-FSU',
      businessPartnerName: 'Fine Stitching Unit',
      vehicleNo: 'LHR-5566',
      fromUnit: 'Cutting floor',
      kantaSlip: 'KS-10630',
      department: 'Operations',
      biltyNo: 'BL-78070',
      store: 'WIP store',
      freight: '600',
      weightMachineName: 'Kanta-1',
      weight: '3.2',
      location: 'PSH',
      referenceNo: '',
      remarks: 'Job-work material dispatch per subcontract PO.',
      lines: [
        line('WIP-12', 'Cut fabric bundles', 'WIP', 'Bundled', 'Standard', 'BND', 85, 'Job 120', ''),
        line('WIP-13', 'Trims kit for stitching', 'WIP', 'Bagged', 'Standard', 'KIT', 85, '', ''),
      ],
    },
  ],
  'Sales Return Request': [
    {
      number: 'SRR-OUT-2026-0040',
      title: 'Replacement dispatch after return',
      partner: 'City Mart Stores',
      date: '2026-05-16',
      businessPartnerCode: 'BP-CMS',
      businessPartnerName: 'City Mart Stores',
      vehicleNo: 'LHR-2233',
      fromUnit: 'FG warehouse',
      kantaSlip: 'KS-10605',
      department: 'Sales',
      biltyNo: 'BL-78020',
      store: 'Dispatch bay 1',
      freight: '450',
      weightMachineName: 'Kanta-2',
      weight: '2.1',
      location: 'FSD',
      referenceNo: '',
      remarks: 'Replacement goods after SRR-2026-0039 approval.',
      lines: [line('FG-REP', 'Replacement cartons lot R-40', 'FG', 'Sealed', 'Grade A', 'CTN', 64, 'Replace', '')],
    },
    {
      number: 'SRR-OUT-2026-0045',
      title: 'Credit-note goods pickup dispatch',
      partner: 'Wholesale Hub',
      date: '2026-05-17',
      businessPartnerCode: 'BP-WHUB',
      businessPartnerName: 'Wholesale Hub',
      vehicleNo: 'RWP-6677',
      fromUnit: 'Returns processing',
      kantaSlip: 'KS-10618',
      department: 'Logistics',
      biltyNo: 'BL-78040',
      store: 'Returns dock',
      freight: '0',
      weightMachineName: 'Kanta-1',
      weight: '4.5',
      location: 'Head Office',
      referenceNo: '',
      remarks: 'Outbound movement linked to credit note CN-45.',
      lines: [line('RET-45', 'Returned FG pallet', 'Returns', 'Palletized', 'Hold', 'PLT', 3, 'CN-45', '')],
    },
  ],
  'Stand Alone Documents': [
    {
      number: 'STD-OUT-2026-0210',
      title: 'Inter-warehouse transfer',
      partner: 'Internal',
      date: '2026-05-14',
      businessPartnerCode: 'INT',
      businessPartnerName: 'Internal transfer',
      vehicleNo: 'INT-220',
      fromUnit: 'Warehouse A',
      kantaSlip: 'KS-10590',
      department: 'Logistics',
      biltyNo: '',
      store: 'General',
      freight: '0',
      weightMachineName: 'Kanta-1',
      weight: '6.0',
      location: 'FSD',
      referenceNo: '',
      remarks: 'Stand-alone transfer memo TM-210.',
      lines: [line('TRF-01', 'Mixed inventory pallet', 'Transfer', 'Palletized', 'N/A', 'PLT', 5, 'WH-A to WH-B', '')],
    },
    {
      number: 'STD-OUT-2026-0215',
      title: 'Asset relocation dispatch',
      partner: 'Facilities',
      date: '2026-05-19',
      businessPartnerCode: 'FAC',
      businessPartnerName: 'Facilities department',
      vehicleNo: 'INT-315',
      fromUnit: 'Plant 1',
      kantaSlip: 'KS-10660',
      department: 'Operations',
      biltyNo: '',
      store: 'Assets',
      freight: '350',
      weightMachineName: 'Kanta-2',
      weight: '1.2',
      location: 'PSH',
      referenceNo: '',
      remarks: 'Fixed asset move per memo FA-215.',
      lines: [line('AST-01', 'Industrial rack units', 'Assets', 'Crated', 'N/A', 'UNIT', 4, 'Tag FA-215', '')],
    },
  ],
};

const AGP_OPEN_BY_TYPE: Record<string, OpenBaseDocument[]> = {
  'Article Gate Pass': [
    {
      number: 'AGP-REF-2026-0101',
      title: 'IT equipment loan — Engineering',
      partner: 'Internal',
      date: '2026-05-18',
      businessPartnerCode: 'INT-ENG',
      businessPartnerName: 'Engineering department',
      vehicleNo: 'INT-401',
      department: 'Engineering',
      biltyNo: '',
      location: 'FSD',
      freight: '0',
      referenceNo: '',
      remarks: 'Laptops and test meters on temporary loan.',
      reasonForMovement: 'Project site commissioning',
      requestingEmployee: 'EMP-1042 — Ali Hassan',
      requestedBy: 'HOD Engineering',
      issuedTo: 'Engineering — Project Alpha',
      articleOutDate: '2026-05-18',
      articleReturnedDate: '2026-06-18',
      transporterName: 'Internal courier',
      transporterCnic: '35202-1234567-1',
      transporterPhone: '0300-1122334',
      lines: [
        line('IT-LP01', 'Laptop Dell Latitude 5540', 'IT Assets', 'Boxed', 'Working', 'EA', 3, 'SN batch A', 'Return by 18-Jun'),
        line('IT-MT02', 'Digital multimeter kit', 'IT Assets', 'Case', 'Calibrated', 'SET', 2, '', ''),
      ],
    },
    {
      number: 'AGP-REF-2026-0108',
      title: 'Maintenance tools to contractor',
      partner: 'ProMaint Services',
      date: '2026-05-19',
      businessPartnerCode: 'BP-PMS',
      businessPartnerName: 'ProMaint Services',
      vehicleNo: 'LHR-8820',
      department: 'Operations',
      biltyNo: 'BL-78105',
      location: 'PSH',
      freight: '500',
      referenceNo: '',
      remarks: 'Tools issued for annual shutdown maintenance.',
      reasonForMovement: 'Off-site maintenance contract',
      requestingEmployee: 'EMP-0877 — Sara Khan',
      requestedBy: 'Maintenance supervisor',
      issuedTo: 'ProMaint Services',
      articleOutDate: '2026-05-19',
      articleReturnedDate: '2026-05-25',
      transporterName: 'Ahmed Raza',
      transporterCnic: '42101-9876543-2',
      transporterPhone: '0321-4455667',
      lines: [
        line('TL-900', 'Torque wrench set', 'Tools', 'Case', 'Good', 'SET', 1, 'Calib due Aug', ''),
        line('TL-901', 'Hydraulic puller kit', 'Tools', 'Crate', 'Good', 'KIT', 1, '', 'Return mandatory'),
      ],
    },
    {
      number: 'AGP-REF-2026-0112',
      title: 'Marketing display units — exhibition',
      partner: 'Expo Events Ltd',
      date: '2026-05-20',
      businessPartnerCode: 'BP-EXPO',
      businessPartnerName: 'Expo Events Ltd',
      vehicleNo: 'KHI-4411',
      department: 'Marketing',
      biltyNo: 'BL-78125',
      location: 'Head Office',
      freight: '1800',
      referenceNo: '',
      remarks: 'Display articles for Textile Expo 2026.',
      reasonForMovement: 'Trade exhibition',
      requestingEmployee: 'EMP-1201 — Omar Farooq',
      requestedBy: 'Marketing manager',
      issuedTo: 'Expo Events Ltd — Hall B',
      articleOutDate: '2026-05-20',
      articleReturnedDate: '2026-05-28',
      transporterName: 'FastMove Logistics',
      transporterCnic: '35201-5554433-9',
      transporterPhone: '0333-7788990',
      lines: [
        line('DSP-01', 'Product display stand', 'Marketing', 'Crated', 'New', 'EA', 4, 'Branded', ''),
        line('DSP-02', 'Sample garment set', 'Marketing', 'Hanger rack', 'Grade A', 'SET', 12, 'Expo collection', ''),
      ],
    },
  ],
  'Purchase Order': [
    {
      number: 'PO-AGP-2026-0088',
      title: 'Capital goods — off-site verification',
      partner: 'TechVerify Labs',
      date: '2026-05-17',
      businessPartnerCode: 'BP-TVL',
      businessPartnerName: 'TechVerify Labs',
      vehicleNo: 'RWP-3300',
      department: 'Procurement',
      biltyNo: 'BL-78085',
      location: 'FSD',
      freight: '1200',
      referenceNo: '',
      remarks: 'Equipment sent for third-party calibration.',
      reasonForMovement: 'Vendor calibration service',
      requestingEmployee: 'EMP-0910 — Nadia Ali',
      requestedBy: 'Procurement officer',
      issuedTo: 'TechVerify Labs',
      articleOutDate: '2026-05-17',
      articleReturnedDate: '2026-05-24',
      transporterName: 'Secure Haulage',
      transporterCnic: '61101-3344556-7',
      transporterPhone: '0345-2211000',
      lines: [line('CAP-88', 'Precision measuring unit', 'Capital', 'Crated', 'New', 'EA', 1, 'PO line 1', 'Insured')],
    },
    {
      number: 'PO-AGP-2026-0092',
      title: 'Spare parts for off-site repair',
      partner: 'Spinning Solutions',
      date: '2026-05-18',
      businessPartnerCode: 'BP-SSOL',
      businessPartnerName: 'Spinning Solutions',
      vehicleNo: 'FSB-2299',
      department: 'Operations',
      biltyNo: 'BL-78100',
      location: 'PSH',
      freight: '750',
      referenceNo: '',
      remarks: 'Rotor assembly sent for OEM repair.',
      reasonForMovement: 'Warranty repair',
      requestingEmployee: 'EMP-0654 — Imran Shah',
      requestedBy: 'Plant manager',
      issuedTo: 'Spinning Solutions service centre',
      articleOutDate: '2026-05-18',
      articleReturnedDate: '2026-06-01',
      transporterName: 'Bilal Transport',
      transporterCnic: '35202-6677889-0',
      transporterPhone: '0312-9900112',
      lines: [
        line('SP-RTR', 'Rotor assembly RA-400', 'Spares', 'Crated', 'Faulty', 'EA', 1, 'Warranty tag', ''),
        line('SP-BRG', 'Bearing housing set', 'Spares', 'Boxed', 'Good', 'SET', 1, 'Accompanying', ''),
      ],
    },
  ],
  'Sales Return Request': [
    {
      number: 'SRR-AGP-2026-0020',
      title: 'Returned equipment from customer site',
      partner: 'Industrial Buyers Inc',
      date: '2026-05-16',
      businessPartnerCode: 'BP-IBI',
      businessPartnerName: 'Industrial Buyers Inc',
      vehicleNo: 'LHR-7700',
      department: 'Sales',
      biltyNo: 'BL-78015',
      location: 'FSD',
      freight: '0',
      referenceNo: '',
      remarks: 'Demo unit returned — article gate pass for QA intake.',
      reasonForMovement: 'Customer return — demo unit',
      requestingEmployee: 'EMP-1105 — Fatima Noor',
      requestedBy: 'Sales coordinator',
      issuedTo: 'QA department',
      articleOutDate: '2026-05-16',
      articleReturnedDate: '2026-05-16',
      transporterName: 'Customer pickup',
      transporterCnic: '35201-1122334-5',
      transporterPhone: '0301-5566778',
      lines: [line('DEMO-20', 'Demo loom control panel', 'Demo', 'Crated', 'Used', 'EA', 1, 'SRR-20', 'Inspect')],
    },
    {
      number: 'SRR-AGP-2026-0025',
      title: 'Loaner article recall from dealer',
      partner: 'Eastern Dealers Network',
      date: '2026-05-19',
      businessPartnerCode: 'BP-EDN',
      businessPartnerName: 'Eastern Dealers Network',
      vehicleNo: 'KHI-5522',
      department: 'Sales',
      biltyNo: 'BL-78115',
      location: 'Head Office',
      freight: '400',
      referenceNo: '',
      remarks: 'Recall of loaner display machine.',
      reasonForMovement: 'Loaner recall',
      requestingEmployee: 'EMP-1188 — Usman Tariq',
      requestedBy: 'Regional sales head',
      issuedTo: 'Central stores',
      articleOutDate: '2026-05-19',
      articleReturnedDate: '2026-05-19',
      transporterName: 'Dealer own vehicle',
      transporterCnic: '42101-9988776-3',
      transporterPhone: '0322-3344556',
      lines: [line('LN-025', 'Display machine DM-200', 'Loaner', 'Palletized', 'Working', 'EA', 1, 'Dealer recall', '')],
    },
  ],
  'Stand Alone Documents': [
    {
      number: 'STD-AGP-2026-0300',
      title: 'Internal article transfer memo',
      partner: 'Internal',
      date: '2026-05-15',
      businessPartnerCode: 'INT',
      businessPartnerName: 'Internal transfer',
      vehicleNo: 'INT-150',
      department: 'Supply Chain',
      biltyNo: '',
      location: 'FSD',
      freight: '0',
      referenceNo: '',
      remarks: 'Stand-alone article move per memo SCM-300.',
      reasonForMovement: 'Inter-department transfer',
      requestingEmployee: 'EMP-0501 — Hina Malik',
      requestedBy: 'Supply chain coordinator',
      issuedTo: 'Training centre',
      articleOutDate: '2026-05-15',
      articleReturnedDate: '2026-07-15',
      transporterName: 'Internal',
      transporterCnic: '35202-0001122-4',
      transporterPhone: '0300-0001122',
      lines: [
        line('TRN-01', 'Training loom miniature', 'Training', 'Crated', 'Good', 'EA', 1, 'Memo SCM-300', ''),
        line('TRN-02', 'Process sample boards', 'Training', 'Boxed', 'Good', 'SET', 6, '', ''),
      ],
    },
    {
      number: 'STD-AGP-2026-0305',
      title: 'Audit sample articles dispatch',
      partner: 'Internal audit',
      date: '2026-05-20',
      businessPartnerCode: 'INT-AUD',
      businessPartnerName: 'Internal audit team',
      vehicleNo: 'INT-505',
      department: 'Finance',
      biltyNo: '',
      location: 'PSH',
      freight: '0',
      referenceNo: '',
      remarks: 'Sample articles for external audit verification.',
      reasonForMovement: 'Audit verification',
      requestingEmployee: 'EMP-0333 — Kamran Javed',
      requestedBy: 'Chief internal auditor',
      issuedTo: 'External auditors — Lahore office',
      articleOutDate: '2026-05-20',
      articleReturnedDate: '2026-05-27',
      transporterName: 'Office courier',
      transporterCnic: '35201-4455667-8',
      transporterPhone: '0331-2233445',
      lines: [line('AUD-05', 'Sealed audit sample cartons', 'Audit', 'Sealed', 'Hold', 'CTN', 8, 'Audit ref 305', '')],
    },
  ],
};

const OPEN_BY_MODULE: Record<GatePassModule, Record<string, OpenBaseDocument[]>> = {
  igp: IGP_OPEN_BY_TYPE,
  ogp: OGP_OPEN_BY_TYPE,
  agp: AGP_OPEN_BY_TYPE,
};

const GET_PO_RECORDS_URL = apiUrl('get_po_records');
const SALES_RETURN_REQUESTS_URL = apiUrl('sales_return_requests');

@Injectable({ providedIn: 'root' })
export class OpenBaseDocumentsService {
  private readonly http = inject(HttpClient);

  /** Open (linkable) documents for the selected gate-pass module and document type. */
  listOpenByType(gatePassModule: GatePassModule, documentType: string): OpenBaseDocument[] {
    const key = documentType?.trim() || '';
    const list = OPEN_BY_MODULE[gatePassModule]?.[key];
    if (!list) return [];
    return cloneDocuments(list);
  }

  fetchPurchaseOrders(): Observable<OpenBaseDocument[]> {
    return this.http.get<unknown>(GET_PO_RECORDS_URL).pipe(
      timeout(30_000),
      map((response) =>
        this.extractApiItems(response).map((item) => this.mapApiRecordToOpenBaseDocument(item)),
      ),
      catchError(() => of([])),
    );
  }

  /** @deprecated Use fetchPurchaseOrders */
  fetchIgpPurchaseOrders(): Observable<OpenBaseDocument[]> {
    return this.fetchPurchaseOrders();
  }

  fetchSalesReturnRequests(): Observable<OpenBaseDocument[]> {
    return this.http.get<unknown>(SALES_RETURN_REQUESTS_URL).pipe(
      timeout(30_000),
      map((response) =>
        this.extractApiItems(response).map((item) => this.mapApiRecordToOpenBaseDocument(item)),
      ),
      catchError(() => of([])),
    );
  }

  /** @deprecated Use fetchSalesReturnRequests */
  fetchIgpSalesReturnRequests(): Observable<OpenBaseDocument[]> {
    return this.fetchSalesReturnRequests();
  }

  private extractApiItems(response: unknown): Array<Record<string, unknown>> {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }

    if (typeof response !== 'object') {
      return [];
    }

    const obj = response as Record<string, unknown>;
    const arrayKeys = [
      'data',
      'items',
      'results',
      'records',
      'list',
      'purchaseOrders',
      'purchase_orders',
      'poRecords',
      'po_records',
      'getPoRecords',
      'salesReturnRequests',
      'sales_return_requests',
    ];

    for (const key of arrayKeys) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
      if (value && typeof value === 'object') {
        const nestedItems = this.extractApiItems(value);
        if (nestedItems.length > 0) {
          return nestedItems;
        }
      }
    }

    const nestedData = obj['data'];
    if (nestedData && typeof nestedData === 'object') {
      const nestedItems = this.extractApiItems(nestedData);
      if (nestedItems.length > 0) {
        return nestedItems;
      }
    }

    if (
      obj['baseDocNo'] ||
      obj['base_doc_no'] ||
      obj['poNumber'] ||
      obj['po_number'] ||
      obj['srrNumber'] ||
      obj['srr_number'] ||
      obj['requestNo'] ||
      obj['request_no'] ||
      obj['salesReturnRequestNo'] ||
      obj['sales_return_request_no'] ||
      obj['number'] ||
      obj['docNum'] ||
      obj['DocNum'] ||
      obj['DocEntry']
    ) {
      return [obj];
    }

    return [];
  }

  private mapApiRecordToOpenBaseDocument(item: Record<string, unknown>): OpenBaseDocument {
    const sources = [item];
    const number = this.pickString(sources, [
      'baseDocNo',
      'base_doc_no',
      'poNumber',
      'po_number',
      'srrNumber',
      'srr_number',
      'requestNo',
      'request_no',
      'salesReturnRequestNo',
      'sales_return_request_no',
      'returnRequestNo',
      'return_request_no',
      'number',
      'docNum',
      'DocNum',
      'documentNo',
      'document_no',
    ]);
    const businessPartnerName = this.pickString(sources, [
      'businessPartnerName',
      'business_partner_name',
      'partner',
      'vendorName',
      'vendor_name',
      'CardName',
    ]);
    const title =
      this.pickString(sources, ['title', 'Title', 'description', 'Description', 'remarks', 'Remarks']) ||
      businessPartnerName ||
      number;

    return {
      number,
      title,
      partner: businessPartnerName,
      date: this.normalizeApiDate(
        this.pickString(sources, [
          'date',
          'documentDate',
          'document_date',
          'poDate',
          'po_date',
          'returnDate',
          'return_date',
          'DocDate',
        ]),
      ),
      businessPartnerCode: this.pickString(sources, [
        'businessPartnerCode',
        'business_partner_code',
        'vendorCode',
        'vendor_code',
        'CardCode',
      ]),
      businessPartnerName,
      vehicleNo: this.pickString(sources, ['vehicleNo', 'vehicle_no', 'VehicleNo', 'U_VehicleNo']),
      fromUnit: this.pickString(sources, ['fromUnit', 'from_unit', 'FromUnit', 'Branch']),
      kantaSlip: this.pickString(sources, ['kantaSlip', 'kanta_slip', 'KantaSlip']),
      department: this.pickString(sources, ['department', 'Department']),
      biltyNo: this.pickString(sources, ['biltyNo', 'bilty_no', 'BiltyNo', 'U_BuiltyNo']),
      store: this.pickString(sources, ['store', 'Store', 'warehouse', 'Warehouse']),
      freight: this.pickString(sources, ['freight', 'Freight', 'freightAmount', 'freight_amount']),
      weightMachineName: this.pickString(sources, ['weightMachineName', 'weight_machine_name', 'WeightMachineName']),
      weight: this.pickString(sources, ['weight', 'Weight']),
      location: this.pickString(sources, ['location', 'Location']),
      referenceNo: this.pickString(sources, ['referenceNo', 'reference_no', 'ReferenceNo', 'U_CusPoNo']),
      remarks: this.pickString(sources, ['remarks', 'Remarks']),
      transporterName: this.pickString(sources, ['transporterName', 'transporter_name', 'U_TransporterName']),
      lines: this.mapDocumentLines(item),
    };
  }

  private normalizeApiDate(value: string): string {
    if (!value) {
      return '';
    }
    const cleaned = value.replace(/\0/g, '').trim();
    const iso = cleaned.match(/^(\d{4}-\d{2}-\d{2})/);
    return iso ? iso[1] : cleaned.slice(0, 10);
  }

  private mapDocumentLines(item: Record<string, unknown>): BaseDocLinePayload[] | undefined {
    const rawLines = item['lines'] ?? item['Lines'] ?? item['items'] ?? item['lineItems'] ?? item['line_items'];
    if (!Array.isArray(rawLines)) {
      return undefined;
    }

    return rawLines
      .filter((line): line is Record<string, unknown> => !!line && typeof line === 'object')
      .map((line) => ({
        itemCode: this.pickString([line], ['itemCode', 'item_code', 'ItemCode', 'code', 'Code']),
        itemName: this.pickString([line], [
          'itemName',
          'item_name',
          'ItemName',
          'name',
          'Name',
          'description',
          'Description',
          'Dscription',
        ]),
        category: this.pickString([line], ['category', 'Category']),
        packingCondition: this.pickString([line], ['packingCondition', 'packing_condition', 'PackingCondition']),
        productQuality: this.pickString([line], ['productQuality', 'product_quality', 'ProductQuality']),
        uom: this.pickString([line], ['uom', 'UOM', 'Uom', 'unit']),
        qty: this.pickNumber([line], ['qty', 'quantity', 'Qty', 'Quantity']),
        info: this.pickString([line], ['info', 'Info']),
        remarks: this.pickString([line], ['remarks', 'Remarks']),
      }));
  }

  private pickString(sources: Array<Record<string, unknown>>, keys: string[]): string {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).replace(/\0/g, '').trim();
        }
      }
    }
    return '';
  }

  private pickNumber(sources: Array<Record<string, unknown>>, keys: string[]): number {
    const text = this.pickString(sources, keys);
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
