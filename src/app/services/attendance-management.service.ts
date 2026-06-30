import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { BIOMETRICS_API_BASE_URL } from '../config/api.config';
import { ApplicationFormService } from './application-form.service';

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

export interface AttendanceDailyRecord {
  EmployeeId: string;
  EmployeeName: string;
  AttendanceDate: string;
  PunchIn: string;
  PunchOut: string;
  PunchInDevice: string;
  PunchOutDevice: string;
  WorkingMinutes: number;
  AttendanceStatus: 'Present' | 'Absent';
  PunchCount: number;
  Punches: AttendancePunchRecord[];
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
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly recordList = signal<AttendanceDailyRecord[]>([]);
  private lastQuery: AttendanceQuery = { mode: 'today' };

  readonly records = this.recordList.asReadonly();

  fetchAttendance(query: AttendanceQuery): Observable<AttendanceDailyRecord[]> {
    this.lastQuery = this.normalizeQuery(query);
    const url = this.buildQueryUrl(this.lastQuery);

    return forkJoin({
      punches: this.http.get<unknown>(url).pipe(
        map((response) => this.extractApiItems(response).map((item) => this.mapApiItem(item))),
        catchError(() => of<AttendancePunchRecord[]>([])),
      ),
      employees: this.applicationFormService.fetchEmployeeProfiles().pipe(
        catchError(() => of([])),
      ),
    }).pipe(
      map(({ punches, employees }) =>
        this.buildDailyAttendance(punches, employees, this.lastQuery),
      ),
      tap((records) => this.recordList.set(records)),
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

  private buildDailyAttendance(
    punches: AttendancePunchRecord[],
    employees: Array<{ EmployeeCode: string; EmployeeName: string }>,
    query: AttendanceQuery,
  ): AttendanceDailyRecord[] {
    const dates = resolveQueryDates(query);
    const employeeNameById = new Map<string, string>();
    for (const employee of employees) {
      const id = normalizeEmployeeId(employee.EmployeeCode);
      if (id) {
        employeeNameById.set(id, employee.EmployeeName?.trim() || '');
      }
    }

    const employeeIds = resolveEmployeeIds(query, employees, punches);
    const punchesByDay = new Map<string, AttendancePunchRecord[]>();

    for (const punch of punches) {
      const employeeId = normalizeEmployeeId(punch.EmployeeId);
      const date = extractIsoDate(punch.PunchDatetime);
      if (!employeeId || !date) {
        continue;
      }
      const key = dayKey(employeeId, date);
      const bucket = punchesByDay.get(key) ?? [];
      bucket.push(punch);
      punchesByDay.set(key, bucket);
    }

    const records: AttendanceDailyRecord[] = [];

    for (const employeeId of employeeIds) {
      for (const date of dates) {
        const dayPunches = sortPunchesChronologically(punchesByDay.get(dayKey(employeeId, date)) ?? []);
        records.push(this.aggregateEmployeeDay(employeeId, date, dayPunches, employeeNameById.get(employeeId) ?? ''));
      }
    }

    return records.sort((left, right) => {
      const dateCompare = right.AttendanceDate.localeCompare(left.AttendanceDate);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return left.EmployeeId.localeCompare(right.EmployeeId, undefined, { numeric: true });
    });
  }

  private aggregateEmployeeDay(
    employeeId: string,
    date: string,
    punches: AttendancePunchRecord[],
    employeeName: string,
  ): AttendanceDailyRecord {
    if (punches.length === 0) {
      return {
        EmployeeId: employeeId,
        EmployeeName: employeeName,
        AttendanceDate: date,
        PunchIn: '',
        PunchOut: '',
        PunchInDevice: '',
        PunchOutDevice: '',
        WorkingMinutes: 0,
        AttendanceStatus: 'Absent',
        PunchCount: 0,
        Punches: [],
        selected: false,
      };
    }

    const firstPunch = punches[0];
    const secondPunch = punches.length >= 2 ? punches[1] : null;
    const lastPunch = punches[punches.length - 1];
    const punchIn = firstPunch.PunchDatetime;
    const punchOut = punches.length >= 2 ? lastPunch.PunchDatetime : '';

    return {
      EmployeeId: employeeId,
      EmployeeName: employeeName,
      AttendanceDate: date,
      PunchIn: punchIn,
      PunchOut: punchOut,
      PunchInDevice: firstPunch.DeviceNo,
      PunchOutDevice: punchOut ? lastPunch.DeviceNo : '',
      WorkingMinutes: calcWorkingMinutes(punchIn, punchOut),
      AttendanceStatus: 'Present',
      PunchCount: punches.length,
      Punches: punches,
      selected: false,
    };
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
      EmployeeId: normalizeEmployeeId(String(item['Employee ID'] ?? item.EmployeeId ?? item.employeeId ?? '')),
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
}

export function normalizeEmployeeId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (/^\d+$/.test(trimmed)) {
    return trimmed.padStart(8, '0');
  }
  return trimmed;
}

export function resolveQueryDates(query: AttendanceQuery): string[] {
  switch (query.mode) {
    case 'today':
      return [formatIsoDate(new Date())];
    case 'date':
      return [query.date?.trim() || formatIsoDate(new Date())];
    case 'dateRange': {
      const fromDate = query.fromDate?.trim() || formatIsoDate(new Date());
      const toDate = query.toDate?.trim() || fromDate;
      const [start, end] = normalizeDateRange(fromDate, toDate);
      return enumerateIsoDates(start, end);
    }
  }
}

function resolveEmployeeIds(
  query: AttendanceQuery,
  employees: Array<{ EmployeeCode: string }>,
  punches: AttendancePunchRecord[],
): string[] {
  const filteredId = query.employeeId?.trim();
  if (filteredId) {
    return [normalizeEmployeeId(filteredId)];
  }

  const seen = new Set<string>();
  for (const employee of employees) {
    const id = normalizeEmployeeId(employee.EmployeeCode);
    if (id) {
      seen.add(id);
    }
  }

  if (seen.size > 0) {
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  for (const punch of punches) {
    const id = normalizeEmployeeId(punch.EmployeeId);
    if (id) {
      seen.add(id);
    }
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function dayKey(employeeId: string, date: string): string {
  return `${employeeId}|${date}`;
}

function sortPunchesChronologically(punches: AttendancePunchRecord[]): AttendancePunchRecord[] {
  return [...punches].sort((left, right) => {
    const leftTime = Date.parse(left.PunchDatetime);
    const rightTime = Date.parse(right.PunchDatetime);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.No - right.No;
  });
}

function extractIsoDate(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? '';
}

export function calcWorkingMinutes(punchIn: string, punchOut: string): number {
  const inTime = Date.parse(punchIn);
  const outTime = Date.parse(punchOut);
  if (!Number.isFinite(inTime) || !Number.isFinite(outTime) || outTime <= inTime) {
    return 0;
  }
  return Math.round((outTime - inTime) / 60000);
}

export function formatWorkingDuration(minutes: number): string {
  if (!minutes || minutes <= 0) {
    return '—';
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) {
    return `${remainder}m`;
  }
  if (remainder === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainder}m`;
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

function enumerateIsoDates(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
    return [fromDate];
  }

  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates.length > 0 ? dates : [fromDate];
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
