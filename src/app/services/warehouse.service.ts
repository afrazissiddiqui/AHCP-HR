import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export interface WarehouseOption {
  warehouseCode: string;
  warehouseName: string;
}

const WAREHOUSES_URL = apiUrl('warehouses');

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private readonly http = inject(HttpClient);
  private readonly _warehouses = signal<WarehouseOption[]>([]);
  private loaded = false;
  private load$?: Observable<WarehouseOption[]>;

  readonly warehouses = this._warehouses.asReadonly();

  fetchWarehouses(): Observable<WarehouseOption[]> {
    if (this.loaded) {
      return of(this._warehouses());
    }

    if (!this.load$) {
      this.load$ = this.http.get<unknown>(WAREHOUSES_URL).pipe(
        map((response) =>
          this.extractApiItems(response)
            .map((item) => this.mapItem(item))
            .filter((warehouse) => warehouse.warehouseCode),
        ),
        tap((records) => {
          this._warehouses.set(records);
          this.loaded = true;
        }),
        catchError(() => {
          this._warehouses.set([]);
          this.loaded = true;
          return of([]);
        }),
      );
    }

    return this.load$;
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
      obj['code'] ||
      obj['WhsCode'] ||
      obj['name']
    ) {
      return [obj];
    }

    return [];
  }

  private mapItem(item: Record<string, unknown>): WarehouseOption {
    return {
      warehouseCode: this.pickString([
        item,
      ], [
        'warehouseCode',
        'warehouse_code',
        'WarehouseCode',
        'code',
        'Code',
        'WhsCode',
        'whs_code',
      ]),
      warehouseName: this.pickString([
        item,
      ], [
        'warehouseName',
        'warehouse_name',
        'WarehouseName',
        'name',
        'Name',
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
