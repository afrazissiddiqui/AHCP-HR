import { Injectable, signal } from '@angular/core';
import { PlantMaintenanceMachineRecordBase } from '../plant-maintenance-machine.model';

export interface PlantMaintenanceMasterLineAttachment {
  fileName: string;
  dataUrl: string;
}

export interface PlantMaintenanceMasterInspectionLine {
  itemsToBeInspected: string;
  whatToCheck: string;
  instructions: string;
  status: string;
  recommendation: string;
  attachments: PlantMaintenanceMasterLineAttachment[];
}

export interface PlantMaintenanceMasterComponent {
  name: string;
  inspectionLines: PlantMaintenanceMasterInspectionLine[];
}

export interface PlantMaintenanceMasterSparePartLine {
  sparePartId: string;
  sparePartDescription: string;
  quantity: number | null;
  warehouseCode: string;
  uomCode: string;
}

export interface PlantMaintenanceMasterRecord extends PlantMaintenanceMachineRecordBase {
  maintenanceNature: string;
  plantMaintenanceFrequency: string;
  plantMaintenanceType: string;
  startDate: string;
  endDate: string;
  duration: number | null;
  spareParts: PlantMaintenanceMasterSparePartLine[];
  remarks: string;
  components: PlantMaintenanceMasterComponent[];
}

@Injectable({ providedIn: 'root' })
export class PlantMaintenanceMasterFormService {
  private readonly _records = signal<PlantMaintenanceMasterRecord[]>([]);

  readonly records = this._records.asReadonly();

  addRecord(
    entry: Omit<PlantMaintenanceMasterRecord, 'id' | 'selected'>,
  ): PlantMaintenanceMasterRecord {
    const record: PlantMaintenanceMasterRecord = {
      ...entry,
      id: `PMM-${Date.now()}`,
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

  getById(id: string): PlantMaintenanceMasterRecord | undefined {
    return this._records().find((r) => r.id === id);
  }

  updateRecord(
    id: string,
    entry: Omit<PlantMaintenanceMasterRecord, 'id' | 'selected'>,
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

  hasDuplicateProfile(
    entry: Omit<PlantMaintenanceMasterRecord, 'id' | 'selected' | 'remarks' | 'components'>,
    excludeId?: string,
  ): boolean {
    return this._records().some((r) => {
      if (r.id === excludeId) {
        return false;
      }
      return (
        r.machineId.trim().toLowerCase() === entry.machineId.trim().toLowerCase() &&
        r.machineName.trim().toLowerCase() === entry.machineName.trim().toLowerCase() &&
        r.machineType.trim().toLowerCase() === entry.machineType.trim().toLowerCase() &&
        r.maintenanceNature.trim().toLowerCase() === entry.maintenanceNature.trim().toLowerCase() &&
        r.plantMaintenanceFrequency.trim().toLowerCase() ===
          entry.plantMaintenanceFrequency.trim().toLowerCase() &&
        r.plantMaintenanceType.trim().toLowerCase() ===
          entry.plantMaintenanceType.trim().toLowerCase()
      );
    });
  }
}
