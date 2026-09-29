import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, concat, map, of, switchMap, tap } from 'rxjs';
import {
  ApplicationFormRecord,
  ApplicationFormService,
  canonicalizeEmployeeCodeValue,
} from './application-form.service';
import { formatIsoDate } from './attendance-management.service';

export interface OvertimeListRecord {
  id: string | number;
  employeeId: string;
  extEmpNo: string;
  employeeName: string;
  shift: string;
  shiftLookupLoading: boolean;
  shiftLookupFailed: boolean;
  department: string;
  branch: string;
  reportingManager: string;
  overtimeHours: number;
  overtimeRate: number;
  exceptionalOt: number;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class OvertimeListService {
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly overtimeListSignal = signal<OvertimeListRecord[]>([]);
  private cachedRecords: OvertimeListRecord[] | null = null;

  readonly overtimeList = this.overtimeListSignal.asReadonly();

  fetchOvertimeList(forceRefresh = false): Observable<OvertimeListRecord[]> {
    if (!forceRefresh && this.cachedRecords) {
      return of(this.cachedRecords);
    }

    const cachedProfiles = forceRefresh ? [] : this.applicationFormService.getApplicationRecords();
    const cachedRows = cachedProfiles.length
      ? of(cachedProfiles
          .filter((record) => this.isOvertimeApplicable(record))
          .map((record) => this.mapEmployee(record, new Map(), false, true)))
      : EMPTY;
    const refreshedRows = this.applicationFormService.fetchEmployeeProfiles().pipe(
      switchMap((profiles) => {
        const applicableProfiles = profiles.filter((record) => this.isOvertimeApplicable(record));
        const loadingRows = applicableProfiles.map((record) =>
          this.mapEmployee(record, new Map(), false, true),
        );

        const rosterRows = this.applicationFormService.fetchEmployeeRosterList().pipe(
          map((roster) => ({ roster, failed: false })),
          catchError(() => of({ roster: [], failed: true })),
          map(({ roster, failed }) => {
            const shiftsByEmployee = new Map<string, Set<string>>();
            const currentDate = formatIsoDate(new Date());
            for (const rosterRecord of roster) {
              if (rosterRecord.shift_date.slice(0, 10) !== currentDate) {
                continue;
              }
              const employeeCode = this.normalizeEmployeeCode(rosterRecord.employee_id);
              const shift = rosterRecord.shift.trim();
              if (!employeeCode || !shift || ['+', 'null', 'undefined'].includes(shift.toLowerCase())) {
                continue;
              }
              const shifts = shiftsByEmployee.get(employeeCode) ?? new Set<string>();
              shifts.add(shift);
              shiftsByEmployee.set(employeeCode, shifts);
            }

            return applicableProfiles.map((record) =>
              this.mapEmployee(record, shiftsByEmployee, failed, false),
            );
          }),
        );

        return concat(of(loadingRows), rosterRows);
      }),
    );

    return concat(cachedRows, refreshedRows).pipe(
      tap((records) => {
        if (!records.some((record) => record.shiftLookupLoading)) {
          this.cachedRecords = records;
        }
        this.overtimeListSignal.set(records);
      }),
    );
  }

  private mapEmployee(
    record: ApplicationFormRecord,
    shiftsByEmployee: Map<string, Set<string>>,
    shiftLookupFailed: boolean,
    shiftLookupLoading: boolean,
  ): OvertimeListRecord {
    const employeeCode = this.normalizeEmployeeCode(record.EmployeeCode);
    return {
      id: record.apiId || record.EmployeeCode,
      employeeId: record.EmployeeCode,
      extEmpNo: record.ExtEmpNo?.trim() || '',
      employeeName: record.EmployeeName || record.detail?.personalInfo.personName || '',
      shift: [...(shiftsByEmployee.get(employeeCode) ?? [])].join(', '),
      shiftLookupLoading,
      shiftLookupFailed,
      department: record.Department,
      branch: record.detail?.personalInfo.branchLocation ?? '',
      reportingManager: record.ReportingManager,
      overtimeHours: 0,
      overtimeRate: 0,
      exceptionalOt: 0,
    };
  }

  private normalizeEmployeeCode(value: string): string {
    return canonicalizeEmployeeCodeValue(value).trim().toLowerCase();
  }

  private isOvertimeApplicable(record: ApplicationFormRecord): boolean {
    return record.detail?.remuneration.overTimeApplicable.trim().toLowerCase() === 'yes'
      && record.detail?.hrSettings.attendanceShiftManagement.trim().toLowerCase() === 'yes';
  }
}
