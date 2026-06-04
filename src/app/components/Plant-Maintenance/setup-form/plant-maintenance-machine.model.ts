export interface SapMachineRecord {
  machineId: string;
  machineName: string;
  defaultMachineType: string;
}

export type MachineSearchOption = SapMachineRecord;

/** Mock SAP machine master — replace with API integration when available. */
export const SAP_MACHINE_MASTER: SapMachineRecord[] = [
  { machineId: 'SAP-PM-001', machineName: 'H1', defaultMachineType: 'Injection' },
  { machineId: 'SAP-PM-002', machineName: 'H2', defaultMachineType: 'Injection' },
  { machineId: 'SAP-PM-003', machineName: 'H3', defaultMachineType: 'Blowing' },
  { machineId: 'SAP-PM-004', machineName: 'H4', defaultMachineType: 'Blowing' },
  { machineId: 'SAP-PM-005', machineName: 'H5', defaultMachineType: 'Auxiliaries' },
];

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

/** Mock SAP spare parts master — replace with API integration when available. */
export const SAP_SPARE_PARTS_MASTER: SapSparePartRecord[] = [
  { sparePartId: 'SP-10001', sparePartDescription: 'Hydraulic Filter', defaultUomCode: 'EA' },
  { sparePartId: 'SP-10002', sparePartDescription: 'Drive Belt', defaultUomCode: 'EA' },
  { sparePartId: 'SP-10003', sparePartDescription: 'Lubrication Oil 20L', defaultUomCode: 'L' },
  { sparePartId: 'SP-10004', sparePartDescription: 'Heater Cartridge', defaultUomCode: 'EA' },
  { sparePartId: 'SP-10005', sparePartDescription: 'Seal Kit', defaultUomCode: 'SET' },
];

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

/** Mock SAP warehouse master — replace with API integration when available. */
export const SAP_WAREHOUSE_MASTER: SapWarehouseRecord[] = [
  { warehouseCode: 'WH-01', warehouseName: 'Main Plant Store' },
  { warehouseCode: 'WH-02', warehouseName: 'Injection Spares' },
  { warehouseCode: 'WH-03', warehouseName: 'Blowing Spares' },
  { warehouseCode: 'WH-04', warehouseName: 'Central Maintenance' },
];

export interface SapUomRecord {
  uomCode: string;
  uomDescription: string;
}

/** Mock SAP unit of measure master — replace with API integration when available. */
export const SAP_UOM_MASTER: SapUomRecord[] = [
  { uomCode: 'EA', uomDescription: 'Each' },
  { uomCode: 'L', uomDescription: 'Liter' },
  { uomCode: 'KG', uomDescription: 'Kilogram' },
  { uomCode: 'M', uomDescription: 'Meter' },
  { uomCode: 'SET', uomDescription: 'Set' },
];

