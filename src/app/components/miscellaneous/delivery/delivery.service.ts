import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../../../config/api.config';
import { DeliveryHeader, DeliveryLine } from './delivery.model';

export interface CreateDeliveryBatchPayload {
  batchNumber: string;
  quantity: number;
}

export interface CreateDeliveryItemPayload {
  baseEntry: number;
  baseLine: number;
  itemCode: string;
  warehouse: string;
  quantity: number;
  batches: CreateDeliveryBatchPayload[];
}

export interface CreateDeliveryPayload {
  cardCode: string;
  branch: number;
  docDate: string;
  taxDate: string;
  docDueDate: string;
  remarks: string;
  items: CreateDeliveryItemPayload[];
}

export interface CreateDeliveryResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  error?: string;
  docEntry?: string | number;
  data?: Record<string, unknown>;
}

export interface DeliveryListLineItem {
  lineNum: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  warehouse: string;
  lineTotal: number;
  batchNumber: string;
}

export interface DeliveryListItem {
  docEntry: string;
  docNum: string;
  docDate: string;
  docDueDate: string;
  cardCode: string;
  cardName: string;
  shipToAddress: string;
  customerPoNo: string;
  driverName: string;
  vehicleNo: string;
  transporterName: string;
  branch: string;
  seriesName: string;
  status: string;
  itemCount: number;
  items: DeliveryListLineItem[];
}

export function buildCreateDeliveryPayload(
  header: DeliveryHeader,
  lines: DeliveryLine[],
): CreateDeliveryPayload {
  const baseDocEntry = Number.parseInt(header.baseSalesOrderDocEntry.trim(), 10);
  const branch = Number.parseInt(header.branchId.trim(), 10);

  return {
    cardCode: header.customer.trim(),
    branch: Number.isFinite(branch) ? branch : 0,
    docDate: header.documentDate.trim(),
    taxDate: header.postingDate.trim(),
    docDueDate: header.documentDate.trim(),
    remarks: header.remarks.trim(),
    items: lines
      .filter((line) => line.itemCode.trim())
      .map((line) => {
        const lineBaseDocEntry = Number.parseInt(line.baseDocEntry.trim(), 10);
        const baseLine = Number.parseInt(line.baseLine.trim(), 10);
        const resolvedBaseEntry = Number.isFinite(lineBaseDocEntry)
          ? lineBaseDocEntry
          : Number.isFinite(baseDocEntry)
            ? baseDocEntry
            : 0;
        const resolvedBaseLine = Number.isFinite(baseLine) ? baseLine : 0;

        return {
          baseEntry: resolvedBaseEntry,
          baseLine: resolvedBaseLine,
          itemCode: line.itemCode.trim(),
          warehouse: line.warehouse.trim(),
          quantity: line.quantity ?? 0,
          batches: line.batchSerialNumber.trim()
            ? [
                {
                  batchNumber: line.batchSerialNumber.trim(),
                  quantity: line.quantity ?? 0,
                },
              ]
            : [],
        };
      }),
  };
}

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly http = inject(HttpClient);

  list(): Observable<DeliveryListItem[]> {
    return this.http.get<unknown>(apiUrl('delivery')).pipe(
      map((response) => this.parseDeliveries(response)),
    );
  }

  create(payload: CreateDeliveryPayload): Observable<CreateDeliveryResponse> {
    return this.http.post<CreateDeliveryResponse>(apiUrl('createDelivery'), payload);
  }

  private parseDeliveries(response: unknown): DeliveryListItem[] {
    const data = this.extractDataArray(response, ['delivery', 'deliveries']);
    return data
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => {
        const lines = this.pickArray(item, ['items', 'lines', 'DocumentLines'])
          .filter((line): line is Record<string, unknown> => !!line && typeof line === 'object')
          .map((line) => {
            const batches = this.pickArray(line, ['batches']);
            const firstBatch =
              batches.find((batch): batch is Record<string, unknown> => !!batch && typeof batch === 'object') ??
              null;

            return {
              lineNum: this.pickString(line, ['LineNum', 'lineNum']),
              itemCode: this.pickString(line, ['ItemCode', 'itemCode']),
              itemDescription: this.pickString(line, ['Dscription', 'itemDescription', 'description']),
              quantity: this.pickNumber(line, ['Quantity', 'quantity']),
              unitPrice: this.pickNumber(line, ['Price', 'unitPrice', 'price']),
              warehouse: this.pickString(line, ['WhsCode', 'warehouse', 'warehouseCode']),
              lineTotal: this.pickNumber(line, ['LineTotal', 'lineTotal']),
              batchNumber: firstBatch
                ? this.pickString(firstBatch, ['batchNumber', 'BatchNum', 'batch_number'])
                : '',
            };
          });

        return {
          docEntry: this.pickString(item, ['DocEntry', 'docEntry']),
          docNum: this.pickString(item, ['DocNum', 'docNum', 'deliveryNo']),
          docDate: this.pickDate(item, ['DocDate', 'docDate']),
          docDueDate: this.pickDate(item, ['DocDueDate', 'docDueDate']),
          cardCode: this.pickString(item, ['CardCode', 'cardCode']),
          cardName: this.pickString(item, ['CardName', 'cardName', 'customerName']),
          shipToAddress: this.pickString(item, ['Address', 'ShipToAddress', 'shipToAddress']),
          customerPoNo: this.pickString(item, ['U_CusPoNo', 'customerPoNo']),
          driverName: this.pickString(item, ['U_DriverName', 'driverName']),
          vehicleNo: this.pickString(item, ['U_VehicleNo', 'vehicleNo']),
          transporterName: this.pickString(item, ['U_TransporterName', 'transporterName']),
          branch: this.pickString(item, ['BPLName', 'Branch', 'branch', 'BPLId']),
          seriesName: this.pickString(item, ['SeriesName', 'seriesName', 'Series']),
          status: this.pickString(item, ['DocStatus', 'status']) || 'O',
          itemCount: lines.length,
          items: lines,
        };
      });
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = source[key];
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  private extractDataArray(response: unknown, wrapperKeys: string[]): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (!response || typeof response !== 'object') {
      return [];
    }

    const root = response as Record<string, unknown>;
    for (const key of wrapperKeys) {
      const wrapper = root[key];
      if (Array.isArray(wrapper)) {
        return wrapper;
      }
      if (wrapper && typeof wrapper === 'object') {
        const wrappedData = (wrapper as Record<string, unknown>)['data'];
        if (Array.isArray(wrappedData)) {
          return wrappedData;
        }
      }
    }

    if (Array.isArray(root['data'])) {
      return root['data'] as unknown[];
    }

    return [];
  }

  private pickArray(source: Record<string, unknown>, keys: string[]): unknown[] {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
    return [];
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  }

  private pickDate(source: Record<string, unknown>, keys: string[]): string {
    const raw = this.pickString(source, keys);
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }
}
