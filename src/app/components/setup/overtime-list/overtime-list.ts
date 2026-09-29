import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AttendanceManagementService,
  AttendanceQuery,
  canonicalAttendanceKey,
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
  private readonly attendanceWorkingMinutes = signal<Map<string, number> | null>(null);
  private attendanceStarted = false;

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
        this.formatNumber(record.overtimeHours),
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
          if (!this.attendanceStarted) {
            this.attendanceStarted = true;
            this.loadAttendanceForDateFilter(false);
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
    if (this.attendanceFilterLoading()) {
      return 'Loading…';
    }
    const minutes = this.attendanceWorkingMinutes()?.get(canonicalAttendanceKey(record.employeeId)) ?? 0;
    return formatWorkingDuration(minutes);
  }

  private shiftHoursValue(record: OvertimeListRecord): string {
    if (record.shiftLookupLoading || this.workstationLoading()) {
      return 'Loading…';
    }
    if (!record.shift) {
      return '—';
    }

    const shiftDurations = record.shift.split(',').map((shiftCode) => {
      const normalizedCode = this.normalizeShiftCode(shiftCode);
      const workstations = this.workstations();
      const workstation = workstations.find((item) =>
        [item.code, item.shift, item.name, item.description]
          .some((value) => this.normalizeShiftCode(value) === normalizedCode),
      ) ?? workstations.find((item) => this.shiftCodeMatches(normalizedCode, item.shift));
      if (!workstation) {
        return '—';
      }

      const startMinutes = this.timeToMinutes(workstation.officeInTime);
      const endMinutes = this.timeToMinutes(workstation.officeOutTime);
      if (startMinutes === null || endMinutes === null) {
        return '—';
      }

      const durationMinutes = (endMinutes - startMinutes + 24 * 60) % (24 * 60);
      return formatWorkingDuration(durationMinutes);
    });

    return shiftDurations.length === 1 ? shiftDurations[0] : shiftDurations.join(', ');
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
    if (!appliedDateRange || typeof appliedDateRange !== 'object' || !('from' in appliedDateRange)) {
      if (filterByAttendanceDate) {
        this.attendanceEmployeeKeys.set(null);
        this.attendanceWorkingMinutes.set(null);
        return;
      }
    }

    const fromDate = appliedDateRange && typeof appliedDateRange === 'object' && 'from' in appliedDateRange
      && typeof appliedDateRange.from === 'string'
      ? appliedDateRange.from
      : '';
    const toDate = appliedDateRange && typeof appliedDateRange === 'object' && 'to' in appliedDateRange
      && typeof appliedDateRange.to === 'string'
      ? appliedDateRange.to
      : '';
    if (!fromDate && !toDate) {
      if (filterByAttendanceDate) {
        this.attendanceEmployeeKeys.set(null);
        this.attendanceWorkingMinutes.set(null);
        return;
      }
    }

    const startDate = fromDate || toDate;
    const endDate = toDate || fromDate;
    const query: AttendanceQuery = startDate && endDate
      ? startDate === endDate
        ? { mode: 'date', date: startDate }
        : { mode: 'dateRange', fromDate: startDate, toDate: endDate }
      : { mode: 'today' };

    this.attendanceFilterLoading.set(true);
    this.attendanceService.loadSession(query)
      .pipe(finalize(() => this.attendanceFilterLoading.set(false)))
      .subscribe({
        next: () => {
          const workingMinutes = new Map<string, number>();
          const employeeKeys = new Set<string>();
          for (const slot of this.attendanceService.slots()) {
            const employeeKey = canonicalAttendanceKey(slot.employeeKey);
            if (!employeeKey) {
              continue;
            }
            employeeKeys.add(employeeKey);
            workingMinutes.set(employeeKey, (workingMinutes.get(employeeKey) ?? 0) + slot.workingMinutes);
          }
          this.attendanceWorkingMinutes.set(workingMinutes);
          if (filterByAttendanceDate) {
            this.attendanceEmployeeKeys.set(employeeKeys);
          }
        },
        error: (error: unknown) => {
          if (filterByAttendanceDate) {
            this.attendanceEmployeeKeys.set(new Set());
          }
          this.attendanceWorkingMinutes.set(null);
          void this.alertService.error(
            'Attendance Load Failed',
            formatApiErrorMessage(error, 'Failed to load attendance for the selected dates.'),
          );
        },
      });
  }

}
