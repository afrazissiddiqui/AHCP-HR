export interface SapMachineRecord {
  machineId: string;
  machineName: string;
  defaultMachineType: string;
}

export type MachineSearchOption = SapMachineRecord;

export function toMachineSearchOptions(
  records: { machineId: string; machineName: string; machineType?: string }[],
): MachineSearchOption[] {
  return records.map((record) => ({
    machineId: record.machineId,
    machineName: record.machineName,
    defaultMachineType: record.machineType ?? '',
  }));
}

export interface PlantMaintenanceMachineRecordBase {
  id: string;
  machineId: string;
  machineName: string;
  machineType: string;
  selected: boolean;
}

export interface MachineIdentity {
  machineId: string;
  machineName: string;
}

export function resolveMachineIdentity(machineId: string, machineName: string): MachineIdentity {
  return { machineId: machineId.trim(), machineName: machineName.trim() };
}

export interface SapSparePartRecord {
  sparePartId: string;
  sparePartDescription: string;
  defaultUomCode: string;
}

export type SparePartSearchOption = SapSparePartRecord;

export interface SparePartIdentity {
  sparePartId: string;
  sparePartDescription: string;
}

export function resolveSparePartIdentity(
  sparePartId: string,
  sparePartDescription: string,
): SparePartIdentity {
  return {
    sparePartId: sparePartId.trim(),
    sparePartDescription: sparePartDescription.trim(),
  };
}

export interface SapWarehouseRecord {
  warehouseCode: string;
  warehouseName: string;
}

export interface SapUomRecord {
  uomCode: string;
  uomDescription: string;
}
