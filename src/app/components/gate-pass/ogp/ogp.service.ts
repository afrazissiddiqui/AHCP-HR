import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../../../config/api.config';

export interface OgpLineItem {
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

export interface OgpAddPayload {
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
  lines: OgpLineItem[];
  totalQty: number;
}

export interface OgpApiResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface OgpRecord {
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
  lines: OgpLineItem[];
  totalQty: number;
}

const OUTWARD_GATE_PASS_LIST_URL = apiUrl('outward-gate-pass-list');
const OUTWARD_GATE_PASS_ADD_URL = apiUrl('outward-gate-pass-add');
const OUTWARD_GATE_PASS_DETAIL_URL = apiUrl('outward-gate-pass-detail');
const OUTWARD_GATE_PASS_UPDATE_URL = apiUrl('outward-gate-pass-update');
const OUTWARD_GATE_PASS_DELETE_URL = apiUrl('outward-gate-pass-delete');

function emptyLine(): OgpLineItem {
  return {
    itemCode: '',
    itemName: '',
    category: '',
    packingCondition: '',
    productQuality: '',
    uom: '',
    qty: 0,
    info: '',
    remarks: '',
  };
}

export function createEmptyOgpLines(count: number): OgpLineItem[] {
  return Array.from({ length: count }, () => emptyLine());
}

export function createEmptyOgpLineItem(): OgpLineItem {
  return emptyLine();
}

@Injectable({
  providedIn: 'root',
})
export class OgpService {
  private readonly http = inject(HttpClient);
  private readonly ogpList = signal<OgpRecord[]>([]);

  readonly records = this.ogpList.asReadonly();

  fetchOutwardGatePasses(): Observable<OgpRecord[]> {
    return this.http.get<unknown>(OUTWARD_GATE_PASS_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.ogpList.set(records)),
    );
  }

  fetchOutwardGatePassDetail(id: string | number): Observable<OgpRecord> {
    const identifier = encodeURIComponent(String(id));
    const numericId = Number.parseInt(String(id), 10) || 0;

    return this.http.get<unknown>(`${OUTWARD_GATE_PASS_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const record = this.mapDetailResponse(response);
        if (!record.Id && numericId) {
          return { ...record, Id: numericId };
        }
        return record;
      }),
    );
  }

  addOutwardGatePass(payload: OgpAddPayload): Observable<OgpApiResponse> {
    return this.http.post<OgpApiResponse>(OUTWARD_GATE_PASS_ADD_URL, payload);
  }

  updateOutwardGatePass(id: string | number, payload: OgpAddPayload): Observable<OgpApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post<OgpApiResponse>(`${OUTWARD_GATE_PASS_UPDATE_URL}/${identifier}`, payload);
  }

  deleteOutwardGatePass(id: string | number): Observable<OgpApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete<OgpApiResponse>(`${OUTWARD_GATE_PASS_DELETE_URL}/${identifier}`);
  }

  removeOgpRecord(record: OgpRecord): void {
    this.ogpList.update((list) => list.filter((item) => item.Id !== record.Id));
  }

  private mapDetailResponse(response: unknown): OgpRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      return this.mapApiItemToRecord(response as Record<string, unknown>);
    }

    throw new Error('Outward gate pass record not found');
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
      'outward_gate_passes',
      'outwardGatePasses',
      'outwardGatePassList',
      'ogpList',
      'ogps',
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

  private mapLineItem(raw: Record<string, unknown>): OgpLineItem {
    return {
      itemCode: this.pickString([raw], ['itemCode', 'item_code', 'ItemCode']),
      itemName: this.pickString([raw], ['itemName', 'item_name', 'ItemName']),
      category: this.pickString([raw], ['category', 'Category']),
      packingCondition: this.pickString([raw], ['packingCondition', 'packing_condition']),
      productQuality: this.pickString([raw], ['productQuality', 'product_quality']),
      uom: this.pickString([raw], ['uom', 'UOM', 'Uom']),
      qty: this.pickNumber([raw], ['qty', 'quantity', 'Qty']),
      info: this.pickString([raw], ['info', 'Info']),
      remarks: this.pickString([raw], ['remarks', 'Remarks']),
    };
  }

  private mapLines(item: Record<string, unknown>): OgpLineItem[] {
    const rawLines = item['lines'] ?? item['Lines'] ?? item['lineItems'] ?? item['line_items'];
    if (!Array.isArray(rawLines)) {
      return [];
    }

    return rawLines
      .filter((line): line is Record<string, unknown> => !!line && typeof line === 'object')
      .map((line) => this.mapLineItem(line));
  }

  private mapApiItemToRecord(item: Record<string, unknown>): OgpRecord {
    const sources = [item];
    const id = this.pickString([item], ['id', 'Id', 'ogp_id', 'outward_gate_pass_id']);

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
