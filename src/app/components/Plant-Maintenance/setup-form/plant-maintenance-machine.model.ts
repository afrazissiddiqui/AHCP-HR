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

/** Same machine if ID or name matches (case-insensitive). */
export function isSameMachine(a: MachineIdentity, b: MachineIdentity): boolean {
  const aId = a.machineId.trim().toLowerCase();
  const aName = a.machineName.trim().toLowerCase();
  const bId = b.machineId.trim().toLowerCase();
  const bName = b.machineName.trim().toLowerCase();
  if (!aId && !aName) {
    return false;
  }
  return (!!aId && aId === bId) || (!!aName && aName === bName);
}
