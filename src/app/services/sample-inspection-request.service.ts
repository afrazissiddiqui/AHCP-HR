import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../config/api.config';
import { OitmItem } from '../constants/oitm-items';
import { OitmItemsService } from './oitm-items.service';
import { OudpDepartment } from '../constants/oudp-departments';

export interface SampleInspectionLineItem {
  itemCode?: string;
  item?: string;
  qty?: string;
  uom?: string;
  remarks?: string;
  fromIgp?: boolean;
}

export interface SampleInspectionRecord {
  sirNo: number;
  igpNo?: string;
  bpCode?: string;
  bpName?: string;
  receivingDate?: string;
  receivingTime?: string;
  documentNumber?: string;
  documentDate?: string;
  revNo?: string;
  revDate?: string;
  department?: string;
  lotBatchNo?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  najas?: string;
  physicalCondition?: string;
  remarks?: string;
  submittedBy?: string;
  sealIntact?: boolean;
  pestInfection?: boolean;
  items?: SampleInspectionLineItem[];
  selected?: boolean;
}

export type SampleInspectionPayload = {
  igpNo?: string;
  bpCode?: string;
  bpName?: string;
  receivingDate?: string;
  receivingTime?: string;
  documentNumber?: string;
  documentDate?: string;
  revNo?: string;
  revDate?: string;
  department?: string;
  lotBatchNo?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  najas?: string;
  physicalCondition?: string;
  remarks?: string;
  submittedBy?: string;
  sealIntact?: string | boolean;
  pestInfection?: string | boolean;
  items: SampleInspectionLineItem[];
};

const SAMPLE_INSPECTION_LIST_URL = apiUrl('sample-inspection-request-list');
const SAMPLE_INSPECTION_DETAIL_URL = apiUrl('sample-inspection-request-detail');
const SAMPLE_INSPECTION_ADD_URL = apiUrl('sample-inspection-request-add');
const SAMPLE_INSPECTION_UPDATE_URL = apiUrl('sample-inspection-request-update');
const OUDP_DEPARTMENTS_URL = apiUrl('oudp-departments');

export function formatSirNumber(sirNo: number): string {
  return `SIR-${String(sirNo).padStart(5, '0')}`;
}

@Injectable({
  providedIn: 'root',
})
export class SampleInspectionRequestService {
  private readonly http = inject(HttpClient);
  private readonly oitmItemsService = inject(OitmItemsService);

  getList(): Observable<SampleInspectionRecord[]> {
    return this.http.get<unknown>(SAMPLE_INSPECTION_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapRecord(item))),
    );
  }

  getBySirNo(sirNo: number): Observable<SampleInspectionRecord> {
    const identifier = encodeURIComponent(String(sirNo));
    return this.http.get<unknown>(`${SAMPLE_INSPECTION_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const items = this.extractApiItems(response);
        if (items.length > 0) {
          return this.mapRecord(items[0]);
        }
        return this.mapRecord(response as Record<string, unknown>);
      }),
    );
  }

  create(payload: SampleInspectionPayload): Observable<SampleInspectionRecord> {
    return this.http.post<unknown>(SAMPLE_INSPECTION_ADD_URL, payload).pipe(
      map((response) => this.mapRecord(this.unwrapRecord(response))),
    );
  }

  update(sirNo: number, payload: SampleInspectionPayload): Observable<SampleInspectionRecord> {
    const identifier = encodeURIComponent(String(sirNo));
    return this.http.post<unknown>(`${SAMPLE_INSPECTION_UPDATE_URL}/${identifier}`, payload).pipe(
      map((response) => this.mapRecord(this.unwrapRecord(response))),
    );
  }

  getOitmItems(): Observable<OitmItem[]> {
    return this.oitmItemsService.getItems();
  }

  getOudpDepartments(): Observable<OudpDepartment[]> {
    return this.http.get<unknown>(OUDP_DEPARTMENTS_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapOudpDepartment(item))),
    );
  }

  private unwrapRecord(response: unknown): Record<string, unknown> {
    if (!response || typeof response !== 'object') {
      return {};
    }
    const obj = response as Record<string, unknown>;
    const nested = obj['data'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    return obj;
  }

  private mapRecord(item: Record<string, unknown>): SampleInspectionRecord {
    const sirNo = this.pickNumber([item], ['sirNo', 'sir_no', 'id', 'Id']) || 0;
    const items = this.mapLineItems(item);

    return {
      sirNo,
      igpNo: this.pickString([item], ['igpNo', 'igp_no', 'IGPNo']),
      bpCode: this.pickString([item], ['bpCode', 'bp_code', 'businessPartnerCode', 'business_partner_code']),
      bpName: this.pickString([item], ['bpName', 'bp_name', 'businessPartnerName', 'business_partner_name']),
      receivingDate: this.pickString([item], ['receivingDate', 'receiving_date']),
      receivingTime: this.pickString([item], ['receivingTime', 'receiving_time']),
      documentNumber:
        this.pickString([item], ['documentNumber', 'document_number']) || formatSirNumber(sirNo),
      documentDate: this.pickString([item], ['documentDate', 'document_date']),
      revNo: this.pickString([item], ['revNo', 'rev_no']),
      revDate: this.pickString([item], ['revDate', 'rev_date']),
      department: this.pickString([item], ['department', 'Department']),
      lotBatchNo: this.pickString([item], ['lotBatchNo', 'lot_batch_no']),
      manufacturingDate: this.pickString([item], ['manufacturingDate', 'manufacturing_date']),
      expiryDate: this.pickString([item], ['expiryDate', 'expiry_date']),
      najas: this.pickString([item], ['najas', 'Najas']),
      physicalCondition: this.pickString([item], ['physicalCondition', 'physical_condition']),
      remarks: this.pickString([item], ['remarks', 'Remarks']),
      submittedBy: this.pickString([item], ['submittedBy', 'submitted_by']),
      sealIntact: this.pickBoolean([item], ['sealIntact', 'seal_intact']),
      pestInfection: this.pickBoolean([item], ['pestInfection', 'pest_infection']),
      items,
      selected: Boolean(item['selected']),
    };
  }

  private mapLineItems(item: Record<string, unknown>): SampleInspectionLineItem[] {
    const rawItems = item['items'] ?? item['Items'] ?? item['lines'] ?? item['lineItems'];
    if (!Array.isArray(rawItems)) {
      return [];
    }

    return rawItems
      .filter((line): line is Record<string, unknown> => !!line && typeof line === 'object')
      .map((line) => ({
        itemCode: this.pickString([line], ['itemCode', 'item_code']),
        item: this.pickString([line], ['item', 'itemName', 'item_name']),
        qty: this.pickString([line], ['qty', 'quantity']),
        uom: this.pickString([line], ['uom', 'UOM']),
        remarks: this.pickString([line], ['remarks', 'Remarks']),
        fromIgp: Boolean(line['fromIgp'] ?? line['from_igp']),
      }));
  }

  private mapOitmItem(item: Record<string, unknown>): OitmItem {
    return {
      itemCode: this.pickString([item], ['ItemCode', 'itemCode', 'item_code', 'code', 'Code']),
      itemName: this.pickString([item], ['ItemName', 'itemName', 'item_name', 'name', 'Name', 'description', 'Description']),
      uom: this.pickString([item], ['uom', 'UOM', 'Uom', 'unit', 'Unit']),
      availableQty: this.pickQtyValue(item),
    };
  }

  private mapOudpDepartment(item: Record<string, unknown>): OudpDepartment {
    return {
      code: this.pickString([item], ['code', 'Code', 'departmentCode', 'department_code']),
      name: this.pickString([item], ['name', 'Name', 'departmentName', 'department_name']),
    };
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
    const arrayKeys = ['data', 'items', 'results', 'records', 'list'];

    for (const key of arrayKeys) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }

    const nestedData = obj['data'];
    if (nestedData && typeof nestedData === 'object') {
      const nestedItems = this.extractApiItems(nestedData);
      if (nestedItems.length > 0) {
        return nestedItems;
      }
    }

    return [obj];
  }

  private pickString(sources: Array<Record<string, unknown>>, keys: string[]): string {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
    }
    return '';
  }

  private pickNumber(sources: Array<Record<string, unknown>>, keys: string[]): number {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    return 0;
  }

  private pickQtyValue(item: Record<string, unknown>): string | number | undefined {
    const value = item['availableQty'] ?? item['available_qty'] ?? item['quantity'];
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    return String(value);
  }

  private pickBoolean(sources: Array<Record<string, unknown>>, keys: string[]): boolean | undefined {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value === undefined || value === null || value === '') {
          continue;
        }
        if (typeof value === 'boolean') {
          return value;
        }
        const normalized = String(value).trim().toLowerCase();
        if (normalized === 'yes' || normalized === 'true' || normalized === '1') {
          return true;
        }
        if (normalized === 'no' || normalized === 'false' || normalized === '0') {
          return false;
        }
      }
    }
    return undefined;
  }
}
