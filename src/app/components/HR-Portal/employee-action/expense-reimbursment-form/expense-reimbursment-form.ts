import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import {
  ExpenseReimbursementRecord,
  ExpenseReimbursementService,
} from '../../../../services/expense-reimbursement.service';
import { AlertService } from '../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { displayDateSlash, formatTableCellValue } from '../../../../utils/date-format.util';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';
import {
  EXPENSE_REIMBURSEMENT_TABLE_FILTER,
  TableFilterComponent,
  TableFilterService,
} from '../../../table-filter';
import { ShellbarSearchService } from '../../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../../utils/shellbar-search-connect.util';

type ExpenseColumnKey = Exclude<
  keyof ExpenseReimbursementRecord,
  'selected' | 'Id' | 'HeaderFields' | 'ExpenseDetail' | 'Travel'
>;

@Component({
  selector: 'app-expense-reimbursment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent, PageToolbarComponent, TableFilterComponent],
  templateUrl: './expense-reimbursment-form.html',
  styleUrls: ['../../Application-Form/Application-Form.css'],
  styles: [`
    :host .table-scroll { overflow-x: auto; }
    :host .mountain-table { width: 100%; min-width: 1000px; table-layout: auto; }
    :host .mountain-table th, :host .mountain-table td {
      min-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    :host .mountain-table th:first-child, :host .mountain-table td:first-child {
      min-width: 40px;
      width: 40px;
    }
    :host .mountain-table th:last-child, :host .mountain-table td:last-child {
      position: sticky;
      right: 0;
      z-index: 11;
      background: #ffffff;
      border-left: 1px solid #eee;
      box-shadow: -2px 0 5px rgba(0, 0, 0, 0.05);
    }
    :host .mountain-table thead th:last-child {
      z-index: 12;
      background: #f5f5f5;
    }
  `],
})
export class ExpenseReimbursmentFormComponent implements OnInit {
  readonly expenseTableFilter = EXPENSE_REIMBURSEMENT_TABLE_FILTER;
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellbarSearch = inject(ShellbarSearchService);

  constructor(
    private readonly expenseService: ExpenseReimbursementService,
    private readonly router: Router,
    private readonly alertService: AlertService,
    readonly tableFilter: TableFilterService,
  ) {}

  ngOnInit(): void {
    connectShellbarSearch(this.shellbarSearch, this.destroyRef, {
      getSearchText: () => this.searchText,
      setSearchText: (value) => { this.searchText = value; },
      onSearchChange: () => this.onSearchChange(),
    });

    this.expenseService.fetchExpenseReimbursements().subscribe({
      error: (error: unknown) => {
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load expense reimbursements.'),
        );
      },
    });
  }

  Math = Math;

  columns: Array<{ key: ExpenseColumnKey; label: string; visible: boolean }> = [
    { key: 'FormNumber', label: 'Form Number', visible: true },
    { key: 'EmployeeCode', label: 'Employee Code', visible: true },
    { key: 'EmployeeId', label: 'Employee ID', visible: false },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'Designation', label: 'Designation', visible: false },
    // { key: 'CostCenter', label: 'Cost Center', visible: false },
    { key: 'ClaimMonth', label: 'Claim Month', visible: false },
    { key: 'SubmissionDate', label: 'Submission Date', visible: false },
    { key: 'ExpenseType', label: 'Expense Type', visible: true },
    { key: 'ClaimAmount', label: 'Claim Amount', visible: true },
    { key: 'ClaimDate', label: 'Claim Date', visible: true },
    { key: 'ApprovalStatus', label: 'Approval Status', visible: true },
    { key: 'TravelFromDate', label: 'Travel From', visible: false },
    { key: 'TravelToDate', label: 'Travel To', visible: false },
    { key: 'DailyAllowanceApplicable', label: 'Daily Allowance', visible: false },
    { key: 'DailyAllowanceRate', label: 'Allowance Rate', visible: false },
    { key: 'NumberOfDays', label: 'No. of Days', visible: false },
    { key: 'DailyAllowanceAmount', label: 'Allowance Amount', visible: false },
  ];

  sidebarItems: SidebarItem[] = EMPLOYEE_ACTION_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = EMPLOYEE_ACTION_SIDEBAR_SECTIONS;

  activeSidebarItemId = 'expense-reimbursement-form';
  sidebarCollapsed = signal(false);
  searchText = '';
  sortColumn: ExpenseColumnKey = 'FormNumber';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  showDialog = false;
  activeTab: 'filter' = 'filter';
  readonly showViewDialog = signal(false);
  readonly viewLoading = signal(false);
  readonly selectedRecord = signal<ExpenseReimbursementRecord | null>(null);

  get expenseList(): ExpenseReimbursementRecord[] {
    return this.expenseService.expenses();
  }

  get visibleColumns(): Array<{ key: ExpenseColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((col) => col.visible);
  }

  get filteredList(): ExpenseReimbursementRecord[] {
    let list = this.tableFilter.filterItems([...this.expenseList], this.expenseTableFilter);
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter((item) => {
        const haystack = [
          item.FormNumber,
          item.EmployeeCode,
          item.EmployeeId,
          item.EmployeeName,
          item.Department,
          item.Designation,
          item.CostCenter,
          item.ClaimMonth,
          item.SubmissionDate,
          item.ExpenseType,
          item.ClaimAmount,
          item.ClaimDate,
          item.ApprovalStatus,
          item.TravelFromDate,
          item.TravelToDate,
          item.DailyAllowanceApplicable,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }
    list.sort((a, b) => {
      const valueA = a[this.sortColumn];
      const valueB = b[this.sortColumn];
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      return 0;
    });
    return list;
  }

  get paginatedList(): ExpenseReimbursementRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredList.length / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredList.forEach((item) => (item.selected = checked));
  }

  isAllSelected(): boolean {
    return this.filteredList.length > 0 && this.filteredList.every((item) => item.selected);
  }

  getSelectedCount(): number {
    return this.expenseList.filter((item) => item.selected).length;
  }

  onSearchChange(): void {
    this.shellbarSearch.syncQuery(this.searchText);
    this.currentPage = 1;
  }

  hasActiveListFilters(): boolean {
    return this.tableFilter.hasActive(this.expenseTableFilter);
  }

  onTableFilterApplied(): void {
    this.currentPage = 1;
  }

  sortData(column: ExpenseColumnKey): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  viewRecord(record: ExpenseReimbursementRecord): void {
    if (!record.Id) {
      this.alertService.warning('View', 'Unable to view this row: missing expense reimbursement id.');
      return;
    }

    this.showViewDialog.set(true);
    this.selectedRecord.set(null);
    this.viewLoading.set(true);

    this.expenseService.fetchExpenseReimbursementDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRecord.set(detail);
        this.viewLoading.set(false);
      },
      error: (error: unknown) => {
        this.viewLoading.set(false);
        this.showViewDialog.set(false);
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load expense reimbursement details.'),
        );
      },
    });
  }

  onUpdate(record: ExpenseReimbursementRecord): void {
    if (!record.Id) {
      this.alertService.warning('Update', 'Unable to update this row: missing expense reimbursement id.');
      return;
    }
    void this.router.navigate(['/employee-action/expense-reimbursement-form/edit', record.Id]);
  }

  async onDelete(record: ExpenseReimbursementRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete expense reimbursement?',
      `Remove ${record.EmployeeName} (${record.FormNumber}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing expense reimbursement id.');
      return;
    }

    this.expenseService.deleteExpenseReimbursement(record.Id).subscribe({
      next: () => {
        this.expenseService.removeExpenseRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'Expense reimbursement removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete expense reimbursement.'),
        );
      },
    });
  }

  closeViewDialog(): void {
    this.showViewDialog.set(false);
    this.selectedRecord.set(null);
    this.viewLoading.set(false);
  }

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId = folderId;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((state) => !state);
  }

  createNewExpense(): void {
    void this.router.navigateByUrl('/employee-action/expense-reimbursement-form/create');
  }

  formatCellValue(record: ExpenseReimbursementRecord, key: ExpenseColumnKey): string {
    return formatTableCellValue(key, record[key]);
  }

  formatClaimDate(value: string): string {
    return displayDateSlash(value);
  }
}
