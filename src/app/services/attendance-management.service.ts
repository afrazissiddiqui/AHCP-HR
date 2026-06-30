import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { BIOMETRICS_API_BASE_URL } from '../config/api.config';

export type AttendanceQueryMode = 'today' | 'date' | 'dateRange';

export interface AttendanceQuery {
  mode: AttendanceQueryMode;
  employeeId?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AttendancePunchRecord {
  No: number;
  EmployeeId: string;
  PunchDatetime: string;
  DeviceNo: string;
  Status: string;
  selected?: boolean;
}

interface BiometricsPunchApiRecord {
  No?: number;
  'Employee ID'?: string;
  EmployeeId?: string;
  employeeId?: string;
  PunchDatetime?: string;
  punchDatetime?: string;
  'Device No'?: string;
  DeviceNo?: string;
  deviceNo?: string;
  Status?: string | null;
  status?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceManagementService {
  private readonly http = inject(HttpClient);
  private readonly recordList = signal<AttendancePunchRecord[]>([]);
  private lastQuery: AttendanceQuery = { mode: 'today' };

  readonly records = this.recordList.asReadonly();

  fetchAttendance(query: AttendanceQuery): Observable<AttendancePunchRecord[]> {
    this.lastQuery = this.normalizeQuery(query);
    const url = this.buildQueryUrl(this.lastQuery);

    return this.http.get<unknown>(url).pipe(
      map((response) => this.extractApiItems(response).map((item) => this.mapApiItem(item))),
      map((records) => this.sortRecords(records)),
      tap((records) => this.recordList.set(records)),
    );
  }

  fetchAttendanceDetail(no: number): Observable<AttendancePunchRecord> {
    const cached = this.recordList().find((row) => row.No === no);
    if (cached) {
      return new Observable((subscriber) => {
        subscriber.next(cached);
        subscriber.complete();
      });
    }

    const employeeId = this.lastQuery.employeeId?.trim();
    const query = this.lastQuery;
    return this.fetchAttendance(query).pipe(
      map((records) => {
        const match = records.find((row) => row.No === no);
        if (!match) {
          throw new Error('Attendance punch record not found.');
        }
        return match;
      }),
    );
  }

  getLastQuery(): AttendanceQuery {
    return { ...this.lastQuery };
  }

  buildQueryUrl(query: AttendanceQuery): string {
    const normalized = this.normalizeQuery(query);
    const employeeId = normalized.employeeId?.trim();

    switch (normalized.mode) {
      case 'today':
        return employeeId
          ? `${BIOMETRICS_API_BASE_URL}/EmployeeData/${encodeURIComponent(employeeId)}`
          : `${BIOMETRICS_API_BASE_URL}/EmployeeData`;

      case 'date': {
        const date = normalized.date ?? formatIsoDate(new Date());
        return employeeId
          ? `${BIOMETRICS_API_BASE_URL}/EmployeeData/Date/${date}/${encodeURIComponent(employeeId)}`
          : `${BIOMETRICS_API_BASE_URL}/EmployeeData/Date/${date}`;
      }

      case 'dateRange': {
        const fromDate = normalized.fromDate ?? formatIsoDate(new Date());
        const toDate = normalized.toDate ?? fromDate;
        const [rangeStart, rangeEnd] = normalizeDateRange(fromDate, toDate);
        return employeeId
          ? `${BIOMETRICS_API_BASE_URL}/EmployeeData/DateRange/${rangeStart}/${rangeEnd}/${encodeURIComponent(employeeId)}`
          : `${BIOMETRICS_API_BASE_URL}/EmployeeData/DateRange/${rangeStart}/${rangeEnd}/`;
      }
    }
  }

  private normalizeQuery(query: AttendanceQuery): AttendanceQuery {
    return {
      mode: query.mode,
      employeeId: query.employeeId?.trim() || undefined,
      date: query.date?.trim() || undefined,
      fromDate: query.fromDate?.trim() || undefined,
      toDate: query.toDate?.trim() || undefined,
    };
  }

  private mapApiItem(item: BiometricsPunchApiRecord): AttendancePunchRecord {
    const punchDatetime = String(item.PunchDatetime ?? item.punchDatetime ?? '').trim();

    return {
      No: Number(item.No ?? 0),
      EmployeeId: String(item['Employee ID'] ?? item.EmployeeId ?? item.employeeId ?? '').trim(),
      PunchDatetime: punchDatetime,
      DeviceNo: String(item['Device No'] ?? item.DeviceNo ?? item.deviceNo ?? '').trim(),
      Status: String(item.Status ?? item.status ?? '').trim(),
      selected: false,
    };
  }

  private extractApiItems(response: unknown): BiometricsPunchApiRecord[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is BiometricsPunchApiRecord => !!item && typeof item === 'object');
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const root = response as Record<string, unknown>;
    const candidates = [root['data'], root['Data'], root['items'], root['Items'], root['records'], root['Records']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is BiometricsPunchApiRecord => !!item && typeof item === 'object');
      }
    }

    return [];
  }

  private sortRecords(records: AttendancePunchRecord[]): AttendancePunchRecord[] {
    return [...records].sort((left, right) => {
      const leftTime = Date.parse(left.PunchDatetime);
      const rightTime = Date.parse(right.PunchDatetime);
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return right.No - left.No;
    });
  }
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeDateRange(fromDate: string, toDate: string): [string, string] {
  const from = Date.parse(fromDate);
  const to = Date.parse(toDate);
  if (Number.isFinite(from) && Number.isFinite(to) && from > to) {
    return [toDate, fromDate];
  }
  return [fromDate, toDate];
}

export function formatPunchDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '—';
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatPunchTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '—';
  }

  const match = trimmed.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const seconds = match[3] ? `:${match[3]}` : '';
    return `${match[1]}:${match[2]}${seconds}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  const seconds = String(parsed.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
