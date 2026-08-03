import { createEmptyIgpLineItem, type IgpLineItem } from '../igp.service';

export interface ParsedIgpCsvLine extends Pick<IgpLineItem, 'itemCode' | 'itemName' | 'category' | 'packingCondition' | 'productQuality' | 'uom' | 'qty' | 'info' | 'remarks'> {
  serialNumbers?: string;
}

export interface ParsedIgpCsvData {
  type?: string;
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
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { lines: [] };
  }

  const [headerLine, ...dataLines] = lines;
  const headers = parseCsvLine(headerLine).map((header) => normalizeHeader(header));

  const extractHeaderValue = (values: string[], headerName: string): string => {
    const index = headers.indexOf(headerName);
    return index >= 0 ? (values[index] ?? '').trim() : '';
  };

  const headerFields = new Map<string, string>();
  let headerRowsConsumed = 0;

  // First, check if initial rows contain header-level data (not line items)
  for (const line of dataLines) {
    const values = parseCsvLine(line);
    if (values.some((v) => v.length > 0)) {
      // Check if this row has header fields but no item code
      const hasHeaderFields = ['type', 'businesspartnername', 'department', 'vehicleno', 'location'].some(
        (h) => extractHeaderValue(values, h).length > 0,
      );
      const hasItemCode = extractHeaderValue(values, 'itemcode').length > 0;

      if (hasHeaderFields && !hasItemCode) {
        // This is a header row, extract header values
        headerFields.set('type', extractHeaderValue(values, 'type'));
        headerFields.set('businesspartnername', extractHeaderValue(values, 'businesspartnername'));
        headerFields.set('businesspartnercode', extractHeaderValue(values, 'businesspartnercode'));
        headerFields.set('department', extractHeaderValue(values, 'department'));
        headerFields.set('vehicleno', extractHeaderValue(values, 'vehicleno'));
        headerFields.set('location', extractHeaderValue(values, 'location'));
        headerFields.set('fromunit', extractHeaderValue(values, 'fromunit'));
        headerFields.set('kantaslip', extractHeaderValue(values, 'kantaslip'));
        headerFields.set('biltyno', extractHeaderValue(values, 'biltyno'));
        headerFields.set('store', extractHeaderValue(values, 'store'));
        headerFields.set('drivername', extractHeaderValue(values, 'drivername'));
        headerFields.set('drivercnic', extractHeaderValue(values, 'drivercnic'));
        headerFields.set('driverphone', extractHeaderValue(values, 'driverphone'));
        headerFields.set('weight', extractHeaderValue(values, 'weight'));
        headerRowsConsumed += 1;
      } else {
        // Found first line item row
        break;
      }
    }
  }

  const parsedLines = dataLines
    .slice(headerRowsConsumed)
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCsvLine(line))
    .filter((values) => values.some((value) => value.length > 0))
    .map((values) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
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
    type: headerFields.get('type'),
    businessPartnerName: headerFields.get('businesspartnername'),
    businessPartnerCode: headerFields.get('businesspartnercode'),
    department: headerFields.get('department'),
    vehicleNo: headerFields.get('vehicleno'),
    location: headerFields.get('location'),
    fromUnit: headerFields.get('fromunit'),
    kantaSlip: headerFields.get('kantaslip'),
    biltyNo: headerFields.get('biltyno'),
    store: headerFields.get('store'),
    driverName: headerFields.get('drivername'),
    driverCnic: headerFields.get('drivercnic'),
    driverPhone: headerFields.get('driverphone'),
    weight: headerFields.get('weight'),
    lines: parsedLines,
  };
}

