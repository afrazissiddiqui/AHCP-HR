import { Injectable, signal } from '@angular/core';

export type HuskyFormStatus = 'Draft' | 'Submitted' | 'In Review' | 'Approved' | 'Rejected';

export type HuskyKpiStatus = 'Pass' | 'Warning' | 'Fail' | '';

export interface HuskyKpiRow {
  key: string;
  label: string;
  formulaLabel: string;
  issuesScore: number | null;
  maxPossibleScore: number | null;
  notes: string;
}

export const HUSKY_KPI_ROW_DEFINITIONS: ReadonlyArray<{
  key: string;
  label: string;
  formulaLabel: string;
}> = [
  {
    key: 'safety',
    label: 'Safety',
    formulaLabel: 'Safety Issues Score / Safety Max Possible Score × 100',
  },
  {
    key: 'hydraulic',
    label: 'Hydraulic',
    formulaLabel: 'Hydraulic Issues Score / Hydraulic Possible Score × 100',
  },
  {
    key: 'mechanical',
    label: 'Mechanical',
    formulaLabel: 'Mechanical Issues Score / Mechanical Possible Score × 100',
  },
  {
    key: 'geometry',
    label: 'Geometry',
    formulaLabel: 'Geometry Issues Score / Geometry Possible Score × 100',
  },
  {
    key: 'robot-conveyor',
    label: 'Robot and Conveyor',
    formulaLabel: 'Issues Score / Possible Score × 100',
  },
];

export function createEmptyHuskyKpiRows(): HuskyKpiRow[] {
  return HUSKY_KPI_ROW_DEFINITIONS.map((row) => ({
    key: row.key,
    label: row.label,
    formulaLabel: row.formulaLabel,
    issuesScore: null,
    maxPossibleScore: null,
    notes: '',
  }));
}

export function resolveHuskyKpiStatus(percentage: number | null): HuskyKpiStatus {
  if (percentage === null) {
    return '';
  }
  if (percentage <= 30) {
    return 'Pass';
  }
  if (percentage <= 60) {
    return 'Warning';
  }
  return 'Fail';
}

export type HuskyCheckpointEvaluation = 'Pass' | 'Fail' | 'N/A' | '';

export interface HuskySafetyCheckpoint {
  key: string;
  checkpoint: string;
  evaluation: HuskyCheckpointEvaluation;
  recommendation: string;
}

export const HUSKY_SAFETY_CHECKPOINT_DEFINITIONS: ReadonlyArray<{
  key: string;
  checkpoint: string;
}> = [
  {
    key: 'low-air-pressure-alarm',
    checkpoint:
      'Check low air pressure alarm stops cycle; verify alarm on screen',
  },
  {
    key: 'e-stop-power',
    checkpoint:
      'E-stop interrupts all power, shuts off pump, dumps accumulators',
  },
  {
    key: 'alarm-light-horn',
    checkpoint: 'Alarm light and horn sounds during alarm condition',
  },
  {
    key: 'safety-signs',
    checkpoint:
      'Safety signs correctly installed, clean and readable at potential hazard',
  },
  {
    key: 'lockout-tagout',
    checkpoint:
      'Air supply valves and power cabinet breaker have lockout/tagout features',
  },
  {
    key: 'limit-proxy-switches',
    checkpoint: 'Limit and proxy switches in good condition and operate correctly',
  },
  {
    key: 'safety-glass',
    checkpoint: 'Safety glass not damaged',
  },
];

export function createEmptyHuskySafetyCheckpoints(): HuskySafetyCheckpoint[] {
  return HUSKY_SAFETY_CHECKPOINT_DEFINITIONS.map((row) => ({
    key: row.key,
    checkpoint: row.checkpoint,
    evaluation: '',
    recommendation: '',
  }));
}

export function calculateHuskyKpiPercentage(
  issuesScore: number | null,
  maxPossibleScore: number | null,
): number | null {
  if (
    issuesScore === null ||
    maxPossibleScore === null ||
    maxPossibleScore <= 0 ||
    issuesScore < 0
  ) {
    return null;
  }
  return Math.round((issuesScore / maxPossibleScore) * 10000) / 100;
}

export interface HuskyFormRecord {
  id: string;
  selected: boolean;
  machineId: string;
  machineName: string;
  maintenanceType: string;
  maintenanceFrequency: string;
  serialNo: string;
  moldNo: string;
  hotRunnerJobNo: string;
  hourMeterReading: string;
  robotSerialNo: string;
  inspector: string;
  inspectionDate: string;
  submitDate: string;
  documentNo: string;
  status: HuskyFormStatus;
  kpiRows: HuskyKpiRow[];
  safetyCheckpoints: HuskySafetyCheckpoint[];
}

export interface HuskyInspectorUser {
  userId: string;
  displayName: string;
}

/** Defined users available for inspector selection — replace with API when available. */
export const HUSKY_INSPECTOR_USERS: HuskyInspectorUser[] = [
  { userId: 'USR-001', displayName: 'Ahmed Khan' },
  { userId: 'USR-002', displayName: 'Sara Malik' },
  { userId: 'USR-003', displayName: 'Bilal Hussain' },
  { userId: 'USR-004', displayName: 'Fatima Noor' },
  { userId: 'USR-005', displayName: 'Omar Siddiqui' },
];

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable({ providedIn: 'root' })
export class HuskyFormService {
  private readonly _records = signal<HuskyFormRecord[]>([]);
  private documentSequence = 0;

  readonly records = this._records.asReadonly();

  addRecord(
    entry: Omit<HuskyFormRecord, 'id' | 'selected' | 'submitDate' | 'documentNo' | 'status'>,
  ): HuskyFormRecord {
    const now = new Date();
    const record: HuskyFormRecord = {
      ...entry,
      id: `HSK-REC-${Date.now()}`,
      selected: false,
      submitDate: formatDateValue(now),
      documentNo: this.generateDocumentNo(now),
      status: 'Submitted',
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

  getById(id: string): HuskyFormRecord | undefined {
    return this._records().find((r) => r.id === id);
  }

  updateRecord(
    id: string,
    entry: Omit<HuskyFormRecord, 'id' | 'selected' | 'submitDate' | 'documentNo' | 'status'>,
  ): boolean {
    const existing = this._records().find((r) => r.id === id);
    if (!existing) {
      return false;
    }
    this._records.update((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              ...entry,
              submitDate: r.submitDate || formatDateValue(new Date()),
              documentNo: r.documentNo || this.generateDocumentNo(new Date()),
              status: r.status === 'Draft' ? 'Submitted' : r.status,
            }
          : r,
      ),
    );
    return true;
  }

  deleteRecord(id: string): boolean {
    const before = this._records().length;
    this._records.update((list) => list.filter((r) => r.id !== id));
    return this._records().length < before;
  }

  private generateDocumentNo(date: Date): string {
    this.documentSequence += 1;
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const seq = String(this.documentSequence).padStart(4, '0');
    return `HSK-${ymd}-${seq}`;
  }
}
