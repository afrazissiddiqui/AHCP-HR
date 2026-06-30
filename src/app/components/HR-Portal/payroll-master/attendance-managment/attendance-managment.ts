import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnResizeDirective } from '../../../../column-resize';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { AlertService } from '../../../../services/alert.service';
import {
  AttendanceManagementService,
  AttendancePunchRecord,
  AttendanceQuery,
  AttendanceQueryMode,
  formatIsoDate,
  formatPunchDate,
  formatPunchTime,
} from '../../../../services/attendance-management.service';
import { ShellbarSearchService } from '../../../../services/shellbar-search.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { connectShellbarSearch } from '../../../../utils/shellbar-search-connect.util';
import { PayrollMasterLayoutService } from '../payroll-master-layout.service';

type AttendanceColumnKey = 'No' | 'EmployeeId' | 'PunchDate' | 'PunchTime' | 'PunchDatetime' | 'DeviceNo' | 'Status';

@Component({
  selector: 'app-attendance-managment',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, PageToolbarComponent],
  templateUrl: './attendance-managment.html',
  styleUrls: ['../../Application-Form/Application-Form.css', './attendance-managment.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AttendanceManagmentComponent implements OnInit {
  private readonly layout = inject(PayrollMasterLayoutService);
  private readonly attendanceService = inject(AttendanceManagementService);
  private readonly alertService = inject(AlertService);
  private readonly shellbarSearch = inject(ShellbarSearchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly showViewDialog = signal(false);
  readonly selectedRecord = signal<AttendancePunchRecord | null>(null);

  Math = Math;
  searchText = '';
  selectedStatus = '';
  selectedDeviceNo = '';
  queryMode: AttendanceQueryMode = 'today';
  employeeId = '';
  selectedDate = formatIsoDate(new Date());
  fromDate = formatIsoDate(new Date());
  toDate = formatIsoDate(new Date());
  showDialog = false;
  activeTab: 'filter' = 'filter';
  sortColumn: AttendanceColumnKey | '' = 'PunchDatetime';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 25;
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly queryModeOptions: Array<{ value: AttendanceQueryMode; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'date', label: 'Specific Date' },
    { value: 'dateRange', label: 'Date Range' },
  ];

  readonly columns: Array<{ key: AttendanceColumnKey; label: string; visible: boolean }> = [
    { key: 'No', label: 'No', visible: true },
    { key: 'EmployeeId', label: 'Employee ID', visible: true },
    { key: 'PunchDate', label: 'Punch Date', visible: true },
    { key: 'PunchTime', label: 'Punch Time', visible: true },
    { key: 'PunchDatetime', label: 'Punch Datetime', visible: false },
    { key: 'DeviceNo', label: 'Device No', visible: true },
    { key: 'Status', label: 'Status', visible: true },
  ];

  ngOnInit(): void {
    connectShellbarSearch(this.shellbarSearch, this.destroyRef, {
      getSearchText: () => this.searchText,
      setSearchText: (value) => {
        this.searchText = value;
      },
      onSearchChange: () => this.onSearchChange(),
    });

    this.loadRecords();
  }

  get attendanceList(): AttendancePunchRecord[] {
    return this.attendanceService.records();
  }

  get statusOptions(): string[] {
    const seen = new Set<string>();
    for (const row of this.attendanceList) {
      const status = row.Status?.trim();
      if (status) {
        seen.add(status);
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get deviceOptions(): string[] {
    const seen = new Set<string>();
    for (const row of this.attendanceList) {
      const deviceNo = row.DeviceNo?.trim();
      if (deviceNo) {
        seen.add(deviceNo);
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get filteredList(): AttendancePunchRecord[] {
    let list = this.attendanceList;

    if (this.selectedStatus) {
      list = list.filter((row) => row.Status === this.selectedStatus);
    }

    if (this.selectedDeviceNo) {
      list = list.filter((row) => row.DeviceNo === this.selectedDeviceNo);
    }

    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      list = list.filter((row) =>
        String(row.No).includes(search) ||
        row.EmployeeId.toLowerCase().includes(search) ||
        row.PunchDatetime.toLowerCase().includes(search) ||
        formatPunchDate(row.PunchDatetime).toLowerCase().includes(search) ||
        formatPunchTime(row.PunchDatetime).toLowerCase().includes(search) ||
        row.DeviceNo.toLowerCase().includes(search) ||
        row.Status.toLowerCase().includes(search),
      );
    }

    if (this.sortColumn) {
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      const key = this.sortColumn;
      list = [...list].sort((left, right) => {
        const leftValue = this.getSortableValue(left, key);
        const rightValue = this.getSortableValue(right, key);
        if (leftValue < rightValue) {
          return -1 * direction;
        }
        if (leftValue > rightValue) {
          return 1 * direction;
        }
        return 0;
      });
    }

    return list;
  }

  get visibleColumns(): Array<{ key: AttendanceColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((column) => column.visible);
  }

  get visibleIdentityColumnCount(): number {
    return this.visibleColumns.filter((column) => this.getColumnGroup(column.key) === 'identity').length;
  }

  get visibleTimeColumnCount(): number {
    return this.visibleColumns.filter((column) => this.getColumnGroup(column.key) === 'time').length;
  }

  get visibleDeviceColumnCount(): number {
    return this.visibleColumns.filter((column) => this.getColumnGroup(column.key) === 'device').length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginatedList(): AttendancePunchRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get selectedCount(): number {
    return this.attendanceList.filter((row) => row.selected).length;
  }

  get uniqueEmployeeCount(): number {
    return new Set(this.filteredList.map((row) => row.EmployeeId).filter(Boolean)).size;
  }

  get uniqueDeviceCount(): number {
    return new Set(this.filteredList.map((row) => row.DeviceNo).filter(Boolean)).size;
  }

  getColumnGroup(key: AttendanceColumnKey): 'identity' | 'time' | 'device' {
    switch (key) {
      case 'No':
      case 'EmployeeId':
        return 'identity';
      case 'PunchDate':
      case 'PunchTime':
      case 'PunchDatetime':
        return 'time';
      default:
        return 'device';
    }
  }

  getColumnGroupClass(key: AttendanceColumnKey): string {
    return `attendance-col--${this.getColumnGroup(key)}`;
  }

  get currentQueryLabel(): string {
    const employeeSuffix = this.employeeId.trim() ? ` · Employee ${this.employeeId.trim()}` : '';
    switch (this.queryMode) {
      case 'today':
        return `Today${employeeSuffix}`;
      case 'date':
        return `${this.selectedDate}${employeeSuffix}`;
      case 'dateRange':
        return `${this.fromDate} to ${this.toDate}${employeeSuffix}`;
    }
  }

  hasActiveListFilters(): boolean {
    return !!this.selectedStatus || !!this.selectedDeviceNo || !!this.searchText.trim();
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  onQueryModeChange(): void {
    if (this.queryMode === 'today') {
      this.loadRecords();
    }
  }

  applyQuery(): void {
    this.currentPage = 1;
    this.loadRecords();
  }

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  sortData(column: AttendanceColumnKey): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortColumn = column;
    this.sortDirection = column === 'PunchDatetime' || column === 'PunchDate' || column === 'PunchTime' ? 'desc' : 'asc';
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  isAllSelected(): boolean {
    return this.paginatedList.length > 0 && this.paginatedList.every((row) => row.selected);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    for (const row of this.paginatedList) {
      row.selected = checked;
    }
  }

  displayCellValue(row: AttendancePunchRecord, key: AttendanceColumnKey): string | number {
    switch (key) {
      case 'PunchDate':
        return formatPunchDate(row.PunchDatetime);
      case 'PunchTime':
        return formatPunchTime(row.PunchDatetime);
      case 'PunchDatetime':
        return row.PunchDatetime || '—';
      case 'Status':
        return row.Status || '—';
      default:
        return row[key];
    }
  }

  formatAttendanceDate = formatPunchDate;
  formatAttendanceTime = formatPunchTime;

  getStatusClass(status: string): string {
    const normalized = status.trim().toLowerCase();
    if (!normalized) {
      return 'attendance-status--empty';
    }
    if (normalized.includes('in') || normalized.includes('present')) {
      return 'attendance-status--present';
    }
    if (normalized.includes('out') || normalized.includes('absent')) {
      return 'attendance-status--absent';
    }
    return 'attendance-status--default';
  }

  viewRecord(record: AttendancePunchRecord): void {
    if (!record.No) {
      void this.alertService.warning('View', 'Unable to view this row: missing punch record number.');
      return;
    }

    this.showViewDialog.set(true);
    this.selectedRecord.set(record);
  }

  closeViewDialog(): void {
    this.showViewDialog.set(false);
    this.selectedRecord.set(null);
  }

  private loadRecords(): void {
    this.loading.set(true);

    const query: AttendanceQuery = {
      mode: this.queryMode,
      employeeId: this.employeeId,
      date: this.selectedDate,
      fromDate: this.fromDate,
      toDate: this.toDate,
    };

    this.attendanceService.fetchAttendance(query).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load attendance records from Pioneer Biometrics.'),
        );
      },
    });
  }

  private getSortableValue(row: AttendancePunchRecord, key: AttendanceColumnKey): string | number {
    switch (key) {
      case 'PunchDate':
      case 'PunchTime':
      case 'PunchDatetime':
        return row.PunchDatetime;
      case 'No':
        return row.No;
      default:
        return String(row[key] ?? '').toLowerCase();
    }
  }
}
