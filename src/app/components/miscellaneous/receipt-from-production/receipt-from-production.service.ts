import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../../../config/api.config';
import {
  ReceiptFromProductionHeader,
  ReceiptFromProductionLine,
} from './receipt-from-production.model';

export interface CreateReceiptFromProductionPayload {
  docEntry: number;
  docDate: string;
  taxDate: string;
  docDueDate: string;
  remarks: string;
  warehouse: string;
  quantity: number;
  batchNumber: string;
  manufacturingDate: string;
  branch: string;
  expiryDate: string;
}

export interface CreateReceiptFromProductionResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  error?: string;
  error_code?: string | number;
  docEntry?: string | number;
  data?: Record<string, unknown>;
}

export interface ProductionOrderRecord {
  docEntry: string;
  docNum: string;
  itemCode: string;
  itemDescription: string;
  plannedQty: number;
  completedQty: number;
  receiptQty: number;
  postDate: string;
  dueDate: string;
  startDate: string;
  status: string;
  warehouse: string;
  batchNumber: string;
}

export interface ReceiptFromProductionListLineItem {
  lineNum: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  warehouse: string;
  lineTotal: number;
  batchNumber: string;
  itemColor: string;
}

export interface ReceiptFromProductionListItem {
  docEntry: string;
  docNum: string;
  docDate: string;
  docDueDate: string;
  seriesName: string;
  branch: string;
  warehouse: string;
  remarks: string;
  status: string;
  customerCode: string;
  customerName: string;
  driverName: string;
  vehicleNo: string;
  transporterName: string;
  shift: string;
  machineName: string;
  items: ReceiptFromProductionListLineItem[];
  itemCount: number;
}

export function buildCreateReceiptFromProductionPayload(
  header: ReceiptFromProductionHeader,
  lines: ReceiptFromProductionLine[],
): CreateReceiptFromProductionPayload {
  const validLines = lines.filter((line) => line.itemCode.trim());
  const line = validLines[0];
  const baseDocEntry = header.baseProductionOrderDocEntry?.trim();
  const docEntry = Number.parseInt(baseDocEntry || line?.baseEntry?.trim() || '', 10);

  return {
    docEntry: Number.isFinite(docEntry) ? docEntry : 0,
    docDate: header.documentDate.trim(),
    taxDate: header.postingDate.trim(),
    docDueDate: header.dueDate.trim(),
    remarks: header.remarks.trim(),
    warehouse: line?.warehouse.trim() ?? '',
    quantity: line?.quantity ?? 0,
    batchNumber: line?.batchNumber.trim() ?? '',
    manufacturingDate: line?.manufacturingDate.trim() ?? '',
    branch: header.branchId.trim(),
    expiryDate: line?.expiryDate.trim() ?? '',
  };
}

@Injectable({ providedIn: 'root' })
export class ReceiptFromProductionService {
  private readonly http = inject(HttpClient);

  list(): Observable<ReceiptFromProductionListItem[]> {
    return this.http.get<unknown>(apiUrl('receipt_from_production')).pipe(
      map((response) =>
        this.parseReceipts(response, [
          'data',
          'receipt_from_production',
          'receipts_from_production',
        ]),
      ),
    );
  }

  listProductionOrders(): Observable<ProductionOrderRecord[]> {
    return this.http.get<unknown>(apiUrl('production_orders')).pipe(
      map((response) => this.parseProductionOrders(response)),
    );
  }

  create(
    payload: CreateReceiptFromProductionPayload,
  ): Observable<CreateReceiptFromProductionResponse> {
    return this.http.post<CreateReceiptFromProductionResponse>(
      apiUrl('createReceiptFromProduction'),
      payload,
    );
  }

  private parseProductionOrders(response: unknown): ProductionOrderRecord[] {
    const data = this.extractDataArray(response, ['production_orders', 'production_order', 'data']);

    return data
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => {
        const plannedQty = this.pickNumber(item, ['PlannedQty', 'plannedQty']);
        const completedQty = this.pickNumber(item, ['CmpltQty', 'completedQty']);
        const receiptQty = this.pickNumber(item, ['qty', 'receiptQty', 'Quantity', 'quantity']);
        const remainingQty = Math.max(plannedQty - completedQty, 0);

        return {
          docEntry: this.pickString(item, ['DocEntry', 'docEntry']),
          docNum: this.pickString(item, ['DocNum', 'docNum']),
          itemCode: this.pickString(item, ['ItemCode', 'itemCode']),
          itemDescription: this.pickString(item, ['ProdName', 'itemDescription', 'Dscription']),
          plannedQty,
          completedQty,
          receiptQty: receiptQty > 0 ? receiptQty : remainingQty,
          postDate: this.pickDate(item, ['PostDate', 'docDate', 'DocDate']),
          dueDate: this.pickDate(item, ['DueDate', 'docDueDate', 'DocDueDate']),
          startDate: this.pickDate(item, ['StartDate', 'startDate']),
          status: this.pickString(item, ['Status', 'status']),
          warehouse: this.pickString(item, ['Warehouse', 'warehouse', 'WhsCode']),
          batchNumber: this.pickProductionOrderBatchNumber(item),
        };
      });
  }

  private pickProductionOrderBatchNumber(item: Record<string, unknown>): string {
    const batches = this.pickArray(item, ['batches', 'Batches']);
    const firstBatch =
      batches.find(
        (batch): batch is Record<string, unknown> =>
          !!batch && typeof batch === 'object' && !Array.isArray(batch),
      ) ?? null;

    if (firstBatch) {
      return this.pickString(firstBatch, ['BatchNum', 'batchNum', 'batchNumber', 'batch_number']);
    }

    return this.pickString(item, ['BatchNum', 'batchNum', 'batchNumber', 'batch_number']);
  }

  private parseReceipts(
    response: unknown,
    wrapperKeys: string[],
  ): ReceiptFromProductionListItem[] {
    const data = this.extractDataArray(response, wrapperKeys);
    return data
      .filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === 'object' && !Array.isArray(item),
      )
      .map((item) => {
        const lines = this.pickArray(item, ['items', 'lines', 'DocumentLines'])
          .filter(
            (line): line is Record<string, unknown> =>
              !!line && typeof line === 'object' && !Array.isArray(line),
          )
          .map((line) => {
            const batches = this.pickArray(line, ['batches']);
            const firstBatch =
              batches.find(
                (batch): batch is Record<string, unknown> =>
                  !!batch && typeof batch === 'object' && !Array.isArray(batch),
              ) ?? null;

            return {
              lineNum: this.pickString(line, ['LineNum', 'lineNum']),
              itemCode: this.pickString(line, ['ItemCode', 'itemCode']),
              itemDescription: this.pickString(line, [
                'Dscription',
                'itemDescription',
                'description',
              ]),
              quantity: this.pickNumber(line, ['Quantity', 'quantity']),
              unitPrice: this.pickNumber(line, ['Price', 'unitPrice', 'price']),
              warehouse: this.pickString(line, ['WhsCode', 'warehouse']),
              lineTotal: this.pickNumber(line, ['LineTotal', 'lineTotal']),
              batchNumber: firstBatch
                ? this.pickString(firstBatch, ['BatchNum', 'batchNumber', 'batch_number'])
                : this.pickString(line, ['SerialNum', 'batchNumber', 'BatchNum']),
              itemColor: this.pickString(line, ['U_ItemColor', 'itemColor', 'Colour', 'Color']),
            };
          });

        const firstLine = lines[0] ?? null;
        return {
          docEntry: this.pickString(item, ['DocEntry', 'docEntry']),
          docNum: this.pickString(item, ['DocNum', 'docNum']),
          docDate: this.pickDate(item, ['DocDate', 'docDate']),
          docDueDate: this.pickDate(item, ['DocDueDate', 'docDueDate']),
          seriesName: this.pickString(item, ['SeriesName', 'seriesName', 'Series']),
          branch: this.pickString(item, ['BPLName', 'branchName', 'Branch', 'branch', 'BPLId']),
          warehouse:
            this.pickString(item, ['WhsCode', 'warehouse', 'Filler']) || firstLine?.warehouse || '',
          remarks: this.pickString(item, ['Comments', 'Remarks', 'remarks']),
          status: this.pickString(item, ['DocStatus', 'status']) || 'O',
          customerCode: this.pickString(item, ['CardCode', 'cardCode']),
          customerName: this.pickString(item, ['CardName', 'cardName']),
          driverName: this.pickString(item, ['U_DriverName', 'driverName']),
          vehicleNo: this.pickString(item, ['U_VehicleNo', 'vehicleNo']),
          transporterName: this.pickString(item, ['U_TransporterName', 'transporterName']),
          shift: this.pickString(item, ['U_Shift', 'Shift', 'shift']),
          machineName: this.pickString(item, ['U_MAC_Name', 'U_Machine', 'machineName', 'Machine']),
          items: lines,
          itemCount: lines.length,
        };
      });
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
        const nested = wrapper as Record<string, unknown>;
        if (Array.isArray(nested['data'])) {
          return nested['data'] as unknown[];
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

  private cleanSapText(value: unknown): string {
    return String(value ?? '')
      .replace(/\u0000/g, '')
      .trim();
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (value === undefined || value === null) {
        continue;
      }
      const text = this.cleanSapText(value);
      if (text !== '') {
        return text;
      }
    }
    return '';
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = source[key];
      const parsed = Number(this.cleanSapText(value));
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  private pickDate(source: Record<string, unknown>, keys: string[]): string {
    const raw = this.pickString(source, keys);
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }
}
