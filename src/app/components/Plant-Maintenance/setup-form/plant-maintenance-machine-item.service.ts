import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { apiUrl } from '../../../config/api.config';
import { MachineSearchOption } from './plant-maintenance-machine.model';

const ITEMS_URL = apiUrl('items');
const DEFAULT_MACHINE_ITEM_TYPE = 'F';

interface ItemTypeCache {
  machines: ReturnType<typeof signal<MachineSearchOption[]>>;
  loaded: boolean;
  loading: boolean;
  load$?: Observable<MachineSearchOption[]>;
}

@Injectable({ providedIn: 'root' })
export class PlantMaintenanceMachineItemService {
  private readonly http = inject(HttpClient);
  private readonly caches = new Map<string, ItemTypeCache>();

  records(itemType = DEFAULT_MACHINE_ITEM_TYPE) {
    return this.getCache(itemType).machines.asReadonly();
  }

  ensureLoaded(itemType = DEFAULT_MACHINE_ITEM_TYPE): Observable<MachineSearchOption[]> {
    const cache = this.getCache(itemType);

    if (cache.loaded) {
      return of(cache.machines());
    }

    if (!cache.load$) {
      cache.loading = true;
      cache.load$ = this.http.get<unknown>(ITEMS_URL).pipe(
        map((response) => this.extractMachineItems(response, itemType)),
        tap((records) => {
          cache.machines.set(records);
          cache.loaded = true;
          cache.loading = false;
        }),
        catchError(() => {
          cache.machines.set([]);
          cache.loaded = true;
          cache.loading = false;
          return of([]);
        }),
      );
    }

    return cache.load$;
  }

  isLoading(itemType = DEFAULT_MACHINE_ITEM_TYPE): boolean {
    return this.getCache(itemType).loading;
  }

  getAll(itemType = DEFAULT_MACHINE_ITEM_TYPE): MachineSearchOption[] {
    return this.getCache(itemType).machines();
  }

  searchByMachineId(query: string, itemType = DEFAULT_MACHINE_ITEM_TYPE, limit = 10): MachineSearchOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.getCache(itemType)
      .machines()
      .filter((machine) => machine.machineId.toLowerCase().includes(q))
      .slice(0, limit);
  }

  searchByMachineName(query: string, itemType = DEFAULT_MACHINE_ITEM_TYPE, limit = 10): MachineSearchOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.getCache(itemType)
      .machines()
      .filter((machine) => machine.machineName.toLowerCase().includes(q))
      .slice(0, limit);
  }

  private getCache(itemType: string): ItemTypeCache {
    const key = itemType.toUpperCase();
    let cache = this.caches.get(key);
    if (!cache) {
      cache = {
        machines: signal<MachineSearchOption[]>([]),
        loaded: false,
        loading: false,
      };
      this.caches.set(key, cache);
    }
    return cache;
  }

  private extractMachineItems(response: unknown, itemType: string): MachineSearchOption[] {
    return this.extractApiItems(response)
      .map((item) => this.mapMachineItem(item, itemType))
      .filter((machine): machine is MachineSearchOption => !!machine);
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

    if (
      obj['itemCode'] ||
      obj['item_code'] ||
      obj['ItemCode'] ||
      obj['code'] ||
      obj['name']
    ) {
      return [obj];
    }

    return [];
  }

  private mapMachineItem(item: Record<string, unknown>, itemType: string): MachineSearchOption | null {
    const resolvedItemType = this.pickString([item], ['ItemType', 'itemType', 'item_type']);
    if (resolvedItemType.toUpperCase() !== itemType.toUpperCase()) {
      return null;
    }

    const machineId = this.pickString([item], ['itemCode', 'item_code', 'ItemCode', 'code', 'Code']);
    if (!machineId) {
      return null;
    }

    let defaultMachineType = this.pickString([item], [
      'machineType',
      'machine_type',
      'MachineType',
      'itemsGroupName',
      'ItemsGroupName',
      'items_group_name',
      'itemsGroupCode',
      'ItemsGroupCode',
      'items_group_code',
      'category',
      'Category',
    ]);

    if (!defaultMachineType) {
      defaultMachineType = resolvedItemType;
    }

    return {
      machineId,
      machineName: this.pickString([item], [
        'itemName',
        'item_name',
        'ItemName',
        'name',
        'Name',
        'description',
        'Description',
      ]),
      defaultMachineType,
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
