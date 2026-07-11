import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { apiUrl } from '../config/api.config';
import { OitmItem } from '../constants/oitm-items';

@Injectable({
  providedIn: 'root',
})
export class OitmItemsService {
  private readonly http = inject(HttpClient);
  private readonly catalog = signal<OitmItem[]>([]);
  private load$?: Observable<OitmItem[]>;

  /** Returns cached items when available; otherwise fetches once and reuses. */
  ensureLoaded(): Observable<OitmItem[]> {
    if (this.catalog().length > 0) {
      return of(this.catalog());
    }

    if (!this.load$) {
      this.load$ = this.http.get<unknown>(apiUrl('items')).pipe(
        map((response) => this.parseItems(response)),
        tap((items) => this.catalog.set(items)),
        shareReplay(1),
        catchError((error) => {
          this.load$ = undefined;
          return throwError(() => error);
        }),
      );
    }

    return this.load$;
  }

  getItems(): Observable<OitmItem[]> {
    return this.ensureLoaded();
  }

  getCatalog(): readonly OitmItem[] {
    return this.catalog();
  }

  isLoaded(): boolean {
    return this.catalog().length > 0;
  }

  private parseItems(response: unknown): OitmItem[] {
    return this.extractApiItems(response)
      .map((item) => this.mapOitmItem(item))
      .filter((item) => item.itemCode.trim() !== '')
      .sort((left, right) =>
        left.itemCode.localeCompare(right.itemCode, undefined, { numeric: true, sensitivity: 'base' }),
      );
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

  private mapOitmItem(item: Record<string, unknown>): OitmItem {
    return {
      itemCode: this.pickString([item], ['ItemCode', 'itemCode', 'item_code', 'code', 'Code']),
      itemName: this.pickString([item], ['ItemName', 'itemName', 'item_name', 'name', 'Name', 'description', 'Description']),
      itemType: this.pickString([item], ['ItemType', 'itemType', 'item_type', 'type', 'Type']),
      uom: this.pickString([item], ['uom', 'UOM', 'Uom', 'unit', 'Unit']),
      availableQty: this.pickQtyValue(item),
      batches: this.pickBatches(item),
    };
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

  private pickBatches(item: Record<string, unknown>): OitmItem['batches'] {
    const raw = item['batches'];
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((batch): batch is Record<string, unknown> => !!batch && typeof batch === 'object')
      .map((batch) => ({
        batchNumber: this.pickString([batch], ['batchNumber', 'batch_number', 'BatchNumber']),
        warehouse: this.pickString([batch], ['warehouse', 'Warehouse', 'warehouseCode', 'warehouse_code']),
        quantity: this.pickQtyValue(batch),
        manufacturingDate: this.pickString([batch], ['manufacturingDate', 'manufacturing_date', 'ManufacturingDate']),
        expiryDate: this.pickString([batch], ['expiryDate', 'expiry_date', 'ExpiryDate']),
      }))
      .filter((batch) => batch.batchNumber || batch.warehouse || batch.quantity || batch.manufacturingDate || batch.expiryDate);
  }
}
