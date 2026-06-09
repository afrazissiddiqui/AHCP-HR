import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../../../config/api.config';

export interface AgpLineItem {
  itemCode: string;
  itemName: string;
  /** SAP Item Master (OITM) linkage */
  oitmCode: string;
  serialNumbers: string;
  category: string;
  packingCondition: string;
  productQuality: string;
  uom: string;
  qtySent: number;
  qtyReceived: number;
  info: string;
  remarks: string;
}

export interface AgpAddPayload {
  type: string;
  baseDocNo: string;
  documentDate: string;
  referenceNo: string;
  businessPartnerCode: string;
  businessPartnerName: string;
  vehicleNo: string;
  reasonForMovement: string;
  requestingEmployee: string;
  requestingDepartment: string;
  requestedBy: string;
  issuedTo: string;
  articleOutDate: string;
  articleReturnedDate: string;
  transporterName: string;
  transporterCnic: string;
  transporterPhone: string;
  biltyNo: string;
  freightAmount: number;
  attachmentFileName: string;
  headOfSupplyChainApproval: boolean;
  remarks: string;
  lines: AgpLineItem[];
  totalQtySent: number;
  totalQtyReceived: number;
}

export interface AgpApiResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface AgpRecord {
  Id: number;
  /** AGP NO */
  referenceNo: string;
  /** List / search label (typically business partner name) */
  title: string;
  requestingDepartment: string;
  status: string;
  /** Document date */
  submittedDate: string;
  remarks?: string;
  selected?: boolean;

  type: string;
  businessPartnerCode: string;
  baseDocNo: string;
  businessPartnerName: string;
  vehicleNo: string;

  reasonForMovement: string;
  requestingEmployee: string;
  requestedBy: string;
  issuedTo: string;

  articleOutDate: string;
  articleReturnedDate: string;

  transporterName: string;
  transporterCnic: string;
  transporterPhone: string;
  biltyNo: string;
  freightAmount: number;

  attachmentFileName?: string;
  headOfSupplyChainApproval: boolean;

  lines: AgpLineItem[];
  totalQtySent: number;
  totalQtyReceived: number;

  /** @deprecated Use requestingDepartment — kept for list/search compatibility */
  department?: string;
}

const ARTICLE_GATE_PASS_LIST_URL = apiUrl('article-gate-pass-list');
const ARTICLE_GATE_PASS_ADD_URL = apiUrl('article-gate-pass-add');
const ARTICLE_GATE_PASS_DETAIL_URL = apiUrl('article-gate-pass-detail');
const ARTICLE_GATE_PASS_UPDATE_URL = apiUrl('article-gate-pass-update');
const ARTICLE_GATE_PASS_DELETE_URL = apiUrl('article-gate-pass-delete');

function emptyLine(): AgpLineItem {
  return {
    itemCode: '',
    itemName: '',
    oitmCode: '',
    serialNumbers: '',
    category: '',
    packingCondition: '',
    productQuality: '',
    uom: '',
    qtySent: 0,
    qtyReceived: 0,
    info: '',
    remarks: '',
  };
}

export function createEmptyAgpLines(count: number): AgpLineItem[] {
  return Array.from({ length: count }, () => emptyLine());
}

/** One blank line for dynamic “Add line” on the create form. */
export function createEmptyAgpLineItem(): AgpLineItem {
  return emptyLine();
}

@Injectable({
  providedIn: 'root',
})
export class AgpService {
  private readonly http = inject(HttpClient);
  private readonly agpList = signal<AgpRecord[]>([]);

  readonly records = this.agpList.asReadonly();

  fetchArticleGatePasses(): Observable<AgpRecord[]> {
    return this.http.get<unknown>(ARTICLE_GATE_PASS_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToRecord(item))),
      tap((records) => this.agpList.set(records)),
    );
  }

  fetchArticleGatePassDetail(id: string | number): Observable<AgpRecord> {
    const identifier = encodeURIComponent(String(id));
    const numericId = Number.parseInt(String(id), 10) || 0;

    return this.http.get<unknown>(`${ARTICLE_GATE_PASS_DETAIL_URL}/${identifier}`).pipe(
      map((response) => {
        const record = this.mapDetailResponse(response);
        if (!record.Id && numericId) {
          return { ...record, Id: numericId };
        }
        return record;
      }),
    );
  }

  addArticleGatePass(payload: AgpAddPayload): Observable<AgpApiResponse> {
    return this.http.post<AgpApiResponse>(ARTICLE_GATE_PASS_ADD_URL, payload);
  }

  updateArticleGatePass(id: string | number, payload: AgpAddPayload): Observable<AgpApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post<AgpApiResponse>(`${ARTICLE_GATE_PASS_UPDATE_URL}/${identifier}`, payload);
  }

  deleteArticleGatePass(id: string | number): Observable<AgpApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete<AgpApiResponse>(`${ARTICLE_GATE_PASS_DELETE_URL}/${identifier}`);
  }

  removeAgpRecord(record: AgpRecord): void {
    this.agpList.update((list) => list.filter((item) => item.Id !== record.Id));
  }

  private mapDetailResponse(response: unknown): AgpRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      return this.mapApiItemToRecord(response as Record<string, unknown>);
    }

    throw new Error('Article gate pass record not found');
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
      'article_gate_passes',
      'articleGatePasses',
      'articleGatePassList',
      'agpList',
      'agps',
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

  private pickBoolean(sources: Array<Record<string, unknown>>, keys: string[]): boolean {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value === true || value === false) {
          return value;
        }
        if (value === 1 || value === '1' || String(value).toLowerCase() === 'true') {
          return true;
        }
        if (value === 0 || value === '0' || String(value).toLowerCase() === 'false') {
          return false;
        }
      }
    }
    return false;
  }

  private mapLineItem(raw: Record<string, unknown>): AgpLineItem {
    return {
      oitmCode: this.pickString([raw], ['oitmCode', 'oitm_code', 'OitmCode']),
      itemCode: this.pickString([raw], ['itemCode', 'item_code', 'ItemCode']),
      itemName: this.pickString([raw], ['itemName', 'item_name', 'ItemName']),
      serialNumbers: this.pickString([raw], ['serialNumbers', 'serial_numbers', 'SerialNumbers']),
      category: this.pickString([raw], ['category', 'Category']),
      packingCondition: this.pickString([raw], ['packingCondition', 'packing_condition']),
      productQuality: this.pickString([raw], ['productQuality', 'product_quality']),
      uom: this.pickString([raw], ['uom', 'UOM', 'Uom']),
      qtySent: this.pickNumber([raw], ['qtySent', 'qty_sent', 'QtySent']),
      qtyReceived: this.pickNumber([raw], ['qtyReceived', 'qty_received', 'QtyReceived']),
      info: this.pickString([raw], ['info', 'Info']),
      remarks: this.pickString([raw], ['remarks', 'Remarks']),
    };
  }

  private mapLines(item: Record<string, unknown>): AgpLineItem[] {
    const rawLines = item['lines'] ?? item['Lines'] ?? item['lineItems'] ?? item['line_items'];
    if (!Array.isArray(rawLines)) {
      return [];
    }

    return rawLines
      .filter((line): line is Record<string, unknown> => !!line && typeof line === 'object')
      .map((line) => this.mapLineItem(line));
  }

  private mapApiItemToRecord(item: Record<string, unknown>): AgpRecord {
    const sources = [item];
    const id = this.pickString([item], ['id', 'Id', 'agp_id', 'article_gate_pass_id']);

    const businessPartnerName =
      this.pickString(sources, ['businessPartnerName', 'business_partner_name', 'BusinessPartnerName']) || '—';
    const requestingDepartment =
      this.pickString(sources, ['requestingDepartment', 'requesting_department', 'department', 'Department']) || '—';
    const lines = this.mapLines(item);
    const totalQtySent =
      this.pickNumber(sources, ['totalQtySent', 'total_qty_sent', 'TotalQtySent']) ||
      lines.reduce((sum, line) => sum + (Number.isFinite(line.qtySent) ? line.qtySent : 0), 0);
    const totalQtyReceived =
      this.pickNumber(sources, ['totalQtyReceived', 'total_qty_received', 'TotalQtyReceived']) ||
      lines.reduce((sum, line) => sum + (Number.isFinite(line.qtyReceived) ? line.qtyReceived : 0), 0);

    return {
      Id: Number.parseInt(id, 10) || 0,
      referenceNo: this.pickString(sources, ['referenceNo', 'reference_no', 'ReferenceNo']) || '—',
      title: businessPartnerName,
      requestingDepartment,
      department: requestingDepartment,
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
      reasonForMovement: this.pickString(sources, ['reasonForMovement', 'reason_for_movement']) || '—',
      requestingEmployee: this.pickString(sources, ['requestingEmployee', 'requesting_employee']) || '—',
      requestedBy: this.pickString(sources, ['requestedBy', 'requested_by']) || '—',
      issuedTo: this.pickString(sources, ['issuedTo', 'issued_to']) || '—',
      articleOutDate: this.pickString(sources, ['articleOutDate', 'article_out_date']) || '—',
      articleReturnedDate: this.pickString(sources, ['articleReturnedDate', 'article_returned_date']) || '—',
      transporterName: this.pickString(sources, ['transporterName', 'transporter_name']) || '—',
      transporterCnic: this.pickString(sources, ['transporterCnic', 'transporter_cnic']) || '—',
      transporterPhone: this.pickString(sources, ['transporterPhone', 'transporter_phone']) || '—',
      biltyNo: this.pickString(sources, ['biltyNo', 'bilty_no', 'BiltyNo']) || '—',
      freightAmount: this.pickNumber(sources, ['freightAmount', 'freight_amount', 'FreightAmount']),
      attachmentFileName: this.pickString(sources, ['attachmentFileName', 'attachment_file_name']) || undefined,
      headOfSupplyChainApproval: this.pickBoolean(sources, [
        'headOfSupplyChainApproval',
        'head_of_supply_chain_approval',
      ]),
      lines,
      totalQtySent,
      totalQtyReceived,
    };
  }
}
