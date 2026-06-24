import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../../../config/api.config';

export interface IgpLineItem {
  itemCode: string;
  itemName: string;
  serialNumbers: string;
  category: string;
  packingCondition: string;
  productQuality: string;
  uom: string;
  qty: number;
  info: string;
  remarks: string;
  deleted: boolean;
}

export interface IgpAddPayload {
  type: string;
  baseDocNo: string;
  documentDate: string;
  referenceNo: string;
  businessPartnerCode: string;
  businessPartnerName: string;
  vehicleNo: string;
  fromUnit: string;
  kantaSlip: string;
  biltyNo: string;
  store: string;
  freight: string;
  transporterName: string;
  transporterCnic: string;
  transporterPhone: string;
  department: string;
  weightMachineName: string;
  weight: string;
  location: string;
  employee: string;
  remarks: string;
  lines: IgpLineItem[];
  totalQty: number;
}

export interface IgpApiResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface IgpRecord {
  Id: number;
  referenceNo: string;
  title: string;
  department: string;
  status: string;
  submittedDate: string;
  remarks?: string;
  selected?: boolean;
  type: string;
  businessPartnerCode: string;
  baseDocNo: string;
  businessPartnerName: string;
  vehicleNo: string;
  fromUnit: string;
  kantaSlip: string;
  biltyNo: string;
  store: string;
  freight: string;
  transporterName: string;
  transporterCnic: string;
  transporterPhone: string;
  weightMachineName: string;
  weight: string;
  location: string;
  employee: string;
  lines: IgpLineItem[];
  totalQty: number;
}

const INWARD_GATE_PASS_LIST_URL = apiUrl('inward-gate-pass-list');
const INWARD_GATE_PASS_ADD_URL = apiUrl('inward-gate-pass-add');
const INWARD_GATE_PASS_DETAIL_URL = apiUrl('inward-gate-pass-detail');
const INWARD_GATE_PASS_UPDATE_URL = apiUrl('inward-gate-pass-update');
const INWARD_GATE_PASS_DELETE_URL = apiUrl('inward-gate-pass-delete');

function emptyLine(): IgpLineItem {
  return {
    itemCode: '',
    itemName: '',
    serialNumbers: '',
    category: '',
    packingCondition: '',
    productQuality: '',
    uom: '',
    qty: 0,
    info: '',
    remarks: '',
    deleted: false,
  };
}

export function createEmptyIgpLines(count: number): IgpLineItem[] {
  return Array.from({ length: count }, () => emptyLine());
}

export function createEmptyIgpLineItem(): IgpLineItem {
  return emptyLine();
}

@Injectable({
  providedIn: 'root',
})
export class IgpService {
  private readonly http = inject(HttpClient);
  private readonly igpList = signal<IgpRecord[]>([]);

  readonly records = this.igpList.asReadonly();

  fetchInwardGatePasses(): Observable<IgpRecord[]> {
    return this.http.get<unknown>(INWARD_GATE_PASS_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.igpList.set(records)),
    );
  }

  fetchInwardGatePassDetail(id: string | number): Observable<IgpRecord> {
    const identifier = encodeURIComponent(String(id));
    const numericId = Number.parseInt(String(id), 10) || 0;

    return this.http.get<unknown>(`${INWARD_GATE_PASS_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const record = this.mapDetailResponse(response);
        if (!record.Id && numericId) {
          return { ...record, Id: numericId };
        }
        return record;
      }),
    );
  }

  addInwardGatePass(payload: IgpAddPayload): Observable<IgpApiResponse> {
    return this.http.post<IgpApiResponse>(INWARD_GATE_PASS_ADD_URL, payload);
  }

  updateInwardGatePass(id: string | number, payload: IgpAddPayload): Observable<IgpApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post<IgpApiResponse>(`${INWARD_GATE_PASS_UPDATE_URL}/${identifier}`, payload);
  }

  deleteInwardGatePass(id: string | number): Observable<IgpApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete<IgpApiResponse>(`${INWARD_GATE_PASS_DELETE_URL}/${identifier}`);
  }

  removeIgpRecord(record: IgpRecord): void {
    this.igpList.update((list) => list.filter((item) => item.Id !== record.Id));
  }

  recordToPayload(record: IgpRecord): IgpAddPayload {
    return {
      type: record.type,
      baseDocNo: record.baseDocNo,
      documentDate: record.submittedDate,
      referenceNo: record.referenceNo,
      businessPartnerCode: record.businessPartnerCode,
      businessPartnerName: record.businessPartnerName,
      vehicleNo: record.vehicleNo,
      fromUnit: record.fromUnit,
      kantaSlip: record.kantaSlip,
      biltyNo: record.biltyNo,
      store: record.store,
      freight: record.freight,
      transporterName: record.transporterName,
      transporterCnic: record.transporterCnic,
      transporterPhone: record.transporterPhone,
      department: record.department,
      weightMachineName: record.weightMachineName,
      weight: record.weight,
      location: record.location,
      employee: record.employee,
      remarks: record.remarks ?? '',
      lines: record.lines.map((line) => ({ ...line, qty: Number(line.qty) || 0 })),
      totalQty: record.totalQty,
    };
  }

  private mapDetailResponse(response: unknown): IgpRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      return this.mapApiItemToRecord(response as Record<string, unknown>);
    }

    throw new Error('Inward gate pass record not found');
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
      'inward_gate_passes',
      'inwardGatePasses',
      'inwardGatePassList',
      'igpList',
      'igps',
    ];

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

    if (
      obj['referenceNo'] ||
      obj['reference_no'] ||
      obj['type'] ||
      obj['baseDocNo'] ||
      obj['base_doc_no'] ||
      obj['businessPartnerName'] ||
      obj['business_partner_name']
    ) {
      return [obj];
    }

    return [];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value === undefined || value === null) {
      return {};
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return {};
      }
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return {};
      }
      return {};
    }
    if (Array.isArray(value)) {
      const first = value[0];
      return first && typeof first === 'object' ? (first as Record<string, unknown>) : {};
    }
    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return {};
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
    const text = this.pickString(sources, keys);
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private mapLineItem(raw: Record<string, unknown>): IgpLineItem {
    return {
      itemCode: this.pickString([raw], ['itemCode', 'item_code', 'ItemCode']),
      itemName: this.pickString([raw], ['itemName', 'item_name', 'ItemName']),
      serialNumbers: this.pickString([raw], ['serialNumbers', 'serial_numbers', 'batchNo', 'batch_no', 'BatchNo']),
      category: this.pickString([raw], ['category', 'Category']),
      packingCondition: this.pickString([raw], ['packingCondition', 'packing_condition']),
      productQuality: this.pickString([raw], ['productQuality', 'product_quality']),
      uom: this.pickString([raw], ['uom', 'UOM', 'Uom']),
      qty: this.pickNumber([raw], ['qty', 'quantity', 'Qty']),
      info: this.pickString([raw], ['info', 'Info']),
      remarks: this.pickString([raw], ['remarks', 'Remarks']),
      deleted: Boolean(raw['deleted'] ?? raw['Deleted'] ?? raw['isDeleted']),
    };
  }

  private mapLines(item: Record<string, unknown>): IgpLineItem[] {
    const rawLines = item['lines'] ?? item['Lines'] ?? item['lineItems'] ?? item['line_items'];
    if (!Array.isArray(rawLines)) {
      return [];
    }

    return rawLines
      .filter((line): line is Record<string, unknown> => !!line && typeof line === 'object')
      .map((line) => this.mapLineItem(line));
  }

  private mapApiItemToRecord(item: Record<string, unknown>): IgpRecord {
    const sources = [item];
    const id = this.pickString([item], ['id', 'Id', 'igp_id', 'inward_gate_pass_id']);

    const businessPartnerName =
      this.pickString(sources, ['businessPartnerName', 'business_partner_name', 'BusinessPartnerName']) || '—';
    const lines = this.mapLines(item);
    const totalQty =
      this.pickNumber(sources, ['totalQty', 'total_qty', 'TotalQty']) ||
      lines.reduce((sum, line) => sum + (Number.isFinite(line.qty) ? line.qty : 0), 0);

    return {
      Id: Number.parseInt(id, 10) || 0,
      referenceNo: this.pickString(sources, ['referenceNo', 'reference_no', 'ReferenceNo']) || '—',
      title: businessPartnerName,
      department: this.pickString(sources, ['department', 'Department']) || '—',
      status: this.pickString(sources, ['status', 'Status']) || '—',
      submittedDate:
        this.pickString(sources, ['documentDate', 'document_date', 'submittedDate', 'submitted_date']) || '—',
      remarks: this.pickString(sources, ['remarks', 'Remarks']) || undefined,
      selected: false,
      type: this.pickString(sources, ['type', 'Type']) || '—',
      businessPartnerCode:
        this.pickString(sources, ['businessPartnerCode', 'business_partner_code', 'BusinessPartnerCode']) || '—',
      baseDocNo: this.pickString(sources, ['baseDocNo', 'base_doc_no', 'BaseDocNo']) || '—',
      businessPartnerName,
      vehicleNo: this.pickString(sources, ['vehicleNo', 'vehicle_no', 'VehicleNo']) || '—',
      fromUnit: this.pickString(sources, ['fromUnit', 'from_unit', 'FromUnit']) || '—',
      kantaSlip: this.pickString(sources, ['kantaSlip', 'kanta_slip', 'KantaSlip']) || '—',
      biltyNo: this.pickString(sources, ['biltyNo', 'bilty_no', 'BiltyNo']) || '—',
      store: this.pickString(sources, ['store', 'Store']) || '—',
      freight:
        this.pickString(sources, ['freight', 'Freight', 'freightAmount', 'freight_amount']) || '—',
      transporterName: this.pickString(sources, ['transporterName', 'transporter_name']) || '—',
      transporterCnic: this.pickString(sources, ['transporterCnic', 'transporter_cnic']) || '—',
      transporterPhone: this.pickString(sources, ['transporterPhone', 'transporter_phone']) || '—',
      weightMachineName:
        this.pickString(sources, ['weightMachineName', 'weight_machine_name', 'WeightMachineName']) || '—',
      weight: this.pickString(sources, ['weight', 'Weight']) || '—',
      location: this.pickString(sources, ['location', 'Location']) || '—',
      employee: this.pickString(sources, ['employee', 'Employee']) || '—',
      lines,
      totalQty,
    };
  }
}
