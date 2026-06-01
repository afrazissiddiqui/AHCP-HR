import { Injectable, signal } from '@angular/core';
import { PlantMaintenanceMachineRecordBase } from '../plant-maintenance-machine.model';

export interface SubComponentMachineRecord extends PlantMaintenanceMachineRecordBase {
  subComponents: string[];
}

@Injectable({ providedIn: 'root' })
export class SubComponentDefinitionService {
  private readonly _records = signal<SubComponentMachineRecord[]>([]);

  readonly records = this._records.asReadonly();

  addRecord(entry: Omit<SubComponentMachineRecord, 'id' | 'selected'>): SubComponentMachineRecord {
    const record: SubComponentMachineRecord = {
      ...entry,
      id: `SCM-${Date.now()}`,
      selected: false,
    };
    this._records.update((list) => [...list, record]);
    return record;
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

  updateRecord(
    id: string,
    entry: Omit<SubComponentMachineRecord, 'id' | 'selected'>,
  ): boolean {
    const exists = this._records().some((r) => r.id === id);
    if (!exists) {
      return false;
    }
    this._records.update((list) =>
      list.map((r) => (r.id === id ? { ...r, ...entry, id, selected: r.selected } : r)),
    );
    return true;
  }

  deleteRecord(id: string): boolean {
    const before = this._records().length;
    this._records.update((list) => list.filter((r) => r.id !== id));
    return this._records().length < before;
  }

  hasDuplicateMachineId(machineId: string, excludeId?: string): boolean {
    const key = machineId.trim().toLowerCase();
    return this._records().some(
      (r) => r.machineId.trim().toLowerCase() === key && r.id !== excludeId,
    );
  }
}
