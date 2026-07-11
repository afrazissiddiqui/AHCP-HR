import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface WarehouseOption {
  warehouseCode: string;
  warehouseName: string;
}

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private readonly http = inject(HttpClient);
  private readonly catalog = signal<WarehouseOption[]>([]);
  private load$?: Observable<WarehouseOption[]>;

  readonly warehouses = this.catalog.asReadonly();

  /** Returns cached warehouses when available; otherwise fetches once and reuses. */
  ensureLoaded(): Observable<WarehouseOption[]> {
    if (this.catalog().length > 0) {
      return of(this.catalog());
    }

    return this.fetchCatalog();
  }

  /** Clears cache and fetches warehouses again. */
  reload(): Observable<WarehouseOption[]> {
    this.load$ = undefined;
    this.catalog.set([]);
    return this.fetchCatalog();
  }

  getCatalog(): readonly WarehouseOption[] {
    return this.catalog();
  }

  isLoaded(): boolean {
    return this.catalog().length > 0;
  }

  fetchWarehouses(): Observable<WarehouseOption[]> {
    return this.ensureLoaded();
  }

  formatLabel(warehouse: WarehouseOption): string {
    const code = warehouse.warehouseCode.trim();
    const name = warehouse.warehouseName.trim();
    if (code && name) {
      return `${code} — ${name}`;
    }
    return code || name;
  }

  search(term: string): WarehouseOption[] {
    const query = term.trim().toLowerCase();
    const catalog = this.catalog();
    if (!query) {
      return [...catalog];
    }
    return catalog.filter(
      (warehouse) =>
        warehouse.warehouseCode.toLowerCase().includes(query) ||
        warehouse.warehouseName.toLowerCase().includes(query),
    );
  }

  private fetchCatalog(): Observable<WarehouseOption[]> {
    if (!this.load$) {
      this.load$ = this.http.get<unknown>(apiUrl('warehouses')).pipe(
        map((response) => this.parseWarehouses(response)),
        tap((records) => {
          this.catalog.set(records);
          if (records.length === 0) {
            this.load$ = undefined;
          }
        }),
        catchError((error) => {
          this.load$ = undefined;
          this.catalog.set([]);
          return throwError(() => error);
        }),
        shareReplay(1),
      );
    }

    return this.load$;
  }

  private parseWarehouses(response: unknown): WarehouseOption[] {
    return this.extractApiItems(response)
      .map((item) => this.mapItem(item))
      .filter((warehouse) => warehouse.warehouseCode.trim() !== '')
      .sort((left, right) =>
        left.warehouseName.localeCompare(right.warehouseName, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );
  }

  private extractApiItems(response: unknown): Array<Record<string, unknown>> {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response.filter(
        (item): item is Record<string, unknown> => !!item && typeof item === 'object',
      );
    }

    if (typeof response !== 'object') {
      return [];
    }

    const obj = response as Record<string, unknown>;

    if (obj['status'] === false) {
      return [];
    }

    const arrayKeys = ['data', 'items', 'results', 'records', 'list', 'warehouses'];

    for (const key of arrayKeys) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter(
          (item): item is Record<string, unknown> => !!item && typeof item === 'object',
        );
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
      obj['warehouseCode'] ||
      obj['warehouse_code'] ||
      obj['WarehouseCode'] ||
      obj['Code'] ||
      obj['code'] ||
      obj['WhsCode'] ||
      obj['name'] ||
      obj['Name']
    ) {
      return [obj];
    }

    return [];
  }

  private mapItem(item: Record<string, unknown>): WarehouseOption {
    return {
      warehouseCode: this.pickString([item], [
        'Code',
        'WarehouseCode',
        'warehouseCode',
        'warehouse_code',
        'code',
        'WhsCode',
        'whs_code',
      ]),
      warehouseName: this.pickString([item], [
        'Name',
        'WarehouseName',
        'warehouseName',
        'warehouse_name',
        'name',
        'WhsName',
        'whs_name',
        'description',
      ]),
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
}
