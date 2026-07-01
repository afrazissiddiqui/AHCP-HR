import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { apiUrl } from '../../../../config/api.config';
import { PlantMaintenanceMachineRecordBase } from '../plant-maintenance-machine.model';

export interface SubComponentMachineRecord extends PlantMaintenanceMachineRecordBase {
  subComponents: string[];
}

export interface MachineSubComponentPayload {
  name: string;
}

export interface MachinePayload {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  sub_components: MachineSubComponentPayload[];
}

export interface MachineInput {
  machineId: string;
  machineName: string;
  /** Resolved from SAP item or existing record; required by API, not shown in the form. */
  machineType?: string;
  subComponents: string[];
}

export interface MachineApiResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

const MACHINE_LIST_URL = apiUrl('machine-list');
const MACHINE_ADD_URL = apiUrl('machine-add');
const MACHINE_DETAIL_URL = apiUrl('machine-detail');
const MACHINE_UPDATE_URL = apiUrl('machine-update');
const MACHINE_DELETE_URL = apiUrl('machine-delete');

export function buildMachinePayload(entry: MachineInput): MachinePayload {
  return {
    machine_id: entry.machineId.trim(),
    machine_name: entry.machineName.trim(),
    machine_type: (entry.machineType ?? '').trim(),
    sub_components: entry.subComponents
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name })),
  };
}

@Injectable({ providedIn: 'root' })
export class SubComponentDefinitionService {
  private readonly http = inject(HttpClient);
  private readonly _records = signal<SubComponentMachineRecord[]>([]);

  readonly records = this._records.asReadonly();

  fetchMachines(): Observable<SubComponentMachineRecord[]> {
    return this.http.get<unknown>(MACHINE_LIST_URL).pipe(
      map((response) =>
        this.extractApiItems(response)
          .filter((item) => !this.isSoftDeletedRecord(item))
          .map((item) => this.mapApiItemToRecord(item)),
      ),
      tap((records) => this._records.set(records)),
    );
  }

  fetchMachineDetail(id: string | number): Observable<SubComponentMachineRecord> {
    const identifier = encodeURIComponent(String(id));
    return this.http.get<unknown>(`${MACHINE_DETAIL_URL}/${identifier}`).pipe(
      map((response) => this.mapDetailResponse(response, id)),
    );
  }

  addMachine(entry: MachineInput): Observable<MachineApiResponse> {
    return this.http.post<MachineApiResponse>(MACHINE_ADD_URL, buildMachinePayload(entry));
  }

  updateMachine(id: string | number, entry: MachineInput): Observable<MachineApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.post<MachineApiResponse>(
      `${MACHINE_UPDATE_URL}/${identifier}`,
      buildMachinePayload(entry),
    );
  }

  deleteMachine(id: string | number): Observable<MachineApiResponse> {
    const identifier = encodeURIComponent(String(id));
    return this.http.delete<MachineApiResponse>(`${MACHINE_DELETE_URL}/${identifier}`);
  }

  removeMachineRecord(record: SubComponentMachineRecord): void {
    this._records.update((list) => list.filter((item) => item.id !== record.id));
  }

  updateSelection(id: string, selected: boolean): void {
    this._records.update((list) =>
      list.map((r) => (r.id === id ? { ...r, selected } : r)),
    );
  }

  setAllSelected(selected: boolean, ids?: string[]): void {
    const idSet = ids ? new Set(ids) : null;
    this._records.update((list) =>
      list.map((r) => ({
        ...r,
        selected: idSet ? (idSet.has(r.id) ? selected : r.selected) : selected,
      })),
    );
  }

  getById(id: string): SubComponentMachineRecord | undefined {
    return this._records().find((r) => r.id === id);
  }

  getByMachineId(machineId: string): SubComponentMachineRecord | undefined {
    const key = machineId.trim().toLowerCase();
    if (!key) {
      return undefined;
    }
    return this._records().find((r) => r.machineId.trim().toLowerCase() === key);
  }

  hasDuplicateMachineId(machineId: string, excludeId?: string): boolean {
    const key = machineId.trim().toLowerCase();
    if (!key) {
      return false;
    }

    return this._records().some(
      (record) =>
        record.machineId.trim().toLowerCase() === key &&
        record.id !== excludeId,
    );
  }

  private mapDetailResponse(response: unknown, id: string | number): SubComponentMachineRecord {
    const items = this.extractApiItems(response);
    if (items.length > 0) {
      return this.mapApiItemToRecord(items[0]);
    }

    if (response && typeof response === 'object') {
      const record = this.mapApiItemToRecord(response as Record<string, unknown>);
      if (!record.id) {
        return { ...record, id: String(id) };
      }
      return record;
    }

    throw new Error('Machine record not found');
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
      'machines',
      'machine_list',
      'machineList',
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
      obj['machine_id'] ||
      obj['machineId'] ||
      obj['machine_name'] ||
      obj['machineName']
    ) {
      return [obj];
    }

    return [];
  }

  private isSoftDeletedRecord(item: Record<string, unknown>): boolean {
    const deletedAt = item['deleted_at'] ?? item['deletedAt'] ?? item['DeletedAt'];
    if (deletedAt !== undefined && deletedAt !== null && String(deletedAt).trim() !== '') {
      return true;
    }

    const isDeleted = item['is_deleted'] ?? item['isDeleted'] ?? item['IsDeleted'];
    if (isDeleted === true || isDeleted === 1 || isDeleted === '1') {
      return true;
    }

    const deleted = item['deleted'] ?? item['Deleted'];
    if (deleted === true || deleted === 1 || deleted === '1') {
      return true;
    }

    const status = item['status'] ?? item['Status'];
    if (status === 0 || status === '0' || status === 'deleted' || status === 'Deleted') {
      return true;
    }

    const isActive = item['is_active'] ?? item['isActive'] ?? item['IsActive'];
    if (isActive === false || isActive === 0 || isActive === '0') {
      return true;
    }

    return false;
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

  private mapSubComponents(item: Record<string, unknown>): string[] {
    const raw = item['sub_components'] ?? item['subComponents'] ?? item['SubComponents'];
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim();
        }
        if (entry && typeof entry === 'object') {
          const component = entry as Record<string, unknown>;
          return this.pickString([component], ['name', 'Name', 'sub_component', 'subComponent']);
        }
        return '';
      })
      .filter(Boolean);
  }

  private mapApiItemToRecord(item: Record<string, unknown>): SubComponentMachineRecord {
    const sources = [item];
    const id = this.pickString(sources, ['id', 'Id', 'machine_record_id', 'machineRecordId']);

    return {
      id,
      machineId: this.pickString(sources, ['machine_id', 'machineId', 'MachineId']) || '—',
      machineName: this.pickString(sources, ['machine_name', 'machineName', 'MachineName']) || '—',
      machineType: this.pickString(sources, ['machine_type', 'machineType', 'MachineType']) || '—',
      subComponents: this.mapSubComponents(item),
      selected: false,
    };
  }
}
