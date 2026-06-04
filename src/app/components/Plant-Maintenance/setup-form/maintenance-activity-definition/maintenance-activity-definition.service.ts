import { Injectable, signal } from '@angular/core';
import {
  PlantMaintenanceMachineRecordBase,
  resolveMachineIdentity,
} from '../plant-maintenance-machine.model';

export interface MaintenanceActivityInspectionLine {
  itemsToBeInspected: string;
  whatToCheck: string;
  instructions: string;
}

export interface MaintenanceActivityComponent {
  name: string;
  inspectionLines: MaintenanceActivityInspectionLine[];
}

export interface MaintenanceActivityMachineRecord extends PlantMaintenanceMachineRecordBase {
  maintenanceNature: string;
  plantMaintenanceFrequency: string;
  plantMaintenanceType: string;
  components: MaintenanceActivityComponent[];
}

export interface MaintenanceActivityMatchCriteria {
  machineId: string;
  machineName?: string;
  machineType: string;
  maintenanceNature: string;
  plantMaintenanceFrequency: string;
  plantMaintenanceType: string;
}

type MaintenanceActivityProfileField =
  | 'machineType'
  | 'maintenanceNature'
  | 'plantMaintenanceFrequency'
  | 'plantMaintenanceType';

@Injectable({ providedIn: 'root' })
export class MaintenanceActivityDefinitionService {
  private readonly _records = signal<MaintenanceActivityMachineRecord[]>([]);

  readonly records = this._records.asReadonly();

  addRecord(
    entry: Omit<MaintenanceActivityMachineRecord, 'id' | 'selected'>,
  ): MaintenanceActivityMachineRecord {
    const record: MaintenanceActivityMachineRecord = {
      ...entry,
      id: `MAM-${Date.now()}`,
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

  getById(id: string): MaintenanceActivityMachineRecord | undefined {
    return this._records().find((r) => r.id === id);
  }

  getByMachineId(machineId: string): MaintenanceActivityMachineRecord | undefined {
    return this.getAllByMachineId(machineId)[0];
  }

  getAllByMachineId(machineId: string, machineName = ''): MaintenanceActivityMachineRecord[] {
    const identity = resolveMachineIdentity(machineId, machineName);
    const idKey = identity.machineId.toLowerCase();
    const nameKey = identity.machineName.toLowerCase();
    return this._records().filter((r) => {
      const existing = resolveMachineIdentity(r.machineId, r.machineName);
      return (
        existing.machineId.toLowerCase() === idKey ||
        existing.machineName.toLowerCase() === nameKey
      );
    });
  }

  findByCriteria(
    criteria: MaintenanceActivityMatchCriteria,
  ): MaintenanceActivityMachineRecord | undefined {
    const identity = resolveMachineIdentity(criteria.machineId, criteria.machineName ?? '');
    const idKey = identity.machineId.toLowerCase();
    const nameKey = identity.machineName.toLowerCase();
    return this._records().find((r) => {
      const existing = resolveMachineIdentity(r.machineId, r.machineName);
      const sameMachine =
        existing.machineId.toLowerCase() === idKey ||
        existing.machineName.toLowerCase() === nameKey;
      if (!sameMachine) {
        return false;
      }
      return (
        this.normalizeKey(r.machineType) === this.normalizeKey(criteria.machineType) &&
        this.normalizeKey(r.maintenanceNature) === this.normalizeKey(criteria.maintenanceNature) &&
        this.normalizeKey(r.plantMaintenanceFrequency) ===
          this.normalizeKey(criteria.plantMaintenanceFrequency) &&
        this.normalizeKey(r.plantMaintenanceType) ===
          this.normalizeKey(criteria.plantMaintenanceType)
      );
    });
  }

  getProfileFieldValues(
    records: MaintenanceActivityMachineRecord[],
    field: MaintenanceActivityProfileField,
    filters: Partial<Record<MaintenanceActivityProfileField, string>> = {},
  ): string[] {
    const filtered = records.filter((record) =>
      (Object.entries(filters) as Array<[MaintenanceActivityProfileField, string]>).every(
        ([key, value]) => !value.trim() || this.normalizeKey(record[key]) === this.normalizeKey(value),
      ),
    );
    const values = filtered.map((record) => record[field].trim()).filter(Boolean);
    return [...new Set(values)];
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase();
  }

  updateRecord(
    id: string,
    entry: Omit<MaintenanceActivityMachineRecord, 'id' | 'selected'>,
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

}

