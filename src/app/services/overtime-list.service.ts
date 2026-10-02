import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, catchError, concat, map, of, switchMap, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';
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

export interface OvertimeRecordPayload {
  employee_code: string;
  employee_name: string;
  overtime_date: string;
  shift_id: string;
  working_hours: number;
  shift_hours: number;
  overtime_hours: number;
  overtime_rate: number;
  exceptional_ot: number;
}

const OVERTIME_RECORD_ADD_URL = apiUrl('overtime-record-add');
const OVERTIME_RECORDS_URL = apiUrl('overtime-records');

@Injectable({
  providedIn: 'root',
})
export class OvertimeListService {
  private readonly http = inject(HttpClient);
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly overtimeListSignal = signal<OvertimeListRecord[]>([]);
  private cachedRecords: OvertimeListRecord[] | null = null;

  readonly overtimeList = this.overtimeListSignal.asReadonly();

  addOvertimeRecords(payload: OvertimeRecordPayload[]): Observable<unknown> {
    return this.http.post(OVERTIME_RECORD_ADD_URL, payload);
  }

  fetchOvertimeList(forceRefresh = false): Observable<OvertimeListRecord[]> {
    if (!forceRefresh && this.cachedRecords) {
      return of(this.cachedRecords);
    }

    return this.http.get<unknown>(OVERTIME_RECORDS_URL).pipe(
      map((response) => this.normalizeOvertimeRecords(response)),
      catchError(() => this.loadFallbackOvertimeList(forceRefresh)),
      tap((records) => {
        this.cachedRecords = records;
        this.overtimeListSignal.set(records);
      }),
    );
  }

  private loadFallbackOvertimeList(forceRefresh = false): Observable<OvertimeListRecord[]> {
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

  private normalizeOvertimeRecords(response: unknown): OvertimeListRecord[] {
    const rawRecords = Array.isArray(response)
      ? response
      : Array.isArray((response as { data?: unknown })?.data)
        ? (response as { data: unknown[] }).data
        : Array.isArray((response as { results?: unknown })?.results)
          ? (response as { results: unknown[] }).results
          : Array.isArray((response as { overtimeRecords?: unknown })?.overtimeRecords)
            ? (response as { overtimeRecords: unknown[] }).overtimeRecords
            : [];

    return rawRecords.map((entry, index) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      const employeeId = this.asString(
        record['employeeCode'] ?? record['employee_code'] ?? record['employeeId'] ?? record['employee_id'] ?? record['empCode'] ?? record['ExtEmpNo'] ?? '',
      );
      const employeeName = this.asString(
        record['employeeName'] ?? record['employee_name'] ?? record['name'] ?? record['employee'] ?? '',
      );

      return {
        id: this.asString(record['id'] ?? record['overtimeId'] ?? record['overtime_id'] ?? record['recordId'] ?? `${employeeId || 'overtime'}-${index}`),
        employeeId,
        extEmpNo: this.asString(record['extEmpNo'] ?? record['ext_emp_no'] ?? record['employeeNumber'] ?? record['employee_no'] ?? ''),
        employeeName,
        shift: this.asString(record['shift'] ?? record['shiftName'] ?? record['shift_name'] ?? record['shiftId'] ?? record['shift_id'] ?? ''),
        shiftLookupLoading: false,
        shiftLookupFailed: false,
        department: this.asString(record['department'] ?? record['departmentName'] ?? record['dept'] ?? ''),
        branch: this.asString(record['branch'] ?? record['branchName'] ?? record['branchLocation'] ?? ''),
        reportingManager: this.asString(record['reportingManager'] ?? record['reporting_manager'] ?? ''),
        overtimeHours: this.toNumber(record['overtimeHours'] ?? record['overtime_hours'] ?? record['overtime'] ?? record['hours'] ?? 0),
        overtimeRate: this.toNumber(record['overtimeRate'] ?? record['overtime_rate'] ?? record['rate'] ?? record['otRate'] ?? 0),
        exceptionalOt: this.toNumber(record['exceptionalOt'] ?? record['exceptional_ot'] ?? 0),
      };
    });
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
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
