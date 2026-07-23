import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface SalesOrderLine {
  docEntry: string;
  lineNum: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  warehouse: string;
  lineTotal: number;
  qtyPerJumboCarton?: number;
  jumboCartonsCount?: number;
}

export interface SalesOrderRecord {
  docEntry: string;
  docNum: string;
  docDate: string;
  docDueDate: string;
  docStatus: string;
  cardCode: string;
  cardName: string;
  address: string;
  customerPoNo: string;
  branchId: string;
  vehicleNo: string;
  driverName: string;
  items: SalesOrderLine[];
}

const SALES_ORDERS_URL = apiUrl('sales_orders');

@Injectable({ providedIn: 'root' })
export class SalesOrderService {
  private readonly http = inject(HttpClient);

  list(): Observable<SalesOrderRecord[]> {
    return this.http.get<unknown>(SALES_ORDERS_URL).pipe(
      map((response) => this.parseSalesOrders(response)),
    );
  }

  private parseSalesOrders(response: unknown): SalesOrderRecord[] {
    if (!response || typeof response !== 'object') {
      return [];
    }

    const root = response as Record<string, unknown>;
    const wrapper = root['sales_orders'];
    if (!wrapper || typeof wrapper !== 'object') {
      return [];
    }

    const data = (wrapper as Record<string, unknown>)['data'];
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => this.mapSalesOrder(item));
  }

  private mapSalesOrder(item: Record<string, unknown>): SalesOrderRecord {
    return {
      docEntry: this.pickString(item, ['DocEntry', 'docEntry']),
      docNum: this.pickString(item, ['DocNum', 'docNum']),
      docDate: this.pickDate(item, ['DocDate', 'docDate']),
      docDueDate: this.pickDate(item, ['DocDueDate', 'docDueDate']),
      docStatus: this.pickString(item, ['DocStatus', 'docStatus']),
      cardCode: this.pickString(item, ['CardCode', 'cardCode']),
      cardName: this.pickString(item, ['CardName', 'cardName']),
      address: this.pickString(item, ['Address', 'address']),
      customerPoNo: this.pickString(item, ['U_CusPoNo', 'customerPoNo']),
      branchId: this.pickString(item, ['BPLId', 'branchId']),
      vehicleNo: this.pickString(item, ['U_VehicleNo', 'vehicleNo']),
      driverName: this.pickString(item, ['U_DriverName', 'driverName']),
      items: this.mapLines(item['items']),
    };
  }

  private mapLines(value: unknown): SalesOrderLine[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        docEntry: this.pickString(item, ['DocEntry', 'docEntry']),
        lineNum: this.pickString(item, ['LineNum', 'lineNum']),
        itemCode: this.pickString(item, ['ItemCode', 'itemCode']),
        itemDescription: this.pickString(item, ['Dscription', 'itemDescription', 'description']),
        quantity: this.pickNumber(item, ['Quantity', 'quantity']),
        unitPrice: this.pickNumber(item, ['Price', 'price']),
        warehouse: this.pickString(item, ['WhsCode', 'warehouse', 'warehouseCode']),
        lineTotal: this.pickNumber(item, ['LineTotal', 'lineTotal']),
        qtyPerJumboCarton: this.pickNumber(item, ['U_QtyPerJumboCarton', 'QtyPerJumboCarton', 'qtyPerJumboCarton', 'U_QtyPerJumbo', 'QtyPerJumbo']),
        jumboCartonsCount: this.pickNumber(item, ['U_JumboCartonsCount', 'JumboCartonsCount', 'jumboCartonsCount', '#JumboCartons', 'U_JumboCartons']),
      }));
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
