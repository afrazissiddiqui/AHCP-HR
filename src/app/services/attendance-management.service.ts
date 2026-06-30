import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { BIOMETRICS_API_BASE_URL } from '../config/api.config';
import { ApplicationFormRecord, ApplicationFormService } from './application-form.service';

export type AttendanceQueryMode = 'today' | 'date' | 'dateRange';

export interface AttendanceQuery {
  mode: AttendanceQueryMode;
  userId?: string;
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
  'User ID'?: string;
  EmployeeId?: string;
  employeeId?: string;
  UserId?: string;
  userId?: string;
  PunchDatetime?: string;
  punchDatetime?: string;
  'Punch Datetime'?: string;
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
    const userId = normalized.userId?.trim();
    const apiEmployeeId = userId ? biometricsPathEmployeeId(userId) : '';

    switch (normalized.mode) {
      case 'today':
        return apiEmployeeId
          ? `${BIOMETRICS_API_BASE_URL}/EmployeeData/${encodeURIComponent(apiEmployeeId)}`
          : `${BIOMETRICS_API_BASE_URL}/EmployeeData`;

      case 'date': {
        const date = normalized.date ?? formatIsoDate(new Date());
        return apiEmployeeId
          ? `${BIOMETRICS_API_BASE_URL}/EmployeeData/Date/${date}/${encodeURIComponent(apiEmployeeId)}`
          : `${BIOMETRICS_API_BASE_URL}/EmployeeData/Date/${date}`;
      }

      case 'dateRange': {
        const fromDate = normalized.fromDate ?? formatIsoDate(new Date());
        const toDate = normalized.toDate ?? fromDate;
        const [rangeStart, rangeEnd] = normalizeDateRange(fromDate, toDate);
        return apiEmployeeId
          ? `${BIOMETRICS_API_BASE_URL}/EmployeeData/DateRange/${rangeStart}/${rangeEnd}/${encodeURIComponent(apiEmployeeId)}`
          : `${BIOMETRICS_API_BASE_URL}/EmployeeData/DateRange/${rangeStart}/${rangeEnd}/`;
      }
    }
  }

  private buildDailyAttendance(
    punches: AttendancePunchRecord[],
    employees: ApplicationFormRecord[],
    query: AttendanceQuery,
  ): AttendanceDailyRecord[] {
    const dates = resolveQueryDates(query);
    const index = buildEmployeeAttendanceIndex(employees);
    const punchesByDay = new Map<string, AttendancePunchRecord[]>();

    for (const punch of punches) {
      const key = resolvePunchKey(punch.EmployeeId, index.aliasToCanonical);
      const date = extractIsoDate(punch.PunchDatetime);
      if (!key || !date) {
        continue;
      }
      ensurePunchOnlyEmployee(index, key, punch.EmployeeId);
      const bucketKey = dayKey(key, date);
      const bucket = punchesByDay.get(bucketKey) ?? [];
      bucket.push(punch);
      punchesByDay.set(bucketKey, bucket);
    }

    const rosterKeys = resolveAttendanceKeys(query, index, punches);
    const records: AttendanceDailyRecord[] = [];

    for (const key of rosterKeys) {
      const displayId = index.displayIdByKey.get(key) ?? formatAttendanceUserId(key);
      const employeeName = index.nameByKey.get(key) ?? '';
      for (const date of dates) {
        const dayPunches = sortPunchesChronologically(punchesByDay.get(dayKey(key, date)) ?? []);
        records.push(this.aggregateEmployeeDay(displayId, date, dayPunches, employeeName));
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

    const checkIn = punches[0];
    const checkOut = punches.length >= 2 ? punches[1] : null;
    const punchIn = checkIn.PunchDatetime;
    const punchOut = checkOut?.PunchDatetime ?? '';

    return {
      EmployeeId: employeeId,
      EmployeeName: employeeName,
      AttendanceDate: date,
      PunchIn: punchIn,
      PunchOut: punchOut,
      PunchInDevice: checkIn.DeviceNo,
      PunchOutDevice: checkOut?.DeviceNo ?? '',
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
      userId: query.userId?.trim() || undefined,
      date: query.date?.trim() || undefined,
      fromDate: query.fromDate?.trim() || undefined,
      toDate: query.toDate?.trim() || undefined,
    };
  }

  private mapApiItem(item: BiometricsPunchApiRecord): AttendancePunchRecord {
    const record = item as Record<string, unknown>;
    const punchDatetime = String(
      item.PunchDatetime ??
        item.punchDatetime ??
        item['Punch Datetime'] ??
        record['PunchDateTime'] ??
        record['punchDateTime'] ??
        record['DateTime'] ??
        record['dateTime'] ??
        '',
    ).trim();
    const rawEmployeeId = String(
      item['User ID'] ??
        item.userId ??
        item.UserId ??
        item['Employee ID'] ??
        item.EmployeeId ??
        item.employeeId ??
        record['employeeID'] ??
        record['EmployeeID'] ??
        '',
    ).trim();

    return {
      No: Number(item.No ?? record['no'] ?? 0),
      EmployeeId: rawEmployeeId,
      PunchDatetime: punchDatetime,
      DeviceNo: String(
        item['Device No'] ?? item.DeviceNo ?? item.deviceNo ?? record['DeviceNo'] ?? '',
      ).trim(),
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
    const candidates = [
      root['data'],
      root['Data'],
      root['items'],
      root['Items'],
      root['records'],
      root['Records'],
      root['employeeData'],
      root['EmployeeData'],
      root['result'],
      root['Result'],
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is BiometricsPunchApiRecord => !!item && typeof item === 'object');
      }
    }

    if (
      root['Employee ID'] ||
      root['EmployeeId'] ||
      root['employeeId'] ||
      root['PunchDatetime'] ||
      root['punchDatetime']
    ) {
      return [root as BiometricsPunchApiRecord];
    }

    return [];
  }
}

export function resolveAttendanceUserId(employee: ApplicationFormRecord): string {
  const userId =
    employee.detail?.loginDetails.userId?.trim() ||
    employee.userId?.trim() ||
    '';
  if (userId) {
    return userId;
  }

  const employeeCode = employee.EmployeeCode?.trim();
  if (employeeCode && employeeCode !== '—') {
    if (/^Emp-/i.test(employeeCode)) {
      return employeeCode;
    }
    if (/^\d+$/.test(employeeCode)) {
      return employeeCode;
    }
  }

  return '';
}

/** Normalizes biometric / login ids to a shared comparable key (8-digit numeric when possible). */
export function canonicalAttendanceKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const empMatch = trimmed.match(/^Emp-(\d+)$/i);
  if (empMatch) {
    return empMatch[1].padStart(8, '0');
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed.padStart(8, '0');
  }

  return trimmed.toLowerCase();
}

export function formatAttendanceUserId(value: string): string {
  const key = canonicalAttendanceKey(value);
  if (/^\d{8}$/.test(key)) {
    return `Emp-${key}`;
  }
  return value.trim();
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

function biometricsPathEmployeeId(userId: string): string {
  const key = canonicalAttendanceKey(userId);
  if (/^\d{8}$/.test(key)) {
    return key;
  }
  return userId.trim();
}

interface EmployeeAttendanceIndex {
  aliasToCanonical: Map<string, string>;
  nameByKey: Map<string, string>;
  displayIdByKey: Map<string, string>;
}

function attendanceKeyVariants(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const variants = new Set<string>();
  variants.add(trimmed);
  variants.add(trimmed.toLowerCase());

  const canonical = canonicalAttendanceKey(trimmed);
  if (canonical) {
    variants.add(canonical);
  }

  if (/^\d+$/.test(trimmed)) {
    variants.add(trimmed.padStart(8, '0'));
    variants.add(String(Number.parseInt(trimmed, 10)));
  }

  const empMatch = trimmed.match(/^Emp-(\d+)$/i);
  if (empMatch) {
    const digits = empMatch[1];
    variants.add(digits.padStart(8, '0'));
    variants.add(digits);
    variants.add(String(Number.parseInt(digits, 10)));
  }

  return Array.from(variants).filter(Boolean);
}

function registerEmployeeAliases(
  index: EmployeeAttendanceIndex,
  canonical: string,
  displayId: string,
  employeeName: string,
  candidates: Array<string | undefined>,
): void {
  if (!index.nameByKey.has(canonical)) {
    index.nameByKey.set(canonical, employeeName);
  }
  if (!index.displayIdByKey.has(canonical)) {
    index.displayIdByKey.set(canonical, formatAttendanceUserId(displayId));
  }

  for (const candidate of candidates) {
    if (!candidate?.trim()) {
      continue;
    }
    for (const variant of attendanceKeyVariants(candidate)) {
      index.aliasToCanonical.set(variant, canonical);
    }
  }
}

function buildEmployeeAttendanceIndex(employees: ApplicationFormRecord[]): EmployeeAttendanceIndex {
  const index: EmployeeAttendanceIndex = {
    aliasToCanonical: new Map<string, string>(),
    nameByKey: new Map<string, string>(),
    displayIdByKey: new Map<string, string>(),
  };

  for (const employee of employees) {
    const rawUserId = resolveAttendanceUserId(employee);
    const loginCode = employee.detail?.loginDetails.employeeCode?.trim() || '';
    const rawCode = employee.EmployeeCode?.trim();
    const employeeCode = rawCode && rawCode !== '—' ? rawCode : '';
    const displayId = rawUserId || employeeCode;
    if (!displayId) {
      continue;
    }

    const canonical = canonicalAttendanceKey(rawUserId || displayId) || displayId.toLowerCase();
    const employeeName = employee.EmployeeName?.trim() || '';

    registerEmployeeAliases(index, canonical, rawUserId || displayId, employeeName, [
      displayId,
      rawUserId,
      employeeCode,
      loginCode,
      employee.apiId,
      employee.detail?.loginDetails.userId,
    ]);
  }

  return index;
}

function resolvePunchKey(rawEmployeeId: string, aliasToCanonical: Map<string, string>): string {
  for (const variant of attendanceKeyVariants(rawEmployeeId)) {
    const canonical = aliasToCanonical.get(variant);
    if (canonical) {
      return canonical;
    }
  }

  const canonical = canonicalAttendanceKey(rawEmployeeId);
  return canonical || rawEmployeeId.trim().toLowerCase();
}

function ensurePunchOnlyEmployee(
  index: EmployeeAttendanceIndex,
  canonical: string,
  rawEmployeeId: string,
): void {
  if (index.nameByKey.has(canonical)) {
    return;
  }

  index.nameByKey.set(canonical, '');
  index.displayIdByKey.set(canonical, formatAttendanceUserId(rawEmployeeId));
  for (const variant of attendanceKeyVariants(rawEmployeeId)) {
    index.aliasToCanonical.set(variant, canonical);
  }
}

function resolveAttendanceKeys(
  query: AttendanceQuery,
  index: EmployeeAttendanceIndex,
  punches: AttendancePunchRecord[],
): string[] {
  const filteredId = query.userId?.trim();
  if (filteredId) {
    return [resolvePunchKey(filteredId, index.aliasToCanonical)];
  }

  const seen = new Set<string>(index.nameByKey.keys());

  for (const punch of punches) {
    const key = resolvePunchKey(punch.EmployeeId, index.aliasToCanonical);
    if (key) {
      seen.add(key);
    }
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function dayKey(attendanceKey: string, date: string): string {
  return `${attendanceKey}|${date}`;
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
  if (!trimmed) {
    return '';
  }

  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) {
    return isoPrefix[1];
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    return `${dmyMatch[3]}-${month}-${day}`;
  }

  const dotnetMatch = trimmed.match(/\/Date\((\d+)\)\//);
  if (dotnetMatch) {
    const parsed = Number.parseInt(dotnetMatch[1], 10);
    if (Number.isFinite(parsed)) {
      return formatIsoDate(new Date(parsed));
    }
  }

  if (/^\d{10,13}$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    const millis = trimmed.length <= 10 ? parsed * 1000 : parsed;
    if (Number.isFinite(millis)) {
      return formatIsoDate(new Date(millis));
    }
  }

  const parsed = Date.parse(trimmed);
  if (Number.isFinite(parsed)) {
    return formatIsoDate(new Date(parsed));
  }

  return '';
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
