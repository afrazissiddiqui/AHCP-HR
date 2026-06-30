import { CommonModule } from '@angular/common';

import { Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ColumnResizeDirective } from '../../../../column-resize';

import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';

import { AlertService } from '../../../../services/alert.service';

import {

  AttendanceDailyRecord,

  AttendanceManagementService,

  AttendanceQuery,

  AttendanceQueryMode,

  formatIsoDate,

  formatPunchDate,

  formatPunchTime,

  formatWorkingDuration,

} from '../../../../services/attendance-management.service';

import { ShellbarSearchService } from '../../../../services/shellbar-search.service';

import { formatApiErrorMessage } from '../../../../utils/api-error.util';

import { connectShellbarSearch } from '../../../../utils/shellbar-search-connect.util';

import { PayrollMasterLayoutService } from '../payroll-master-layout.service';



type AttendanceColumnKey =

  | 'EmployeeId'

  | 'EmployeeName'

  | 'AttendanceDate'

  | 'PunchIn'

  | 'PunchOut'

  | 'WorkingHours'

  | 'PunchInDevice'

  | 'PunchOutDevice'

  | 'PunchCount'

  | 'AttendanceStatus';



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

  readonly selectedRecord = signal<AttendanceDailyRecord | null>(null);



  Math = Math;

  searchText = '';

  selectedStatus = '';

  queryMode: AttendanceQueryMode = 'today';

  userId = '';

  selectedDate = formatIsoDate(new Date());

  fromDate = formatIsoDate(new Date());

  toDate = formatIsoDate(new Date());

  showDialog = false;

  activeTab: 'filter' = 'filter';

  sortColumn: AttendanceColumnKey | '' = 'AttendanceDate';

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

    { key: 'EmployeeId', label: 'User ID', visible: true },

    { key: 'EmployeeName', label: 'Employee Name', visible: true },

    { key: 'AttendanceDate', label: 'Date', visible: true },

    { key: 'PunchIn', label: 'Punch In', visible: true },

    { key: 'PunchOut', label: 'Punch Out', visible: true },

    { key: 'WorkingHours', label: 'Working Hours', visible: true },

    { key: 'PunchInDevice', label: 'In Device', visible: false },

    { key: 'PunchOutDevice', label: 'Out Device', visible: false },

    { key: 'PunchCount', label: 'Punches', visible: false },

    { key: 'AttendanceStatus', label: 'Status', visible: true },

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



  get attendanceList(): AttendanceDailyRecord[] {

    return this.attendanceService.records();

  }



  get statusOptions(): string[] {

    return ['Present', 'Absent'];

  }



  get filteredList(): AttendanceDailyRecord[] {

    let list = this.attendanceList;



    if (this.selectedStatus) {

      list = list.filter((row) => row.AttendanceStatus === this.selectedStatus);

    }



    if (this.searchText.trim()) {

      const search = this.searchText.toLowerCase();

      list = list.filter((row) =>

        row.EmployeeId.toLowerCase().includes(search) ||

        row.EmployeeName.toLowerCase().includes(search) ||

        row.AttendanceDate.toLowerCase().includes(search) ||

        formatPunchDate(row.AttendanceDate).toLowerCase().includes(search) ||

        formatPunchTime(row.PunchIn).toLowerCase().includes(search) ||

        formatPunchTime(row.PunchOut).toLowerCase().includes(search) ||

        row.AttendanceStatus.toLowerCase().includes(search),

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



  get visibleStatusColumnCount(): number {

    return this.visibleColumns.filter((column) => this.getColumnGroup(column.key) === 'status').length;

  }



  get totalPages(): number {

    return Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));

  }



  get pages(): number[] {

    return Array.from({ length: this.totalPages }, (_, index) => index + 1);

  }



  get paginatedList(): AttendanceDailyRecord[] {

    const start = (this.currentPage - 1) * this.pageSize;

    return this.filteredList.slice(start, start + this.pageSize);

  }



  get selectedCount(): number {

    return this.attendanceList.filter((row) => row.selected).length;

  }



  get presentCount(): number {

    return this.filteredList.filter((row) => row.AttendanceStatus === 'Present').length;

  }



  get absentCount(): number {

    return this.filteredList.filter((row) => row.AttendanceStatus === 'Absent').length;

  }



  get totalPunchCount(): number {

    return this.filteredList.reduce((sum, row) => sum + row.PunchCount, 0);

  }



  getColumnGroup(key: AttendanceColumnKey): 'identity' | 'time' | 'status' {

    switch (key) {

      case 'EmployeeId':

      case 'EmployeeName':

        return 'identity';

      case 'AttendanceDate':

      case 'PunchIn':

      case 'PunchOut':

      case 'WorkingHours':

      case 'PunchInDevice':

      case 'PunchOutDevice':

      case 'PunchCount':

        return 'time';

      default:

        return 'status';

    }

  }



  getColumnGroupClass(key: AttendanceColumnKey): string {

    return `attendance-col--${this.getColumnGroup(key)}`;

  }



  get currentQueryLabel(): string {

    const userSuffix = this.userId.trim() ? ` · User ${this.userId.trim()}` : '';

    switch (this.queryMode) {

      case 'today':

        return `Today${userSuffix}`;

      case 'date':

        return `${this.selectedDate}${userSuffix}`;

      case 'dateRange':

        return `${this.fromDate} to ${this.toDate}${userSuffix}`;

    }

  }



  hasActiveListFilters(): boolean {

    return !!this.selectedStatus || !!this.searchText.trim();

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

    this.sortDirection =

      column === 'AttendanceDate' || column === 'PunchIn' || column === 'PunchOut' ? 'desc' : 'asc';

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



  displayCellValue(row: AttendanceDailyRecord, key: AttendanceColumnKey): string | number {

    switch (key) {

      case 'AttendanceDate':

        return formatPunchDate(row.AttendanceDate);

      case 'PunchIn':

        return formatPunchTime(row.PunchIn);

      case 'PunchOut':

        return formatPunchTime(row.PunchOut);

      case 'WorkingHours':

        return formatWorkingDuration(row.WorkingMinutes);

      case 'AttendanceStatus':

        return row.AttendanceStatus;

      case 'PunchCount':

        return row.PunchCount;

      default:

        return String(row[key] ?? '—') || '—';

    }

  }



  formatAttendanceDate = formatPunchDate;

  formatAttendanceTime = formatPunchTime;

  formatWorkingDuration = formatWorkingDuration;



  getStatusClass(status: string): string {

    const normalized = status.trim().toLowerCase();

    if (normalized === 'present') {

      return 'attendance-status--present';

    }

    if (normalized === 'absent') {

      return 'attendance-status--absent';

    }

    return 'attendance-status--default';

  }



  viewRecord(record: AttendanceDailyRecord): void {

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

      userId: this.userId,

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



  private getSortableValue(row: AttendanceDailyRecord, key: AttendanceColumnKey): string | number {

    switch (key) {

      case 'AttendanceDate':

        return row.AttendanceDate;

      case 'PunchIn':

        return row.PunchIn || '';

      case 'PunchOut':

        return row.PunchOut || '';

      case 'WorkingHours':

        return row.WorkingMinutes;

      case 'PunchCount':

        return row.PunchCount;

      default:

        return String(row[key] ?? '').toLowerCase();

    }

  }

}


