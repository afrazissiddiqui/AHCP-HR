import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, from, map, mergeMap, toArray } from 'rxjs';
import {
  AttendanceManagementService,
  AttendanceQuery,
  canonicalAttendanceKey,
  formatIsoDate,
  formatWorkingDuration,
} from '../../../services/attendance-management.service';
import { AlertService } from '../../../services/alert.service';
import { OvertimeListRecord, OvertimeListService } from '../../../services/overtime-list.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { buildPaginationFooterItems, paginationItemTrack, PaginationFooterItem } from '../../../utils/pagination.util';
import { GatePassDepartmentService } from '../../gate-pass/gate-pass-department.service';
import { resolveBranchNameFromBplId } from '../../../utils/branch-name.util';
import { OVERTIME_TABLE_FILTER, TableFilterComponent, TableFilterConfig, TableFilterService } from '../../table-filter';
import { WorkstationRecord, WorkstationService } from '../../../services/workstation.service';

type OvertimeColumnKey =
  | 'employeeId'
  | 'employeeName'
  | 'shift'
  | 'workingHour'
  | 'shiftHours'
  | 'overtimeHours'
  | 'overtimeRate'
  | 'exceptionalOt';

interface OvertimeTableColumn {
  key: OvertimeColumnKey;
  label: string;
}

interface OvertimeFilterRow {
  record: OvertimeListRecord;
  departmentName: string;
  branchName: string;
  reportingManager: string;
  employeeId: string;
  employeeIdNumber: number | null;
}

@Component({
  selector: 'app-overtime-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TableFilterComponent],
  templateUrl: './overtime-list.html',
  styleUrl: './overtime-list.css',
})
export class OvertimeListComponent implements OnInit {
  private readonly overtimeListService = inject(OvertimeListService);
  private readonly attendanceService = inject(AttendanceManagementService);
  private readonly workstationService = inject(WorkstationService);
  private readonly departmentService = inject(GatePassDepartmentService);
  private readonly alertService = inject(AlertService);
  readonly tableFilter = inject(TableFilterService);
  readonly attendanceFilterLoading = signal(false);
  readonly workingHoursLoading = signal(false);
  readonly workstationLoading = signal(false);
  readonly workstations = signal<WorkstationRecord[]>([]);

  readonly loading = signal(false);
  readonly records = signal<OvertimeListRecord[]>([]);
  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 20, 50];
  readonly overtimeTableFilter = OVERTIME_TABLE_FILTER;
  readonly overtimeDataFilter: TableFilterConfig = {
    ...OVERTIME_TABLE_FILTER,
    fields: OVERTIME_TABLE_FILTER.fields.filter((field) => field.key !== 'attendanceDate'),
  };
  private readonly attendanceEmployeeKeys = signal<Set<string> | null>(null);
  private readonly attendanceWorkingHours = signal<Map<string, string>>(new Map());
  private attendanceStarted = false;
  private workingHoursRequestId = 0;

  readonly columns: OvertimeTableColumn[] = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee Name' },
    { key: 'shift', label: 'Assigned Shift' },
    { key: 'workingHour', label: 'Working Hour' },
    { key: 'shiftHours', label: 'Shift Hours' },
    { key: 'overtimeHours', label: 'Overtime Hours' },
    { key: 'overtimeRate', label: 'Overtime Rate' },
    { key: 'exceptionalOt', label: 'Exceptional OT' },
  ];

  readonly totalRecords = computed(() => this.records().length);

  readonly filterRows = computed<OvertimeFilterRow[]>(() => this.records().map((record) => ({
    record,
    departmentName: this.departmentValue(record),
    branchName: this.branchValue(record),
    reportingManager: record.reportingManager,
    employeeId: record.employeeId,
    employeeIdNumber: this.employeeIdNumber(record.employeeId),
  })));

  readonly filteredRecords = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    const filteredRows = this.tableFilter
      .filterItems(this.filterRows(), this.overtimeDataFilter)
      .filter((row) => {
        const employeeKeys = this.attendanceEmployeeKeys();
        return !employeeKeys || employeeKeys.has(canonicalAttendanceKey(row.employeeId));
      });

    return filteredRows.map(({ record }) => {
      if (!query) {
        return record;
      }

      const searchable = [
        record.employeeId,
        record.employeeName,
        record.shift,
        this.workingHourValue(record),
        this.shiftHoursValue(record),
        this.overtimeHoursValue(record),
        this.formatNumber(record.overtimeRate),
        this.formatNumber(record.exceptionalOt),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query) ? record : null;
    }).filter((record): record is OvertimeListRecord => record !== null);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRecords().length / this.pageSize())));
  readonly paginationItems = computed<PaginationFooterItem[]>(() =>
    buildPaginationFooterItems(this.totalPages(), this.currentPage()),
  );
  readonly paginatedRecords = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRecords().slice(start, start + this.pageSize());
  });
  readonly paginationStart = computed(() =>
    this.filteredRecords().length ? (this.currentPage() - 1) * this.pageSize() + 1 : 0,
  );
  readonly paginationEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.filteredRecords().length),
  );

  ngOnInit(): void {
    this.loadOvertimeList();
    this.loadWorkstations();
    this.departmentService.ensureLoaded().subscribe();
  }

  loadOvertimeList(forceRefresh = false): void {
    this.loading.set(true);
    this.overtimeListService
      .fetchOvertimeList(forceRefresh)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (records) => {
          this.records.set(records);
          this.currentPage.set(1);
          this.loading.set(false);
          if (!records.some((record) => record.shiftLookupLoading)) {
            if (!this.attendanceStarted) {
              this.attendanceStarted = true;
              this.loadAttendanceForDateFilter(false);
            } else {
              this.loadEmployeeWorkingHours(this.attendanceQueryForAppliedDateFilter());
            }
          }
        },
        error: (error: unknown) => {
          this.records.set([]);
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load overtime list.'),
          );
        },
      });
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
  }

  onTableFilterApplied(): void {
    this.currentPage.set(1);
    this.loadAttendanceForDateFilter();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize.set(Number(value));
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
  }

  trackPaginationItem(index: number, item: PaginationFooterItem): string {
    return paginationItemTrack(index, item);
  }

  cellValue(record: OvertimeListRecord, key: OvertimeColumnKey): string {
    switch (key) {
      case 'shift':
        return record.shift;
      case 'workingHour':
        return this.workingHourValue(record);
      case 'shiftHours':
        return this.shiftHoursValue(record);
      case 'overtimeHours':
        return this.overtimeHoursValue(record);
      case 'overtimeRate':
      case 'exceptionalOt':
        return this.formatNumber(record[key]);
      default: {
        const value = record[key];
        if (value === null || value === undefined || value === '') {
          return '—';
        }
        return String(value);
      }
    }
  }

  private formatNumber(value: number): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private workingHourValue(record: OvertimeListRecord): string {
    if (this.workingHoursLoading()) {
      return 'Loading…';
    }
    return this.attendanceWorkingHours().get(canonicalAttendanceKey(record.employeeId)) ?? '—';
  }

  private overtimeHoursValue(record: OvertimeListRecord): string {
    if (this.workingHoursLoading() || record.shiftLookupLoading || this.workstationLoading()) {
      return 'Loading…';
    }

    const workingHours = this.attendanceWorkingHours().get(canonicalAttendanceKey(record.employeeId));
    const workingMinutes = workingHours ? this.durationTextToMinutes(workingHours) : null;
    const shiftMinutes = this.shiftDurationMinutes(record);
    if (workingMinutes === null || shiftMinutes === null) {
      return '—';
    }

    const overtimeMinutes = shiftMinutes - workingMinutes;
    if (overtimeMinutes === 0) {
      return '0h';
    }
    const duration = formatWorkingDuration(Math.abs(overtimeMinutes));
    return overtimeMinutes < 0 ? `-${duration}` : duration;
  }

  private durationTextToMinutes(value: string): number | null {
    const normalized = value.trim();
    const durationMatch = normalized.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?$/i);
    if (durationMatch && (durationMatch[1] || durationMatch[2])) {
      return Number(durationMatch[1] ?? 0) * 60 + Number(durationMatch[2] ?? 0);
    }

    const clockMatch = normalized.match(/^(\d+):([0-5]\d)$/);
    return clockMatch ? Number(clockMatch[1]) * 60 + Number(clockMatch[2]) : null;
  }

  private shiftHoursValue(record: OvertimeListRecord): string {
    if (record.shiftLookupLoading || this.workstationLoading()) {
      return 'Loading…';
    }
    if (!record.shift) {
      return '—';
    }

    const shiftDurations = record.shift.split(',').map((shiftCode) => {
      const workstation = this.workstationForShiftCode(shiftCode);
      if (!workstation) {
        return '—';
      }

      const schedule = this.shiftScheduleFor(workstation);
      if (!schedule) {
        return '—';
      }

      const endDisplayMinutes = (schedule.startMinutes + schedule.durationMinutes) % (24 * 60);
      return `${formatWorkingDuration(schedule.durationMinutes)} (${this.formatShiftTime(schedule.startMinutes)} - ${this.formatShiftTime(endDisplayMinutes)})`;
    });

    return shiftDurations.length === 1 ? shiftDurations[0] : shiftDurations.join(', ');
  }

  private shiftDurationMinutes(record: OvertimeListRecord): number | null {
    if (!record.shift) {
      return null;
    }

    const shiftDurations = record.shift.split(',').map((shiftCode) => {
      const workstation = this.workstationForShiftCode(shiftCode);
      return workstation ? this.shiftScheduleFor(workstation)?.durationMinutes ?? null : null;
    });
    if (shiftDurations.some((duration) => duration === null)) {
      return null;
    }

    return shiftDurations.reduce<number>((total, duration) => total + (duration ?? 0), 0);
  }

  private workstationForShiftCode(shiftCode: string): WorkstationRecord | undefined {
    const normalizedCode = this.normalizeShiftCode(shiftCode);
    const workstations = this.workstations();
    return workstations.find((item) =>
      [String(item.id), item.code, item.shift, item.name, item.description]
        .some((value) => this.normalizeShiftCode(value) === normalizedCode),
    ) ?? workstations.find((item) => this.shiftCodeMatches(normalizedCode, item.shift));
  }

  private shiftScheduleFor(workstation: WorkstationRecord): { startMinutes: number; durationMinutes: number } | null {
    const startMinutes = this.timeToMinutes(workstation.officeInTime);
    const endMinutes = this.timeToMinutes(workstation.officeOutTime);
    if (startMinutes === null || endMinutes === null) {
      return null;
    }

    let durationMinutes = (endMinutes - startMinutes + 24 * 60) % (24 * 60);
    const hasExplicitMeridiem = /\s*(AM|PM)\s*$/i.test(workstation.officeInTime)
      || /\s*(AM|PM)\s*$/i.test(workstation.officeOutTime);
    if (!hasExplicitMeridiem && durationMinutes > 12 * 60) {
      durationMinutes -= 12 * 60;
    }
    return durationMinutes > 0 ? { startMinutes, durationMinutes } : null;
  }

  private formatShiftTime(minutes: number): string {
    const hour = Math.floor(minutes / 60) % 24;
    const displayHour = hour % 12 || 12;
    const minute = String(minutes % 60).padStart(2, '0');
    const meridiem = hour < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minute} ${meridiem}`;
  }

  private normalizeShiftCode(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    const label = normalized.replace(/\s+shift$/, '').trim();
    const aliases: Record<string, string> = {
      m: 'morning',
      e: 'evening',
      n: 'night',
    };
    return aliases[label] ?? label;
  }

  private shiftCodeMatches(normalizedCode: string, workstationValue: string): boolean {
    const normalizedWorkstationValue = this.normalizeShiftCode(workstationValue);
    if (normalizedCode === normalizedWorkstationValue) {
      return true;
    }

    const compactCode = workstationValue
      .trim()
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 3)
      .toLowerCase();
    return normalizedCode === compactCode;
  }

  private loadWorkstations(): void {
    this.workstationLoading.set(true);
    this.workstationService
      .fetchWorkstations()
      .pipe(finalize(() => this.workstationLoading.set(false)))
      .subscribe({
        next: (workstations) => this.workstations.set(workstations),
        error: (error: unknown) => {
          this.workstations.set([]);
          void this.alertService.error(
            'Shift Hours Load Failed',
            formatApiErrorMessage(error, 'Failed to load workstation shift hours.'),
          );
        },
      });
  }

  private timeToMinutes(value: string): number | null {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) {
      return null;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();
    if (hours > (meridiem ? 12 : 23) || hours < (meridiem ? 1 : 0) || minutes > 59) {
      return null;
    }
    if (meridiem) {
      hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
    }
    return hours * 60 + minutes;
  }

  private departmentValue(record: OvertimeListRecord): string {
    return this.departmentService.resolveDepartmentName(record.department);
  }

  private branchValue(record: OvertimeListRecord): string {
    return resolveBranchNameFromBplId(record.branch);
  }

  private employeeIdNumber(employeeId: string): number | null {
    const digits = employeeId.match(/\d+/)?.[0];
    if (!digits) {
      return null;
    }
    const value = Number(digits);
    return Number.isFinite(value) ? value : null;
  }

  private loadAttendanceForDateFilter(filterByAttendanceDate = true): void {
    const appliedDateRange = this.tableFilter.getApplied(this.overtimeTableFilter)['attendanceDate'];
    const hasDateRange = !!(
      appliedDateRange && typeof appliedDateRange === 'object' && 'from' in appliedDateRange
      && ((typeof appliedDateRange.from === 'string' && appliedDateRange.from)
        || ('to' in appliedDateRange && typeof appliedDateRange.to === 'string' && appliedDateRange.to))
    );
    const query = this.attendanceQueryForAppliedDateFilter();
    if (!hasDateRange && filterByAttendanceDate) {
      this.attendanceEmployeeKeys.set(null);
      this.loadEmployeeWorkingHours(query);
      return;
    }

    this.loadEmployeeWorkingHours(query);
    this.attendanceFilterLoading.set(true);
    this.attendanceService.loadSession(query)
      .pipe(finalize(() => this.attendanceFilterLoading.set(false)))
      .subscribe({
        next: () => {
          const employeeKeys = new Set<string>();
          for (const slot of this.attendanceService.slots()) {
            const employeeKey = canonicalAttendanceKey(slot.employeeKey);
            if (!employeeKey) {
              continue;
            }
            employeeKeys.add(employeeKey);
          }
          if (filterByAttendanceDate) {
            this.attendanceEmployeeKeys.set(employeeKeys);
          }
        },
        error: (error: unknown) => {
          if (filterByAttendanceDate) {
            this.attendanceEmployeeKeys.set(new Set());
          }
          void this.alertService.error(
            'Attendance Load Failed',
            formatApiErrorMessage(error, 'Failed to load attendance for the selected dates.'),
          );
        },
      });
  }

  private attendanceQueryForAppliedDateFilter(): AttendanceQuery {
    const appliedDateRange = this.tableFilter.getApplied(this.overtimeTableFilter)['attendanceDate'];
    const fromDate = appliedDateRange && typeof appliedDateRange === 'object' && 'from' in appliedDateRange
      && typeof appliedDateRange.from === 'string'
      ? appliedDateRange.from
      : '';
    const toDate = appliedDateRange && typeof appliedDateRange === 'object' && 'to' in appliedDateRange
      && typeof appliedDateRange.to === 'string'
      ? appliedDateRange.to
      : '';
    const startDate = fromDate || toDate;
    const endDate = toDate || fromDate;
    if (!startDate || !endDate) {
      return { mode: 'date', date: formatIsoDate(new Date()) };
    }

    return startDate === endDate
      ? { mode: 'date', date: startDate }
      : { mode: 'dateRange', fromDate: startDate, toDate: endDate };
  }

  private loadEmployeeWorkingHours(query: AttendanceQuery): void {
    const requestId = ++this.workingHoursRequestId;
    const employees = this.records().filter((record) => record.extEmpNo);
    this.workingHoursLoading.set(true);

    from(employees).pipe(
      mergeMap((record) => this.attendanceService
        .fetchCalculatedWorkingHours(query, record.extEmpNo)
        .pipe(map((hours) => ({ employeeId: record.employeeId, hours }))), 6),
      toArray(),
      finalize(() => {
        if (requestId === this.workingHoursRequestId) {
          this.workingHoursLoading.set(false);
        }
      }),
    ).subscribe((results) => {
      if (requestId !== this.workingHoursRequestId) {
        return;
      }
      const workingHours = new Map<string, string>();
      for (const result of results) {
        if (result.hours) {
          workingHours.set(canonicalAttendanceKey(result.employeeId), result.hours);
        }
      }
      this.attendanceWorkingHours.set(workingHours);
    });
  }

}
