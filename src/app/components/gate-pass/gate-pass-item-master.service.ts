import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { apiUrl } from '../../config/api.config';

export interface GatePassItemMaster {
  itemCode: string;
  itemName: string;
  category: string;
  packingCondition: string;
  productQuality: string;
  uom: string;
}

const ITEMS_URL = apiUrl('items');

const STATIC_ALLOCATABLE_ASSETS: GatePassItemMaster[] = [
  { itemCode: 'IT-LP01', itemName: 'Laptop Dell Latitude 5540', category: 'IT Assets', packingCondition: 'Boxed', productQuality: 'Working', uom: 'EA' },
  { itemCode: 'IT-MT02', itemName: 'Digital multimeter kit', category: 'IT Assets', packingCondition: 'Case', productQuality: 'Calibrated', uom: 'SET' },
  { itemCode: 'TL-900', itemName: 'Torque wrench set', category: 'Tools', packingCondition: 'Case', productQuality: 'Good', uom: 'SET' },
  { itemCode: 'CAP-88', itemName: 'Precision measuring unit', category: 'Capital', packingCondition: 'Crated', productQuality: 'New', uom: 'EA' },
];

export interface GatePassLineItemFields {
  itemCode: string;
  itemName: string;
  category?: string;
  packingCondition?: string;
  productQuality?: string;
  uom?: string;
}

function pickString(sources: Array<Record<string, unknown>>, keys: string[]): string {
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

export function mapGatePassItemRecord(item: Record<string, unknown>): GatePassItemMaster {
  return {
    itemCode: pickString([item], ['itemCode', 'item_code', 'ItemCode', 'code', 'Code']),
    itemName: pickString([item], ['itemName', 'item_name', 'ItemName', 'name', 'Name', 'description']),
    category: pickString([item], ['category', 'Category']),
    packingCondition: pickString([item], ['packingCondition', 'packing_condition', 'PackingCondition']),
    productQuality: pickString([item], ['productQuality', 'product_quality', 'ProductQuality']),
    uom: pickString([item], ['uom', 'UOM', 'Uom', 'uomCode', 'UOMCode', 'unit', 'Unit']),
  };
}

@Injectable({ providedIn: 'root' })
export class GatePassItemMasterService {
  private readonly http = inject(HttpClient);
  private readonly catalog = signal<GatePassItemMaster[]>([]);
  private loaded = false;
  private loading = false;
  private load$?: Observable<GatePassItemMaster[]>;

  listAllocatableAssets(): GatePassItemMaster[] {
    return STATIC_ALLOCATABLE_ASSETS.map((item) => ({ ...item }));
  }

  ensureLoaded(): Observable<GatePassItemMaster[]> {
    if (this.loaded) {
      return of(this.catalog());
    }

    if (!this.load$) {
      this.loading = true;
      this.load$ = this.http.get<unknown>(ITEMS_URL).pipe(
        map((response) => this.extractApiItems(response).map((item) => this.mapItem(item))),
        tap((records) => {
          this.catalog.set(records);
          this.loaded = true;
          this.loading = false;
        }),
        catchError(() => {
          this.catalog.set([]);
          this.loaded = true;
          this.loading = false;
          return of([]);
        }),
      );
    }

    return this.load$;
  }

  isLoading(): boolean {
    return this.loading;
  }

  search(query: string, limit = 8): GatePassItemMaster[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.catalog()
      .filter(
        (item) =>
          item.itemCode.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q),
      )
      .slice(0, limit);
  }

  applyToLine(line: GatePassLineItemFields, item: GatePassItemMaster): void {
    line.itemCode = item.itemCode;
    line.itemName = item.itemName;
    if (line.category !== undefined) {
      line.category = item.category;
    }
    if (line.packingCondition !== undefined) {
      line.packingCondition = item.packingCondition;
    }
    if (line.productQuality !== undefined) {
      line.productQuality = item.productQuality;
    }
    if (line.uom !== undefined) {
      line.uom = item.uom;
    }
  }

  applyCatalogDefaultsToLine(line: GatePassLineItemFields): void {
    const match = this.findMatchingCatalogItem(line);
    if (!match) {
      return;
    }

    if ((line.category ?? '').trim() === '') {
      line.category = match.category;
    }
    if ((line.packingCondition ?? '').trim() === '') {
      line.packingCondition = match.packingCondition;
    }
    if ((line.productQuality ?? '').trim() === '') {
      line.productQuality = match.productQuality;
    }
    if ((line.uom ?? '').trim() === '') {
      line.uom = match.uom;
    }
  }

  private findMatchingCatalogItem(line: GatePassLineItemFields): GatePassItemMaster | undefined {
    const itemCode = line.itemCode?.trim().toLowerCase();
    const itemName = line.itemName?.trim().toLowerCase();

    if (!itemCode && !itemName) {
      return undefined;
    }

    return this.catalog().find((item) => {
      const catalogCode = item.itemCode.toLowerCase();
      const catalogName = item.itemName.toLowerCase();

      if (itemCode && (catalogCode === itemCode || catalogCode.includes(itemCode))) {
        return true;
      }

      return Boolean(itemName && (catalogName === itemName || catalogName.includes(itemName)));
    });
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
    const arrayKeys = ['data', 'items', 'results', 'records', 'list', 'itemList', 'item_list'];

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

    if (obj['itemCode'] || obj['item_code'] || obj['code'] || obj['name']) {
      return [obj];
    }

    return [];
  }

  private mapItem(item: Record<string, unknown>): GatePassItemMaster {
    return mapGatePassItemRecord(item);
  }
}
