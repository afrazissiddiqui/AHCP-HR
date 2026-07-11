import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../../../config/api.config';
import { GoodIssueHeader, GoodIssueLine } from './good-issue.model';

export interface CreateGoodIssueItemPayload {
  itemCode: string;
  warehouse: string;
  quantity: number;
  batches: CreateGoodIssueBatchPayload[];
}

export interface CreateGoodIssueBatchPayload {
  batchNumber: string;
  quantity: number;
}

export interface CreateGoodIssuePayload {
  branch: number;
  docDate: string;
  taxDate: string;
  docDueDate: string;
  issuedFrom: string;
  issuedTo: string;
  remarks: string;
  items: CreateGoodIssueItemPayload[];
}

export interface CreateGoodIssueResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  error?: string;
  error_code?: number;
  docEntry?: string | number;
  data?: Record<string, unknown>;
}

export interface GoodIssueListLineItem {
  lineNum: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  warehouse: string;
  lineTotal: number;
  batchNumber: string;
}

export interface GoodIssueListItem {
  docEntry: string;
  docNum: string;
  docDate: string;
  docDueDate: string;
  taxDate: string;
  seriesName: string;
  branch: string;
  fromWarehouse: string;
  issuedTo: string;
  remarks: string;
  status: string;
  items: GoodIssueListLineItem[];
  itemCount: number;
}

export function buildCreateGoodIssuePayload(
  header: GoodIssueHeader,
  lines: GoodIssueLine[],
): CreateGoodIssuePayload {
  const branch = Number.parseInt(header.branchId.trim(), 10);

  return {
    branch: Number.isFinite(branch) ? branch : 0,
    docDate: header.docDate.trim(),
    taxDate: header.taxDate.trim(),
    docDueDate: header.docDueDate.trim(),
    issuedFrom: header.issuedFrom.trim(),
    issuedTo: header.issuedTo.trim(),
    remarks: header.remarks.trim(),
    items: lines
      .filter((line) => line.itemCode.trim())
      .map((line) => ({
        itemCode: line.itemCode.trim(),
        warehouse: line.warehouse.trim(),
        quantity: line.quantity ?? 0,
        batches: [
          {
            batchNumber: line.batchSerialNumber.trim(),
            quantity: line.quantity ?? 0,
          },
        ],
      })),
  };
}

@Injectable({
  providedIn: 'root',
})
export class GoodIssueService {
  private readonly http = inject(HttpClient);

  list(): Observable<GoodIssueListItem[]> {
    return this.http.get<unknown>(apiUrl('get_goods_issue')).pipe(
      map((response) => this.parseGoodIssues(response)),
    );
  }

  create(payload: CreateGoodIssuePayload): Observable<CreateGoodIssueResponse> {
    return this.http.post<CreateGoodIssueResponse>(apiUrl('createGoodsIssue'), payload);
  }

  private parseGoodIssues(response: unknown): GoodIssueListItem[] {
    const data = this.extractDataArray(response, ['goods_issue', 'good_issue', 'get_goods_issue', 'data']);
    return data
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => {
        const lines = this.pickArray(item, ['items', 'lines', 'DocumentLines'])
          .filter((line): line is Record<string, unknown> => !!line && typeof line === 'object')
          .map((line) => {
            const batches = this.pickArray(line, ['batches']);
            const firstBatch =
              batches.find(
                (batch): batch is Record<string, unknown> => !!batch && typeof batch === 'object',
              ) ?? null;

            return {
              lineNum: this.pickString(line, ['LineNum', 'lineNum']),
              itemCode: this.pickString(line, ['ItemCode', 'itemCode']),
              itemDescription: this.pickString(line, ['Dscription', 'itemDescription', 'description']),
              quantity: this.pickNumber(line, ['Quantity', 'quantity']),
              unitPrice: this.pickNumber(line, ['Price', 'unitPrice', 'price']),
              warehouse: this.pickString(line, ['WhsCode', 'warehouse', 'FromWhsCod', 'fromWarehouse']),
              lineTotal: this.pickNumber(line, ['LineTotal', 'lineTotal']),
              batchNumber: firstBatch
                ? this.pickString(firstBatch, ['BatchNum', 'batchNumber', 'batch_number'])
                : '',
            };
          });

        const firstLine = lines[0] ?? null;
        return {
          docEntry: this.pickString(item, ['DocEntry', 'docEntry']),
          docNum: this.pickString(item, ['DocNum', 'docNum', 'issueNo']),
          docDate: this.pickDate(item, ['DocDate', 'docDate']),
          docDueDate: this.pickDate(item, ['DocDueDate', 'docDueDate']),
          taxDate: this.pickDate(item, ['TaxDate', 'taxDate']),
          seriesName: this.pickString(item, ['SeriesName', 'seriesName', 'Series']),
          branch: this.pickString(item, ['BPLName', 'branchName', 'Branch', 'branch', 'BPLId']),
          fromWarehouse:
            this.pickString(item, ['Filler', 'FromWhsCod', 'fromWarehouse', 'issuedFrom']) ||
            firstLine?.warehouse ||
            '',
          issuedTo: this.pickString(item, ['U_IssuedTo', 'issuedTo', 'IssuedTo']),
          remarks: this.pickString(item, ['Comments', 'Remarks', 'remarks']),
          status: this.pickString(item, ['DocStatus', 'status']) || 'O',
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
