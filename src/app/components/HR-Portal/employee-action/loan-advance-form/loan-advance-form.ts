import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import { LoanAdvanceRecord, LoanAdvanceService } from '../../../../services/loan-advance.service';
import { AlertService } from '../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { displayDateSlash } from '../../../../utils/date-format.util';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';
import {
  LOAN_ADVANCE_TABLE_FILTER,
  TableFilterService,
} from '../../../table-filter';
import { ShellbarSearchService } from '../../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../../utils/shellbar-search-connect.util';

type LoanColumnKey = Exclude<
  keyof LoanAdvanceRecord,
  'selected' | 'Id' | 'HeaderInfo' | 'LoanDetail' | 'AdvanceDetail' | 'RepaymentSchedule'
>;

@Component({
  selector: 'app-loan-advance-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent, PageToolbarComponent],
  templateUrl: './loan-advance-form.html',
  styleUrls: ['../../Application-Form/Application-Form.css'],
  styles: [`
    :host .table-scroll { overflow-x: auto; }
    :host .mountain-table { width: 100%; min-width: 1200px; table-layout: auto; }
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
export class LoanAdvanceFormComponent implements OnInit {
  readonly loanTableFilter = LOAN_ADVANCE_TABLE_FILTER;
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellbarSearch = inject(ShellbarSearchService);

  constructor(
    private readonly loanService: LoanAdvanceService,
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

    this.loanService.fetchLoanAdvances().subscribe({
      error: (error: unknown) => {
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load loan / advance requests.'),
        );
      },
    });
  }

  Math = Math;

  columns: Array<{ key: LoanColumnKey; label: string; visible: boolean }> = [
    { key: 'DocumentNo', label: 'Document No', visible: true },
    { key: 'EmployeeID', label: 'Employee ID', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'RequestType', label: 'Request Type', visible: true },
    { key: 'RequestDate', label: 'Request Date', visible: true },
    { key: 'Status', label: 'Status', visible: true },
    { key: 'LoanAmountRequested', label: 'Loan Amount Requested', visible: true },
    { key: 'AdvanceAmountRequested', label: 'Advance Amount Requested', visible: true },
    { key: 'NoOfInstallments', label: 'No. of Installments', visible: true },
    { key: 'EmployeeNature', label: 'Employee Nature', visible: false },
    { key: 'EmploymentType', label: 'Employment Type', visible: false },
    { key: 'Designation', label: 'Designation', visible: false },
    { key: 'WorkGradeLevel', label: 'Work Grade Level', visible: false },
    { key: 'JobTitle', label: 'Job Title', visible: false },
    { key: 'EmployeeCategory', label: 'Employee Category', visible: false },
    { key: 'ReportingManager', label: 'Reporting Manager', visible: false },
    { key: 'Location', label: 'Branch', visible: false },
    { key: 'JoiningDate', label: 'Joining Date', visible: false },
    { key: 'YearsOfService', label: 'Years of Service', visible: false },
    { key: 'PayrollMonth', label: 'Payroll Month', visible: false },
    { key: 'ExistingLoan', label: 'Existing Loan', visible: false },
    { key: 'LoanInstallmentAmount', label: 'Loan Installment Amount', visible: false },
    { key: 'LoanPurpose', label: 'Loan Purpose', visible: false },
    { key: 'LoanEligibleAmount', label: 'Loan Eligible Amount', visible: false },
    { key: 'ExistingAdvance', label: 'Existing Advance', visible: false },
    { key: 'AdvancePurpose', label: 'Advance Purpose', visible: false },
    { key: 'AdvanceEligibleAmount', label: 'Advance Eligible Amount', visible: false },
    { key: 'RepaymentStartDate', label: 'Repayment Start Date', visible: false },
    { key: 'RepaymentFrequency', label: 'Repayment Frequency', visible: false },
    { key: 'DeductionAmount', label: 'Deduction Amount', visible: false },
  ];

  sidebarItems: SidebarItem[] = EMPLOYEE_ACTION_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = EMPLOYEE_ACTION_SIDEBAR_SECTIONS;

  activeSidebarItemId = 'loan-advance-form';
  sidebarCollapsed = signal(false);
  searchText = '';
  sortColumn: LoanColumnKey = 'DocumentNo';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  showDialog = false;
  activeTab: 'filter' = 'filter';
  readonly showViewDialog = signal(false);
  readonly viewLoading = signal(false);
  readonly selectedRecord = signal<LoanAdvanceRecord | null>(null);

  get loanList(): LoanAdvanceRecord[] {
    return this.loanService.loans();
  }

  get visibleColumns(): Array<{ key: LoanColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((col) => col.visible);
  }

  get filteredList(): LoanAdvanceRecord[] {
    let list = this.tableFilter.filterItems([...this.loanList], this.loanTableFilter);
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter((item) => {
        const haystack = [
          item.DocumentNo,
          item.EmployeeID,
          item.EmployeeName,
          item.Department,
          item.RequestType,
          item.RequestDate,
          item.Status,
          item.LoanAmountRequested,
          item.AdvanceAmountRequested,
          item.NoOfInstallments,
          item.EmployeeNature,
          item.EmploymentType,
          item.Designation,
          item.WorkGradeLevel,
          item.JobTitle,
          item.EmployeeCategory,
          item.ReportingManager,
          item.Location,
          item.PayrollMonth,
          item.LoanPurpose,
          item.AdvancePurpose,
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

  get paginatedList(): LoanAdvanceRecord[] {
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
    return this.loanList.filter((item) => item.selected).length;
  }

  onSearchChange(): void {
    this.shellbarSearch.syncQuery(this.searchText);
    this.currentPage = 1;
  }

  hasActiveListFilters(): boolean {
    return this.tableFilter.hasActive(this.loanTableFilter);
  }

  onTableFilterApplied(): void {
    this.currentPage = 1;
  }

  sortData(column: LoanColumnKey): void {
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

  viewRecord(record: LoanAdvanceRecord): void {
    if (!record.Id) {
      this.alertService.warning('View', 'Unable to view this row: missing loan / advance id.');
      return;
    }

    this.showViewDialog.set(true);
    this.selectedRecord.set(record);
    this.viewLoading.set(true);

    this.loanService.fetchLoanAdvanceDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRecord.set(detail);
        this.viewLoading.set(false);
      },
      error: () => {
        this.selectedRecord.set(record);
        this.viewLoading.set(false);
      },
    });
  }

  onUpdate(record: LoanAdvanceRecord): void {
    if (!record.Id) {
      this.alertService.warning('Update', 'Unable to update this row: missing loan / advance id.');
      return;
    }
    void this.router.navigate(['/employee-action/loan-advance-form/edit', record.Id], {
      state: { loanAdvanceRecord: record },
    });
  }

  async onDelete(record: LoanAdvanceRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete loan / advance?',
      `Remove ${record.EmployeeName} (${record.DocumentNo}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing loan / advance id.');
      return;
    }

    this.loanService.deleteLoanAdvance(record.Id).subscribe({
      next: () => {
        this.loanService.removeLoanRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'Loan / advance request removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete loan / advance request.'),
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

  createNewLoanAdvance(): void {
    void this.router.navigateByUrl('/employee-action/loan-advance-form/create');
  }

  formatCellValue(record: LoanAdvanceRecord, key: LoanColumnKey): string {
    const value = record[key];
    if (value === undefined || value === null) {
      return '—';
    }
    if (key === 'RequestDate') {
      return displayDateSlash(String(value));
    }
    const text = String(value).trim();
    return text === '' || text === '—' ? '—' : text;
  }

  formatDetail(value: string | undefined): string {
    const text = (value ?? '').trim();
    return text ? text : '—';
  }

  formatDateDetail(value: string | undefined): string {
    return displayDateSlash(value ?? '');
  }
}
