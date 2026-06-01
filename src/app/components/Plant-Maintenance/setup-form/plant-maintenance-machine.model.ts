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
