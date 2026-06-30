import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Half Day'
  | 'Leave'
  | 'Holiday'
  | 'Weekend';

export interface AttendanceListRecord {
  Id: number;
  EmployeeCode: string;
  EmployeeName: string;
  Department: string;
  AttendanceDate: string;
  Shift: string;
  CheckIn: string;
  CheckOut: string;
  WorkingHours: number;
  LateMinutes: number;
  EarlyLeaveMinutes: number;
  OvertimeHours: number;
  Status: AttendanceStatus | string;
  PayrollMonth: number;
  PayrollYear: number;
  Remarks: string;
  selected?: boolean;
}

export interface AttendanceRecord extends AttendanceListRecord {
  Designation: string;
  Location: string;
  ApprovedBy: string;
  ApprovedDate: string;
}

const ATTENDANCE_LIST_URL = apiUrl('attendance-list');
const ATTENDANCE_DETAIL_URL = apiUrl('attendance-detail');

function createSampleAttendanceRecords(): AttendanceListRecord[] {
  const statuses: AttendanceStatus[] = ['Present', 'Present', 'Absent', 'Half Day', 'Leave', 'Present', 'Holiday'];
  const departments = ['Production', 'HR', 'Finance', 'Maintenance', 'Sales', 'IT', 'Admin'];
  const shifts = ['General', 'Morning', 'Evening', 'Night'];
  const employees = [
    { code: 'EMP-1001', name: 'Ahmed Khan' },
    { code: 'EMP-1002', name: 'Sara Ali' },
    { code: 'EMP-1003', name: 'Bilal Hussain' },
    { code: 'EMP-1004', name: 'Fatima Noor' },
    { code: 'EMP-1005', name: 'Usman Raza' },
    { code: 'EMP-1006', name: 'Ayesha Malik' },
    { code: 'EMP-1007', name: 'Hassan Iqbal' },
    { code: 'EMP-1008', name: 'Nadia Sheikh' },
    { code: 'EMP-1009', name: 'Imran Javed' },
    { code: 'EMP-1010', name: 'Rabia Aslam' },
  ];

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  return employees.flatMap((employee, employeeIndex) =>
    Array.from({ length: 5 }, (_, dayOffset) => {
      const date = new Date(year, month - 1, Math.max(1, today.getDate() - dayOffset - employeeIndex));
      const status = statuses[(employeeIndex + dayOffset) % statuses.length];
      const isWorkingDay = status === 'Present' || status === 'Half Day';
      const checkIn = isWorkingDay ? '08:' + String(5 + (employeeIndex % 4) * 3).padStart(2, '0') : '—';
      const checkOut = isWorkingDay
        ? status === 'Half Day'
          ? '13:00'
          : '17:' + String(10 + (employeeIndex % 3) * 5).padStart(2, '0')
        : '—';

      return {
        Id: employeeIndex * 10 + dayOffset + 1,
        EmployeeCode: employee.code,
        EmployeeName: employee.name,
        Department: departments[employeeIndex % departments.length],
        AttendanceDate: formatIsoDate(date),
        Shift: shifts[employeeIndex % shifts.length],
        CheckIn: checkIn,
        CheckOut: checkOut,
        WorkingHours: status === 'Present' ? 8 + (employeeIndex % 2) * 0.5 : status === 'Half Day' ? 4 : 0,
        LateMinutes: isWorkingDay ? (employeeIndex + dayOffset) % 3 === 0 ? 15 : 0 : 0,
        EarlyLeaveMinutes: status === 'Half Day' ? 240 : 0,
        OvertimeHours: status === 'Present' && employeeIndex % 4 === 0 ? 1.5 : 0,
        Status: status,
        PayrollMonth: month,
        PayrollYear: year,
        Remarks: status === 'Leave' ? 'Annual leave' : status === 'Absent' ? 'Uninformed absence' : '',
        selected: false,
      } satisfies AttendanceListRecord;
    }),
  );
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceManagementService {
  private readonly http = inject(HttpClient);
  private readonly recordList = signal<AttendanceListRecord[]>([]);

  readonly records = this.recordList.asReadonly();

  fetchAttendanceList(): Observable<AttendanceListRecord[]> {
    return this.http.get<unknown>(ATTENDANCE_LIST_URL).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItemToListRecord(item))),
      tap((records) => this.recordList.set(records)),
      catchError(() => {
        const sample = createSampleAttendanceRecords();
        this.recordList.set(sample);
        return of(sample);
      }),
    );
  }

  fetchAttendanceDetail(id: string | number): Observable<AttendanceRecord> {
    const identifier = encodeURIComponent(String(id));

    return this.http.get<unknown>(`${ATTENDANCE_DETAIL_URL}/${identifier}`).pipe(
      map((response) => this.mapDetailResponse(response, id)),
      catchError(() => {
        const match = this.recordList().find((row) => String(row.Id) === String(id));
        if (!match) {
          throw new Error('Attendance record not found.');
        }
        return of(this.mapListRecordToDetail(match));
      }),
    );
  }

  private mapListRecordToDetail(record: AttendanceListRecord): AttendanceRecord {
    return {
      ...record,
      Designation: '—',
      Location: '—',
      ApprovedBy: '—',
      ApprovedDate: '—',
    };
  }

  private mapDetailResponse(response: unknown, id: string | number): AttendanceRecord {
    const root = this.unwrapRecord(response);
    const listRecord = this.mapApiItemToListRecord(root);

    return {
      ...listRecord,
      Id: listRecord.Id || Number(id) || 0,
      Designation: this.pickString([root], ['designation', 'Designation', 'jobTitle', 'job_title']),
      Location: this.pickString([root], ['location', 'Location']),
      ApprovedBy: this.pickString([root], ['approvedBy', 'approved_by', 'ApprovedBy']),
      ApprovedDate: this.pickString([root], ['approvedDate', 'approved_date', 'ApprovedDate']),
    };
  }

  private mapApiItemToListRecord(item: Record<string, unknown>): AttendanceListRecord {
    return {
      Id: this.pickNumber([item], ['Id', 'id', 'ID']),
      EmployeeCode: this.pickString([item], ['employeeCode', 'employee_code', 'EmployeeCode']),
      EmployeeName: this.pickString([item], [
        'employeeName',
        'employee_name',
        'EmployeeName',
        'personName',
        'person_name',
      ]),
      Department: this.pickString([item], ['department', 'Department']),
      AttendanceDate: this.pickString([item], ['attendanceDate', 'attendance_date', 'AttendanceDate', 'date', 'Date']),
      Shift: this.pickString([item], ['shift', 'Shift']),
      CheckIn: this.pickString([item], ['checkIn', 'check_in', 'CheckIn']),
      CheckOut: this.pickString([item], ['checkOut', 'check_out', 'CheckOut']),
      WorkingHours: this.pickNumber([item], ['workingHours', 'working_hours', 'WorkingHours']),
      LateMinutes: this.pickNumber([item], ['lateMinutes', 'late_minutes', 'LateMinutes']),
      EarlyLeaveMinutes: this.pickNumber([item], ['earlyLeaveMinutes', 'early_leave_minutes', 'EarlyLeaveMinutes']),
      OvertimeHours: this.pickNumber([item], ['overtimeHours', 'overtime_hours', 'OvertimeHours']),
      Status: this.pickString([item], ['status', 'Status']) || 'Present',
      PayrollMonth: this.pickNumber([item], ['payrollMonth', 'payroll_month', 'PayrollMonth', 'month', 'Month']),
      PayrollYear: this.pickNumber([item], ['payrollYear', 'payroll_year', 'PayrollYear', 'year', 'Year']),
      Remarks: this.pickString([item], ['remarks', 'Remarks']),
      selected: false,
    };
  }

  private extractApiItems(response: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const root = response as Record<string, unknown>;
    const candidates = [root['data'], root['Data'], root['items'], root['Items'], root['records'], root['Records']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }

    return [];
  }

  private unwrapRecord(response: unknown): Record<string, unknown> {
    if (!response || typeof response !== 'object') {
      return {};
    }

    const root = response as Record<string, unknown>;
    const nested = root['data'] ?? root['Data'] ?? root['record'] ?? root['Record'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }

    return root;
  }

  private pickString(sources: Array<Record<string, unknown>>, keys: string[]): string {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
    }
    return '';
  }

  private pickNumber(sources: Array<Record<string, unknown>>, keys: string[]): number {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value === undefined || value === null || value === '') {
          continue;
        }
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return 0;
  }
}
