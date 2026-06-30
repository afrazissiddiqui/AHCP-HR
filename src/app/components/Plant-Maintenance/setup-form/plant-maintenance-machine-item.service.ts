import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { apiUrl } from '../../../config/api.config';
import { MachineSearchOption } from './plant-maintenance-machine.model';

const ITEMS_URL = apiUrl('items');
const MACHINE_ITEM_TYPE = 'F';

@Injectable({ providedIn: 'root' })
export class PlantMaintenanceMachineItemService {
  private readonly http = inject(HttpClient);
  private readonly machines = signal<MachineSearchOption[]>([]);
  private loaded = false;
  private loading = false;
  private load$?: Observable<MachineSearchOption[]>;

  readonly records = this.machines.asReadonly();

  ensureLoaded(): Observable<MachineSearchOption[]> {
    if (this.loaded) {
      return of(this.machines());
    }

    if (!this.load$) {
      this.loading = true;
      this.load$ = this.http.get<unknown>(ITEMS_URL).pipe(
        map((response) => this.extractMachineItems(response)),
        tap((records) => {
          this.machines.set(records);
          this.loaded = true;
          this.loading = false;
        }),
        catchError(() => {
          this.machines.set([]);
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

  searchByMachineId(query: string, limit = 10): MachineSearchOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.machines()
      .filter((machine) => machine.machineId.toLowerCase().includes(q))
      .slice(0, limit);
  }

  searchByMachineName(query: string, limit = 10): MachineSearchOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.machines()
      .filter((machine) => machine.machineName.toLowerCase().includes(q))
      .slice(0, limit);
  }

  private extractMachineItems(response: unknown): MachineSearchOption[] {
    return this.extractApiItems(response)
      .map((item) => this.mapMachineItem(item))
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

  private mapMachineItem(item: Record<string, unknown>): MachineSearchOption | null {
    const itemType = this.pickString([item], ['ItemType', 'itemType', 'item_type']);
    if (itemType.toUpperCase() !== MACHINE_ITEM_TYPE) {
      return null;
    }

    const machineId = this.pickString([item], ['itemCode', 'item_code', 'ItemCode', 'code', 'Code']);
    if (!machineId) {
      return null;
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
      defaultMachineType: this.pickString([item], [
        'machineType',
        'machine_type',
        'MachineType',
        'itemsGroupName',
        'ItemsGroupName',
        'items_group_name',
        'category',
        'Category',
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
