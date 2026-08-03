import { createEmptyIgpLineItem, type IgpLineItem } from '../igp.service';

export interface ParsedIgpCsvLine extends Pick<IgpLineItem, 'itemCode' | 'itemName' | 'category' | 'packingCondition' | 'productQuality' | 'uom' | 'qty' | 'info' | 'remarks'> {
  serialNumbers?: string;
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

export function parseIgpBulkUploadCsv(csvContent: string): ParsedIgpCsvLine[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const [headerLine, ...dataLines] = lines;
  const headers = parseCsvLine(headerLine).map((header) => normalizeHeader(header));

  return dataLines
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
}
