import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../../../config/api.config';
import { InventoryTransferHeader, InventoryTransferLine } from './inventory-transfer.model';

export interface InventoryTransferRequestLine {
  docEntry: string;
  lineNum: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  fromWarehouse: string;
  toWarehouse: string;
  batchNumber: string;
}

export interface InventoryTransferRequestRecord {
  docEntry: string;
  docNum: string;
  docDate: string;
  taxDate: string;
  docDueDate: string;
  docStatus: string;
  fromWarehouse: string;
  toWarehouse: string;
  items: InventoryTransferRequestLine[];
}

export interface CreateInventoryTransferBatchPayload {
  batch_number: string;
  quantity: string;
}

export interface CreateInventoryTransferItemPayload {
  baseEntry?: string | number;
  baseLine?: string | number;
  item_code: string;
  quantity: string;
  FromWhsCod: string;
  ToWhsCode: string;
  batches: CreateInventoryTransferBatchPayload[];
}

export interface CreateInventoryTransferPayload {
  DocDate: string;
  TaxDate: string;
  from_warehouse: string;
  to_warehouse: string;
  Remarks: string;
  items: CreateInventoryTransferItemPayload[];
}

export interface CreateInventoryTransferResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  error?: string;
  docEntry?: string | number;
  data?: Record<string, unknown>;
}

export interface InventoryTransferListLineItem {
  lineNum: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  fromWarehouse: string;
  toWarehouse: string;
  lineTotal: number;
  batchNumber: string;
}

export interface InventoryTransferListItem {
  docEntry: string;
  docNum: string;
  docDate: string;
  taxDate: string;
  fromWarehouse: string;
  toWarehouse: string;
  remarks: string;
  status: string;
  seriesName: string;
  branch: string;
  items: InventoryTransferListLineItem[];
  itemCount: number;
}

export function buildCreateInventoryTransferPayload(
  header: InventoryTransferHeader,
  lines: InventoryTransferLine[],
): CreateInventoryTransferPayload {
  const fromWarehouse = header.fromWarehouse.trim();
  const toWarehouse = header.toWarehouse.trim();

  return {
    DocDate: header.docDate.trim(),
    TaxDate: header.taxDate.trim(),
    from_warehouse: fromWarehouse,
    to_warehouse: toWarehouse,
    Remarks: header.remarks.trim(),
    items: lines
      .filter((line) => line.itemCode.trim())
      .map((line) => {
        const quantity = String(line.quantity ?? 0);
        const batchNumber = line.batchNumber.trim();
        const lineFromWarehouse = line.fromWarehouse.trim() || fromWarehouse;
        const lineToWarehouse = line.toWarehouse.trim() || toWarehouse;

        return {
          baseEntry: line.baseEntry?.trim() || undefined,
          baseLine: line.baseLine?.trim() || undefined,
          item_code: line.itemCode.trim(),
          quantity,
          FromWhsCod: lineFromWarehouse,
          ToWhsCode: lineToWarehouse,
          batches: batchNumber
            ? [
                {
                  batch_number: batchNumber,
                  quantity,
                },
              ]
            : [],
        };
      }),
  };
}

@Injectable({ providedIn: 'root' })
export class InventoryTransferService {
  private readonly http = inject(HttpClient);

  list(): Observable<InventoryTransferListItem[]> {
    return this.http.get<unknown>(apiUrl('inventory_transfer')).pipe(
      map((response) => this.parseInventoryTransfers(response)),
    );
  }

  listRequests(): Observable<InventoryTransferRequestRecord[]> {
    return this.http.get<unknown>(apiUrl('inventory_transfer_request')).pipe(
      map((response) => this.parseInventoryTransferRequests(response)),
    );
  }

  create(payload: CreateInventoryTransferPayload): Observable<CreateInventoryTransferResponse> {
    return this.http.post<CreateInventoryTransferResponse>(apiUrl('it_submit_in_sap'), payload);
  }

  private parseInventoryTransferRequests(response: unknown): InventoryTransferRequestRecord[] {
    const data = this.extractDataArray(response, ['inventory_transfer_request', 'data']);

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
              docEntry: this.pickString(line, ['DocEntry', 'docEntry']),
              lineNum: this.pickString(line, ['LineNum', 'lineNum']),
              itemCode: this.pickString(line, ['ItemCode', 'itemCode']),
              itemDescription: this.pickString(line, ['Dscription', 'itemDescription', 'description']),
              quantity: this.pickNumber(line, ['Quantity', 'quantity']),
              fromWarehouse: this.pickString(line, ['FromWhsCod', 'from_warehouse', 'fromWarehouse']),
              toWarehouse: this.pickString(line, ['WhsCode', 'ToWhsCode', 'to_warehouse', 'toWarehouse']),
              batchNumber: firstBatch
                ? this.pickString(firstBatch, ['batchNumber', 'BatchNum', 'batch_number'])
                : '',
            };
          });

        const firstLine = lines[0] ?? null;
        return {
          docEntry: this.pickString(item, ['DocEntry', 'docEntry']),
          docNum: this.pickString(item, ['DocNum', 'docNum']),
          docDate: this.pickDate(item, ['DocDate', 'docDate']),
          taxDate: this.pickDate(item, ['TaxDate', 'taxDate', 'DocDate', 'docDate']),
          docDueDate: this.pickDate(item, ['DocDueDate', 'docDueDate']),
          docStatus: this.pickString(item, ['DocStatus', 'docStatus']),
          fromWarehouse:
            this.pickString(item, ['FromWhsCod', 'from_warehouse', 'fromWarehouse']) ||
            firstLine?.fromWarehouse ||
            '',
          toWarehouse:
            this.pickString(item, ['WhsCode', 'ToWhsCode', 'to_warehouse', 'toWarehouse']) ||
            firstLine?.toWarehouse ||
            '',
          items: lines,
        };
      });
  }

  private parseInventoryTransfers(response: unknown): InventoryTransferListItem[] {
    const data = this.extractDataArray(response, [
      'inventory_transfer',
      'inventory_transfers',
      'delivery',
      'data',
    ]);

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
              fromWarehouse: this.pickString(line, ['FromWhsCod', 'from_warehouse', 'fromWarehouse']),
              toWarehouse: this.pickString(line, ['ToWhsCode', 'WhsCode', 'to_warehouse', 'toWarehouse']),
              lineTotal: this.pickNumber(line, ['LineTotal', 'lineTotal']),
              batchNumber: firstBatch
                ? this.pickString(firstBatch, ['batchNumber', 'BatchNum', 'batch_number'])
                : '',
            };
          });

        const firstLine = lines[0] ?? null;
        return {
          docEntry: this.pickString(item, ['DocEntry', 'docEntry']),
          docNum: this.pickString(item, ['DocNum', 'docNum', 'transferNo']),
          docDate: this.pickDate(item, ['DocDate', 'docDate']),
          taxDate: this.pickDate(item, ['TaxDate', 'taxDate', 'DocDueDate']),
          fromWarehouse:
            this.pickString(item, ['FromWhsCod', 'from_warehouse', 'fromWarehouse', 'Filler']) ||
            firstLine?.fromWarehouse ||
            '',
          toWarehouse:
            this.pickString(item, ['ToWhsCode', 'to_warehouse', 'toWarehouse', 'WhsCode']) ||
            firstLine?.toWarehouse ||
            '',
          remarks: this.pickString(item, ['Comments', 'Remarks', 'remarks']),
          status: this.pickString(item, ['DocStatus', 'status']) || 'O',
          seriesName: this.pickString(item, ['SeriesName', 'seriesName', 'Series']),
          branch: this.pickString(item, ['BPLName', 'Branch', 'branch', 'BPLId']),
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
        const wrapped = wrapper as Record<string, unknown>;
        if (Array.isArray(wrapped['data'])) {
          return wrapped['data'] as unknown[];
        }
      }
    }

    for (const value of Object.values(root)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = (value as Record<string, unknown>)['data'];
        if (Array.isArray(nested)) {
          return nested;
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

  private pickDate(source: Record<string, unknown>, keys: string[]): string {
    const raw = this.pickString(source, keys);
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }
}
