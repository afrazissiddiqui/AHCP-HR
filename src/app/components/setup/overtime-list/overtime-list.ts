import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AttendanceManagementService, AttendanceQuery, canonicalAttendanceKey } from '../../../services/attendance-management.service';
import { AlertService } from '../../../services/alert.service';
import { OvertimeListRecord, OvertimeListService } from '../../../services/overtime-list.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { buildPaginationFooterItems, paginationItemTrack, PaginationFooterItem } from '../../../utils/pagination.util';
import { GatePassDepartmentService } from '../../gate-pass/gate-pass-department.service';
import { resolveBranchNameFromBplId } from '../../../utils/branch-name.util';
import { OVERTIME_TABLE_FILTER, TableFilterComponent, TableFilterConfig, TableFilterService } from '../../table-filter';

type OvertimeColumnKey =
  | 'employeeId'
  | 'employeeName'
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
  private readonly departmentService = inject(GatePassDepartmentService);
  private readonly alertService = inject(AlertService);
  readonly tableFilter = inject(TableFilterService);
  readonly attendanceFilterLoading = signal(false);

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

  readonly columns: OvertimeTableColumn[] = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee Name' },
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

  private loadAttendanceForDateFilter(): void {
    const appliedDateRange = this.tableFilter.getApplied(this.overtimeTableFilter)['attendanceDate'];
    if (!appliedDateRange || typeof appliedDateRange !== 'object' || !('from' in appliedDateRange)) {
      this.attendanceEmployeeKeys.set(null);
      return;
    }

    const fromDate = typeof appliedDateRange.from === 'string' ? appliedDateRange.from : '';
    const toDate = typeof appliedDateRange.to === 'string' ? appliedDateRange.to : '';
    if (!fromDate && !toDate) {
      this.attendanceEmployeeKeys.set(null);
      return;
    }

    const startDate = fromDate || toDate;
    const endDate = toDate || fromDate;
    const query: AttendanceQuery = startDate === endDate
      ? { mode: 'date', date: startDate }
      : { mode: 'dateRange', fromDate: startDate, toDate: endDate };

    this.attendanceFilterLoading.set(true);
    this.attendanceService.loadSession(query)
      .pipe(finalize(() => this.attendanceFilterLoading.set(false)))
      .subscribe({
        next: () => {
          this.attendanceEmployeeKeys.set(new Set(
            this.attendanceService.slots()
              .map((slot) => canonicalAttendanceKey(slot.employeeKey))
              .filter(Boolean),
          ));
        },
        error: (error: unknown) => {
          this.attendanceEmployeeKeys.set(new Set());
          void this.alertService.error(
            'Attendance Load Failed',
            formatApiErrorMessage(error, 'Failed to load attendance for the selected dates.'),
          );
        },
      });
  }

}
