import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, last, map, of, switchMap } from 'rxjs';
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

/** Lightweight row used for filtering, sorting, and pagination before page materialization. */
export interface AttendanceSlotRef {
  employeeKey: string;
  displayId: string;
  employeeName: string;
  date: string;
  status: 'Present' | 'Absent';
  punchIn: string;
  punchOut: string;
  punchInDevice: string;
  punchOutDevice: string;
  workingMinutes: number;
  punchCount: number;
}

interface AttendanceSession {
  query: AttendanceQuery;
  employees: ApplicationFormRecord[];
  index: EmployeeAttendanceIndex;
  punchGroups: Map<string, AttendancePunchRecord[]>;
  slots: AttendanceSlotRef[];
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
  private readonly sessionState = signal<AttendanceSession | null>(null);
  private lastQuery: AttendanceQuery = { mode: 'today' };

  readonly slots = computed(() => this.sessionState()?.slots ?? []);
  readonly totalSlotCount = computed(() => this.slots().length);

  /** Loads punch data + employee list summaries only (no per-employee detail calls). */
  loadSession(query: AttendanceQuery): Observable<number> {
    this.lastQuery = this.normalizeQuery(query);

    return forkJoin({
      punches: this.fetchPunches(this.lastQuery),
      employees: this.applicationFormService.fetchEmployeeProfiles().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ punches, employees }) => {
        const session = this.createSession(punches, employees, this.lastQuery);
        this.sessionState.set(session);
        return session.slots.length;
      }),
    );
  }

  materializeSlots(slotRefs: AttendanceSlotRef[]): AttendanceDailyRecord[] {
    const session = this.sessionState();
    if (!session) {
      return [];
    }

    return slotRefs.map((slot) => {
      const punches = sortPunchesChronologically(
        session.punchGroups.get(`${slot.employeeKey}|${slot.date}`) ?? [],
      );
      return this.slotToDailyRecord(slot, punches);
    });
  }

  /** Fetches profile detail only for the given summaries (current page). */
  enrichEmployeeSummaries(summaries: ApplicationFormRecord[]): Observable<void> {
    const session = this.sessionState();
    if (!session || summaries.length === 0) {
      return of(void 0);
    }

    const targets = summaries.filter((record) => !!record.apiId?.trim());
    if (targets.length === 0) {
      return of(void 0);
    }

    return this.applicationFormService.fetchEmployeeProfileDetailsInBatches(targets, targets.length).pipe(
      last(),
      map((detailed) => {
        if (detailed.length === 0) {
          return;
        }

        const merged = this.applicationFormService.mergeEmployeeProfileRecordsForAttendance(
          session.employees,
          detailed,
        );
        const refreshed = this.createSessionFromEmployees(
          session.query,
          merged,
          session.punchGroups,
        );
        this.sessionState.set(refreshed);
      }),
      catchError(() => of(void 0)),
    );
  }

  getLastQuery(): AttendanceQuery {
    return { ...this.lastQuery };
  }

  clearSession(): void {
    this.sessionState.set(null);
  }

  getEmployeeSummariesForKeys(employeeKeys: string[]): ApplicationFormRecord[] {
    const session = this.sessionState();
    if (!session || employeeKeys.length === 0) {
      return [];
    }

    const wanted = new Set(employeeKeys);
    return session.employees.filter((employee) => {
      if (!employee.apiId?.trim()) {
        return false;
      }

      const userId = resolveAttendanceUserId(employee);
      if (!userId) {
        return false;
      }

      return wanted.has(canonicalAttendanceKey(userId));
    });
  }

  private createSession(
    punches: AttendancePunchRecord[],
    employees: ApplicationFormRecord[],
    query: AttendanceQuery,
  ): AttendanceSession {
    const dates = resolveQueryDates(query);
    const dateSet = new Set(dates);
    const index = buildEmployeeAttendanceIndex(employees);
    const punchGroups = new Map<string, AttendancePunchRecord[]>();

    for (const punch of punches) {
      const punchDate = extractIsoDate(punch.PunchDatetime);
      if (!punchDate || !dateSet.has(punchDate)) {
        continue;
      }

      const employeeKey =
        resolvePunchKey(punch.EmployeeId, index.aliasToCanonical) ||
        canonicalAttendanceKey(punch.EmployeeId) ||
        punch.EmployeeId.trim();
      if (!employeeKey) {
        continue;
      }

      ensurePunchOnlyEmployee(index, employeeKey, punch.EmployeeId);
      attachEmployeeNameFromAliases(index, employeeKey, punch.EmployeeId);

      const groupKey = `${employeeKey}|${punchDate}`;
      const group = punchGroups.get(groupKey) ?? [];
      group.push(punch);
      punchGroups.set(groupKey, group);
    }

    const slots = this.buildAttendanceSlots(query, dates, index, punchGroups);

    return {
      query,
      employees,
      index,
      punchGroups,
      slots,
    };
  }

  private createSessionFromEmployees(
    query: AttendanceQuery,
    employees: ApplicationFormRecord[],
    punchGroups: Map<string, AttendancePunchRecord[]>,
  ): AttendanceSession {
    const dates = resolveQueryDates(query);
    const index = buildEmployeeAttendanceIndex(employees);

    for (const groupKey of punchGroups.keys()) {
      const [employeeKey, date] = groupKey.split('|');
      if (!employeeKey || !date) {
        continue;
      }
      const punches = punchGroups.get(groupKey) ?? [];
      const rawId = punches[0]?.EmployeeId ?? employeeKey;
      ensurePunchOnlyEmployee(index, employeeKey, rawId);
      attachEmployeeNameFromAliases(index, employeeKey, rawId);
    }

    const slots = this.buildAttendanceSlots(query, dates, index, punchGroups);

    return {
      query,
      employees,
      index,
      punchGroups,
      slots,
    };
  }

  private buildAttendanceSlots(
    query: AttendanceQuery,
    dates: string[],
    index: EmployeeAttendanceIndex,
    punchGroups: Map<string, AttendancePunchRecord[]>,
  ): AttendanceSlotRef[] {
    const employeeKeys = collectAttendanceEmployeeKeys(query, index, punchGroups);
    const slots: AttendanceSlotRef[] = [];

    for (const employeeKey of employeeKeys) {
      const displayId = index.displayIdByKey.get(employeeKey) ?? formatAttendanceUserId(employeeKey);
      const employeeName = index.nameByKey.get(employeeKey) ?? '';

      for (const date of dates) {
        const dayPunches = sortPunchesChronologically(punchGroups.get(`${employeeKey}|${date}`) ?? []);
        slots.push(this.buildSlotRef(employeeKey, displayId, employeeName, date, dayPunches));
      }
    }

    return slots.sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return left.displayId.localeCompare(right.displayId, undefined, { numeric: true });
    });
  }

  private buildSlotRef(
    employeeKey: string,
    displayId: string,
    employeeName: string,
    date: string,
    punches: AttendancePunchRecord[],
  ): AttendanceSlotRef {
    // API returns punch rows only (no punch-in / punch-out fields). Any row = Present.
    if (punches.length === 0) {
      return {
        employeeKey,
        displayId,
        employeeName,
        date,
        status: 'Absent',
        punchIn: '',
        punchOut: '',
        punchInDevice: '',
        punchOutDevice: '',
        workingMinutes: 0,
        punchCount: 0,
      };
    }

    const sorted = sortPunchesChronologically(punches);
    const firstPunch = sorted[0];
    const secondPunch = sorted.length >= 2 ? sorted[1] : null;

    return {
      employeeKey,
      displayId,
      employeeName,
      date,
      status: 'Present',
      punchIn: firstPunch.PunchDatetime,
      punchOut: secondPunch?.PunchDatetime ?? '',
      punchInDevice: firstPunch.DeviceNo,
      punchOutDevice: secondPunch?.DeviceNo ?? '',
      workingMinutes: calcWorkingMinutes(firstPunch.PunchDatetime, secondPunch?.PunchDatetime ?? ''),
      punchCount: sorted.length,
    };
  }

  private slotToDailyRecord(slot: AttendanceSlotRef, punches: AttendancePunchRecord[]): AttendanceDailyRecord {
    const sorted = sortPunchesChronologically(punches);

    return {
      EmployeeId: slot.displayId,
      EmployeeName: slot.employeeName,
      AttendanceDate: slot.date,
      PunchIn: slot.punchIn,
      PunchOut: slot.punchOut,
      PunchInDevice: slot.punchInDevice,
      PunchOutDevice: slot.punchOutDevice,
      WorkingMinutes: slot.workingMinutes,
      AttendanceStatus: slot.status,
      PunchCount: slot.punchCount,
      Punches: sorted,
      selected: false,
    };
  }

  /**
   * Pioneer biometrics endpoints (see API docs):
   * - Today all:        /EmployeeData
   * - Today employee:   /EmployeeData/{employeeId}
   * - Date all:         /EmployeeData/Date/{yyyy-MM-dd}
   * - Date employee:    /EmployeeData/Date/{yyyy-MM-dd}/{employeeId}
   * - Range all:        /EmployeeData/DateRange/{from}/{to}/
   * - Range employee:   /EmployeeData/DateRange/{from}/{to}/{employeeId}
   */
  buildQueryUrl(query: AttendanceQuery): string {
    const normalized = this.normalizeQuery(query);
    const apiEmployeeId = normalized.userId?.trim()
      ? biometricsPathEmployeeId(normalized.userId.trim())
      : '';
    const employeePath = apiEmployeeId ? `/${encodeURIComponent(apiEmployeeId)}` : '';

    switch (normalized.mode) {
      case 'today':
        return `${BIOMETRICS_API_BASE_URL}/EmployeeData${employeePath}`;

      case 'date': {
        const date = normalized.date ?? formatIsoDate(new Date());
        return `${BIOMETRICS_API_BASE_URL}/EmployeeData/Date/${date}${employeePath}`;
      }

      case 'dateRange': {
        const fromDate = normalized.fromDate ?? formatIsoDate(new Date());
        const toDate = normalized.toDate ?? fromDate;
        const [rangeStart, rangeEnd] = normalizeDateRange(fromDate, toDate);
        if (apiEmployeeId) {
          return `${BIOMETRICS_API_BASE_URL}/EmployeeData/DateRange/${rangeStart}/${rangeEnd}/${encodeURIComponent(apiEmployeeId)}`;
        }
        return `${BIOMETRICS_API_BASE_URL}/EmployeeData/DateRange/${rangeStart}/${rangeEnd}/`;
      }
    }
  }

  /** Fallback when the scoped URL returns no rows or fails. */
  buildFallbackPunchUrl(query: AttendanceQuery): string {
    const normalized = this.normalizeQuery(query);
    const apiEmployeeId = normalized.userId?.trim()
      ? biometricsPathEmployeeId(normalized.userId.trim())
      : '';

    if (apiEmployeeId) {
      return `${BIOMETRICS_API_BASE_URL}/EmployeeData/${encodeURIComponent(apiEmployeeId)}`;
    }

    return `${BIOMETRICS_API_BASE_URL}/EmployeeData`;
  }

  private fetchPunches(query: AttendanceQuery): Observable<AttendancePunchRecord[]> {
    const normalized = this.normalizeQuery(query);
    const allowedDates = new Set(resolveQueryDates(normalized));
    const primaryUrl = this.buildQueryUrl(normalized);
    const fallbackUrl = this.buildFallbackPunchUrl(normalized);

    const parseAndFilter = (response: unknown): AttendancePunchRecord[] =>
      this.extractApiItems(response)
        .map((item) => this.mapApiItem(item))
        .filter((punch) => {
          const punchDate = extractIsoDate(punch.PunchDatetime);
          return !!punchDate && allowedDates.has(punchDate);
        });

    const loadUrl = (url: string) =>
      this.http.get<unknown>(url).pipe(
        map(parseAndFilter),
        catchError(() => of<AttendancePunchRecord[]>([])),
      );

    return loadUrl(primaryUrl).pipe(
      switchMap((primaryPunches) => {
        if (primaryPunches.length > 0 || fallbackUrl === primaryUrl) {
          return of(primaryPunches);
        }
        return loadUrl(fallbackUrl);
      }),
    );
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
    const rawEmployeeId = pickFirstNonEmptyString(
      item['Employee ID'],
      item.EmployeeId,
      item.employeeId,
      record['employeeID'],
      record['EmployeeID'],
      item['User ID'],
      item.userId,
      item.UserId,
    );
    const normalizedEmployeeId =
      canonicalAttendanceKey(rawEmployeeId) || extractAttendanceUserId(rawEmployeeId) || rawEmployeeId;

    return {
      No: Number(item.No ?? record['no'] ?? 0),
      EmployeeId: normalizedEmployeeId,
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

export function extractAttendanceUserId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '—') {
    return '';
  }

  const empMatch = trimmed.match(/^Emp-(\d+)$/i);
  if (empMatch) {
    return empMatch[1];
  }

  return trimmed;
}

export function resolveAttendanceUserId(employee: ApplicationFormRecord): string {
  const candidates = [
    employee.userId,
    employee.detail?.loginDetails.userId,
  ];

  for (const candidate of candidates) {
    const userId = extractAttendanceUserId(String(candidate ?? '').trim());
    if (/^\d+$/.test(userId)) {
      return userId;
    }
  }

  const employeeCode = employee.EmployeeCode?.trim();
  if (employeeCode && employeeCode !== '—') {
    const fromCode = extractAttendanceUserId(employeeCode);
    if (/^\d+$/.test(fromCode)) {
      return fromCode;
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
  const extracted = extractAttendanceUserId(value);
  if (/^\d+$/.test(extracted)) {
    return extracted.padStart(8, '0');
  }
  return extracted || value.trim();
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
  const extracted = extractAttendanceUserId(userId);
  if (!extracted) {
    return userId.trim();
  }

  const canonical = canonicalAttendanceKey(extracted);
  if (/^\d{8}$/.test(canonical)) {
    return canonical;
  }

  return extracted;
}

function pickFirstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const text = value === undefined || value === null ? '' : String(value).trim();
    if (text) {
      return text;
    }
  }
  return '';
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
    if (!rawUserId) {
      continue;
    }

    const loginCode = employee.detail?.loginDetails.employeeCode?.trim() || '';
    const rawCode = employee.EmployeeCode?.trim();
    const employeeCode = rawCode && rawCode !== '—' ? rawCode : '';
    const canonical = canonicalAttendanceKey(rawUserId);
    const employeeName = employee.EmployeeName?.trim() || '';

    registerEmployeeAliases(index, canonical, rawUserId, employeeName, [
      rawUserId,
      canonical,
      employee.userId,
      employee.detail?.loginDetails.userId,
      employeeCode,
      loginCode,
      employee.apiId,
    ]);
  }

  return index;
}

function attachEmployeeNameFromAliases(
  index: EmployeeAttendanceIndex,
  employeeKey: string,
  rawPunchId: string,
): void {
  if (index.nameByKey.get(employeeKey)?.trim()) {
    return;
  }

  for (const variant of attendanceKeyVariants(rawPunchId)) {
    const canonical = index.aliasToCanonical.get(variant);
    if (!canonical) {
      continue;
    }

    const name = index.nameByKey.get(canonical)?.trim();
    if (!name) {
      continue;
    }

    index.nameByKey.set(employeeKey, name);
    const displayId = index.displayIdByKey.get(canonical);
    if (displayId) {
      index.displayIdByKey.set(employeeKey, displayId);
    }
    return;
  }
}

function collectAttendanceEmployeeKeys(
  query: AttendanceQuery,
  index: EmployeeAttendanceIndex,
  punchGroups: Map<string, AttendancePunchRecord[]>,
): string[] {
  const filteredId = query.userId?.trim();
  if (filteredId) {
    const key =
      resolvePunchKey(filteredId, index.aliasToCanonical) || canonicalAttendanceKey(filteredId);
    return key ? [key] : [];
  }

  const seen = new Set<string>(index.nameByKey.keys());
  for (const groupKey of punchGroups.keys()) {
    const [employeeKey] = groupKey.split('|');
    if (employeeKey) {
      seen.add(employeeKey);
    }
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function resolvePunchKey(rawEmployeeId: string, aliasToCanonical: Map<string, string>): string {
  const normalized = canonicalAttendanceKey(rawEmployeeId) || rawEmployeeId.trim();
  const lookupCandidates = normalized ? [normalized, rawEmployeeId] : [rawEmployeeId];

  for (const candidate of lookupCandidates) {
    for (const variant of attendanceKeyVariants(candidate)) {
      const canonical = aliasToCanonical.get(variant);
      if (canonical) {
        return canonical;
      }
    }
  }

  return normalized || rawEmployeeId.trim().toLowerCase();
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
