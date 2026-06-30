import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnResizeDirective } from '../../../../column-resize';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { AlertService } from '../../../../services/alert.service';
import {
  AttendanceListRecord,
  AttendanceManagementService,
  AttendanceRecord,
} from '../../../../services/attendance-management.service';
import { ShellbarSearchService } from '../../../../services/shellbar-search.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { connectShellbarSearch } from '../../../../utils/shellbar-search-connect.util';
import { displayDateOnly } from '../../../../utils/date-format.util';
import { PayrollMasterLayoutService } from '../payroll-master-layout.service';

type AttendanceColumnKey = Exclude<keyof AttendanceListRecord, 'selected' | 'Id' | 'Remarks'>;

@Component({
  selector: 'app-attendance-managment',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, PageToolbarComponent],
  templateUrl: './attendance-managment.html',
  styleUrls: ['../../Application-Form/Application-Form.css', './attendance-managment.css'],
})
export class AttendanceManagmentComponent implements OnInit {
  private readonly layout = inject(PayrollMasterLayoutService);
  private readonly attendanceService = inject(AttendanceManagementService);
  private readonly alertService = inject(AlertService);
  private readonly shellbarSearch = inject(ShellbarSearchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly showViewDialog = signal(false);
  readonly viewLoading = signal(false);
  readonly selectedRecord = signal<AttendanceRecord | null>(null);

  Math = Math;
  searchText = '';
  selectedStatus = '';
  selectedMonth = '';
  selectedYear = '';
  showDialog = false;
  activeTab: 'filter' = 'filter';
  sortColumn: AttendanceColumnKey | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50, 100];

  readonly columns: Array<{ key: AttendanceColumnKey; label: string; visible: boolean }> = [
    { key: 'EmployeeCode', label: 'Employee Code', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'AttendanceDate', label: 'Attendance Date', visible: true },
    { key: 'Shift', label: 'Shift', visible: true },
    { key: 'CheckIn', label: 'Check In', visible: true },
    { key: 'CheckOut', label: 'Check Out', visible: true },
    { key: 'WorkingHours', label: 'Working Hours', visible: true },
    { key: 'LateMinutes', label: 'Late (min)', visible: true },
    { key: 'EarlyLeaveMinutes', label: 'Early Leave (min)', visible: false },
    { key: 'OvertimeHours', label: 'Overtime (hrs)', visible: true },
    { key: 'Status', label: 'Status', visible: true },
    { key: 'PayrollMonth', label: 'Payroll Month', visible: false },
    { key: 'PayrollYear', label: 'Payroll Year', visible: false },
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

  get attendanceList(): AttendanceListRecord[] {
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

  get monthOptions(): number[] {
    const seen = new Set<number>();
    for (const row of this.attendanceList) {
      if (row.PayrollMonth) {
        seen.add(row.PayrollMonth);
      }
    }
    return Array.from(seen).sort((a, b) => a - b);
  }

  get yearOptions(): number[] {
    const seen = new Set<number>();
    for (const row of this.attendanceList) {
      if (row.PayrollYear) {
        seen.add(row.PayrollYear);
      }
    }
    return Array.from(seen).sort((a, b) => b - a);
  }

  get filteredList(): AttendanceListRecord[] {
    let list = this.attendanceList;

    if (this.selectedStatus) {
      list = list.filter((row) => row.Status === this.selectedStatus);
    }

    if (this.selectedMonth) {
      const month = Number(this.selectedMonth);
      list = list.filter((row) => row.PayrollMonth === month);
    }

    if (this.selectedYear) {
      const year = Number(this.selectedYear);
      list = list.filter((row) => row.PayrollYear === year);
    }

    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      list = list.filter((row) =>
        row.EmployeeCode.toLowerCase().includes(search) ||
        row.EmployeeName.toLowerCase().includes(search) ||
        row.Department.toLowerCase().includes(search) ||
        row.AttendanceDate.toLowerCase().includes(search) ||
        row.Shift.toLowerCase().includes(search) ||
        row.CheckIn.toLowerCase().includes(search) ||
        row.CheckOut.toLowerCase().includes(search) ||
        row.Status.toLowerCase().includes(search) ||
        row.Remarks.toLowerCase().includes(search) ||
        String(row.WorkingHours).includes(search) ||
        String(row.LateMinutes).includes(search) ||
        String(row.OvertimeHours).includes(search),
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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginatedList(): AttendanceListRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get selectedCount(): number {
    return this.attendanceList.filter((row) => row.selected).length;
  }

  hasActiveListFilters(): boolean {
    return !!this.selectedStatus || !!this.selectedMonth || !!this.selectedYear || !!this.searchText.trim();
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
    this.sortDirection = 'asc';
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

  displayCellValue(row: AttendanceListRecord, key: AttendanceColumnKey): string | number {
    if (key === 'AttendanceDate') {
      return this.formatAttendanceDate(row.AttendanceDate);
    }
    if (key === 'PayrollMonth') {
      return this.formatMonth(row.PayrollMonth);
    }
    if (key === 'WorkingHours' || key === 'OvertimeHours') {
      return this.formatHours(row[key]);
    }
    return row[key];
  }

  formatAttendanceDate(value: string): string {
    return displayDateOnly(value) || value || '—';
  }

  formatMonth(month: number): string {
    const labels = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return labels[month] ?? String(month || '—');
  }

  formatHours(value: number): string {
    if (!value) {
      return '0.00';
    }
    return value.toFixed(2);
  }

  getStatusClass(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'present':
        return 'attendance-status--present';
      case 'absent':
        return 'attendance-status--absent';
      case 'half day':
        return 'attendance-status--half-day';
      case 'leave':
        return 'attendance-status--leave';
      case 'holiday':
        return 'attendance-status--holiday';
      case 'weekend':
        return 'attendance-status--weekend';
      default:
        return 'attendance-status--default';
    }
  }

  viewRecord(record: AttendanceListRecord): void {
    if (!record.Id) {
      void this.alertService.warning('View', 'Unable to view this row: missing attendance id.');
      return;
    }

    this.showViewDialog.set(true);
    this.selectedRecord.set(null);
    this.viewLoading.set(true);

    this.attendanceService.fetchAttendanceDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRecord.set(detail);
        this.viewLoading.set(false);
      },
      error: (error: unknown) => {
        this.viewLoading.set(false);
        this.showViewDialog.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load attendance details.'),
        );
      },
    });
  }

  closeViewDialog(): void {
    this.showViewDialog.set(false);
    this.selectedRecord.set(null);
    this.viewLoading.set(false);
  }

  private loadRecords(): void {
    this.loading.set(true);
    this.attendanceService.fetchAttendanceList().subscribe({
      next: () => {
        this.loading.set(false);
        if (!this.selectedMonth && this.monthOptions.length) {
          this.selectedMonth = String(this.monthOptions[this.monthOptions.length - 1]);
        }
        if (!this.selectedYear && this.yearOptions.length) {
          this.selectedYear = String(this.yearOptions[0]);
        }
      },
      error: (error: unknown) => {
        this.loading.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load attendance records.'),
        );
      },
    });
  }

  private getSortableValue(row: AttendanceListRecord, key: AttendanceColumnKey): string | number {
    if (key === 'AttendanceDate') {
      return row.AttendanceDate;
    }
    if (key === 'PayrollMonth' || key === 'PayrollYear') {
      return row[key];
    }
    if (key === 'WorkingHours' || key === 'LateMinutes' || key === 'EarlyLeaveMinutes' || key === 'OvertimeHours') {
      return row[key];
    }
    return String(row[key] ?? '').toLowerCase();
  }
}
