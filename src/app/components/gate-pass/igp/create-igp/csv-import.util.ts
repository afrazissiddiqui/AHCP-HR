import { createEmptyIgpLineItem, type IgpLineItem } from '../igp.service';

export interface ParsedIgpCsvLine extends Pick<IgpLineItem, 'itemCode' | 'itemName' | 'category' | 'packingCondition' | 'productQuality' | 'uom' | 'qty' | 'info' | 'remarks'> {
  serialNumbers?: string;
}

export interface ParsedIgpCsvData {
  type?: string;
  baseDocNo?: string;
  poNumber?: string;
  businessPartnerName?: string;
  businessPartnerCode?: string;
  department?: string;
  vehicleNo?: string;
  location?: string;
  fromUnit?: string;
  kantaSlip?: string;
  biltyNo?: string;
  store?: string;
  driverName?: string;
  driverCnic?: string;
  driverPhone?: string;
  weight?: string;
  lines: ParsedIgpCsvLine[];
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseIgpBulkUploadCsv(csvContent: string): ParsedIgpCsvData {
  const rawRows = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const cleanedRows = rawRows.filter((line) => {
    const normalized = normalizeHeader(line).replace(/\s+/g, '');
    return !['headerinformation', 'lineitems', 'lineitem'].includes(normalized);
  });

  if (cleanedRows.length === 0) {
    return { lines: [] };
  }

  const parsedRows = cleanedRows.map((row) => parseCsvLine(row));
  const itemHeaderIndex = parsedRows.findIndex((row) => {
    const headers = row.map((header) => normalizeHeader(header));
    return headers.some((header) => ['itemcode', 'code', 'itemid'].includes(header));
  });

  if (itemHeaderIndex < 0) {
    return { lines: [] };
  }

  const itemHeaders = parsedRows[itemHeaderIndex].map((header) => normalizeHeader(header));
  const metadataRows = parsedRows.slice(0, itemHeaderIndex);
  const dataRows = parsedRows.slice(itemHeaderIndex + 1);

  const headerFields = new Map<string, string>();

  if (metadataRows.length > 0) {
    const metadataHeader = metadataRows[0].map((value) => normalizeHeader(value));
    const headerNameIndex = metadataHeader.findIndex((name) => ['type', 'businesspartnername', 'department', 'vehicleno', 'vehicle'].includes(name));

    if (headerNameIndex >= 0 && metadataRows.length >= 2) {
      const metaValueRow = metadataRows[1];
      metadataHeader.forEach((name, index) => {
        const value = metaValueRow[index] ?? '';
        if (!value) {
          return;
        }

        const destination = new Map<string, string>([
          ['type', 'type'],
          ['businesspartner', 'businesspartnername'],
          ['businesspartnername', 'businesspartnername'],
          ['businesspartnercode', 'businesspartnercode'],
          ['businesspartnerid', 'businesspartnercode'],
          ['department', 'department'],
          ['vehicleno', 'vehicleno'],
          ['vehicle', 'vehicleno'],
          ['location', 'location'],
          ['branch', 'location'],
          ['fromunit', 'fromunit'],
          ['from', 'fromunit'],
          ['kantaslip', 'kantaslip'],
          ['kanta', 'kantaslip'],
          ['biltyno', 'biltyno'],
          ['biltynumber', 'biltyno'],
          ['warehouse', 'store'],
          ['store', 'store'],
          ['drivername', 'drivername'],
          ['driver', 'drivername'],
          ['drivercnic', 'drivercnic'],
          ['cnic', 'drivercnic'],
          ['driverphone', 'driverphone'],
          ['phone', 'driverphone'],
          ['driverphonenumber', 'driverphone'],
          ['weight', 'weight'],
          ['baseDocNo', 'baseDocNo'],
          ['basedocno', 'baseDocNo'],
          ['baseDoc', 'baseDocNo'],
          ['baseDocument', 'baseDocNo'],
          ['poNumber', 'poNumber'],
          ['ponumber', 'poNumber'],
          ['poNo', 'poNumber'],
          ['pono', 'poNumber'],
          ['purchaseorderno', 'poNumber'],
        ]);

        const mapped = destination.get(name);
        if (mapped) {
          headerFields.set(mapped, value.trim());
        }
      });
    }
  }

  const parsedLines = dataRows
    .filter((values) => values.some((value) => value.length > 0))
    .map((values) => {
      const row: Record<string, string> = {};
      itemHeaders.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      const parsedQty = Number.parseFloat(String(row['qty'] ?? '').replace(/[^0-9.-]/g, ''));

      const resolveValue = (...keys: string[]): string => {
        for (const key of keys) {
          const value = row[key];
          if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
          }
        }
        return '';
      };

      return {
        itemCode: resolveValue('itemcode', 'code', 'itemcode1', 'itemid'),
        itemName: resolveValue('itemname', 'name', 'item', 'description'),
        category: resolveValue('category', 'itemcategory'),
        packingCondition: resolveValue('packingcondition', 'packing', 'pack', 'packcondition'),
        productQuality: resolveValue('productquality', 'quality', 'prodquality'),
        uom: resolveValue('uom', 'unit', 'unitofmeasure'),
        qty: Number.isFinite(parsedQty) ? parsedQty : 0,
        info: resolveValue('info', 'details', 'notes'),
        remarks: resolveValue('remarks', 'comment', 'comments', 'remark'),
        serialNumbers: resolveValue('serialnumber', 'batch', 'batchnumber', 'serialno'),
      } satisfies ParsedIgpCsvLine;
    });

  return {
    type: headerFields.get('type') || '',
    baseDocNo: headerFields.get('baseDocNo') || '',
    poNumber: headerFields.get('poNumber') || '',
    businessPartnerName: headerFields.get('businesspartnername') || '',
    businessPartnerCode: headerFields.get('businesspartnercode') || '',
    department: headerFields.get('department') || '',
    vehicleNo: headerFields.get('vehicleno') || '',
    location: headerFields.get('location') || '',
    fromUnit: headerFields.get('fromunit') || '',
    kantaSlip: headerFields.get('kantaslip') || '',
    biltyNo: headerFields.get('biltyno') || '',
    store: headerFields.get('store') || '',
    driverName: headerFields.get('drivername') || '',
    driverCnic: headerFields.get('drivercnic') || '',
    driverPhone: headerFields.get('driverphone') || '',
    weight: headerFields.get('weight') || '',
    lines: parsedLines,
  };
}

