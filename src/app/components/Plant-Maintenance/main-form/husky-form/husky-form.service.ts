import { Injectable, signal } from '@angular/core';

export type HuskyFormStatus = 'Draft' | 'Submitted' | 'In Review' | 'Approved' | 'Rejected';

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
