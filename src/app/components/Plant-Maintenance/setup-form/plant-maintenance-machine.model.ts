export interface SapMachineRecord {
  machineId: string;
  machineName: string;
  defaultMachineType: string;
}

export type MachineSearchOption = SapMachineRecord;

/** SAP machine master — populate from API when available. */
export const SAP_MACHINE_MASTER: SapMachineRecord[] = [];

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

/** Resolve entered values to SAP master when ID or name matches. */
export function resolveMachineIdentity(machineId: string, machineName: string): MachineIdentity {
  const idKey = machineId.trim().toLowerCase();
  const nameKey = machineName.trim().toLowerCase();
  const sap = SAP_MACHINE_MASTER.find(
    (m) => m.machineId.toLowerCase() === idKey || m.machineName.toLowerCase() === nameKey,
  );
  if (sap) {
    return { machineId: sap.machineId, machineName: sap.machineName };
  }
  return { machineId: machineId.trim(), machineName: machineName.trim() };
}

export interface SapSparePartRecord {
  sparePartId: string;
  sparePartDescription: string;
  defaultUomCode: string;
}

export type SparePartSearchOption = SapSparePartRecord;

/** SAP spare parts master — populate from API when available. */
export const SAP_SPARE_PARTS_MASTER: SapSparePartRecord[] = [];

export interface SparePartIdentity {
  sparePartId: string;
  sparePartDescription: string;
}

export function resolveSparePartIdentity(
  sparePartId: string,
  sparePartDescription: string,
): SparePartIdentity {
  const idKey = sparePartId.trim().toLowerCase();
  const descKey = sparePartDescription.trim().toLowerCase();
  const sap = SAP_SPARE_PARTS_MASTER.find(
    (p) =>
      p.sparePartId.toLowerCase() === idKey ||
      p.sparePartDescription.toLowerCase() === descKey,
  );
  if (sap) {
    return {
      sparePartId: sap.sparePartId,
      sparePartDescription: sap.sparePartDescription,
    };
  }
  return {
    sparePartId: sparePartId.trim(),
    sparePartDescription: sparePartDescription.trim(),
  };
}

export interface SapWarehouseRecord {
  warehouseCode: string;
  warehouseName: string;
}

/** SAP warehouse master — populate from API when available. */
export const SAP_WAREHOUSE_MASTER: SapWarehouseRecord[] = [];

export interface SapUomRecord {
  uomCode: string;
  uomDescription: string;
}

/** SAP unit of measure master — populate from API when available. */
export const SAP_UOM_MASTER: SapUomRecord[] = [];

