import { Injectable, signal } from '@angular/core';

export interface SapMachineRecord {
  machineId: string;
  machineName: string;
  defaultMachineType: string;
}

export type MachineSearchOption = SapMachineRecord;

export interface SubComponentMachineRecord {
  id: string;
  machineId: string;
  machineName: string;
  machineType: string;
  subComponents: string[];
  selected: boolean;
}

/** Mock SAP machine master — replace with API integration when available. */
export const SAP_MACHINE_MASTER: SapMachineRecord[] = [
  { machineId: 'SAP-PM-001', machineName: 'H1', defaultMachineType: 'Injection' },
  { machineId: 'SAP-PM-002', machineName: 'H2', defaultMachineType: 'Injection' },
  { machineId: 'SAP-PM-003', machineName: 'H3', defaultMachineType: 'Blowing' },
  { machineId: 'SAP-PM-004', machineName: 'H4', defaultMachineType: 'Blowing' },
  { machineId: 'SAP-PM-005', machineName: 'H5', defaultMachineType: 'Auxiliaries' },
];

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
