import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { ApplicationFormRecord, ApplicationFormService } from '../../../../services/application-form.service';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';

interface ExpenseReimbursmentRecord {
  FormNumber: string;
  EmployeeID: number;
  EmployeeName: string;
  Department: string;
  ExpenseType: string;
  ClaimAmount: string;
  ClaimDate: string;
  ApprovalStatus: string;
  selected?: boolean;
}

type ExpenseColumnKey = Exclude<keyof ExpenseReimbursmentRecord, 'selected'>;

@Component({
  selector: 'app-expense-reimbursment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './expense-reimbursment-form.html',
  styleUrls: ['../../Application-Form/Application-Form.css'],
  styles: [`
    :host .table-scroll { overflow-x: auto; }
    :host .mountain-table { width: max-content; min-width: 100%; table-layout: auto; }
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
  `]
})
export class ExpenseReimbursmentFormComponent {
  constructor(
    private readonly applicationFormService: ApplicationFormService,
    private readonly router: Router
  ) {
    this.expenseList = this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toExpenseRecord(record));
  }

  Math = Math;

  columns: Array<{ key: ExpenseColumnKey; label: string; visible: boolean }> = [
    { key: 'FormNumber', label: 'Form Number', visible: true },
    { key: 'EmployeeID', label: 'Employee ID', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'ExpenseType', label: 'Expense Type', visible: true },
    { key: 'ClaimAmount', label: 'Claim Amount', visible: true },
    { key: 'ClaimDate', label: 'Claim Date', visible: true },
    { key: 'ApprovalStatus', label: 'Approval Status', visible: true }
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
  expenseList: ExpenseReimbursmentRecord[] = [];
  showDialog = false;
  activeTab: 'filter' = 'filter';

  get filteredList(): ExpenseReimbursmentRecord[] {
    let list = [...this.expenseList];
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(item =>
        item.EmployeeName.toLowerCase().includes(search) ||
        item.FormNumber.toLowerCase().includes(search) ||
        item.Department.toLowerCase().includes(search) ||
        item.ExpenseType.toLowerCase().includes(search) ||
        item.ClaimAmount.toLowerCase().includes(search) ||
        item.ClaimDate.toLowerCase().includes(search) ||
        item.ApprovalStatus.toLowerCase().includes(search) ||
        item.EmployeeID.toString().includes(search)
      );
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

  get paginatedList(): ExpenseReimbursmentRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.ceil(this.filteredList.length / this.pageSize); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredList.forEach(item => item.selected = checked);
  }
  isAllSelected(): boolean { return this.filteredList.length > 0 && this.filteredList.every(item => item.selected); }
  getSelectedCount(): number { return this.expenseList.filter(item => item.selected).length; }
  onSearchChange(): void { this.currentPage = 1; }
  sortData(column: ExpenseColumnKey): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }
  setPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }
  onPageSizeChange(): void { this.currentPage = 1; }
  openDialog(): void { this.showDialog = true; }
  closeDialog(): void { this.showDialog = false; }
  onFolderSelected(folderId: string): void { this.activeSidebarItemId = folderId; }
  toggleSidebar(): void { this.sidebarCollapsed.update((state) => !state); }
  createNewExpense(): void {
    void this.router.navigateByUrl('/employee-action/expense-reimbursement-form/create');
  }

  private toExpenseRecord(record: ApplicationFormRecord): ExpenseReimbursmentRecord {
    const types = ['Travel', 'Medical', 'Meals', 'Utilities'] as const;
    const statuses = ['Pending', 'Approved', 'Rejected'] as const;
    const month = ((record.EmployeeCode % 12) + 1).toString().padStart(2, '0');
    return {
      FormNumber: `ERF-${record.EmployeeCode.toString().padStart(4, '0')}`,
      EmployeeID: record.EmployeeCode,
      EmployeeName: record.EmployeeName,
      Department: record.Department,
      ExpenseType: types[record.EmployeeCode % types.length],
      ClaimAmount: `${1000 + (record.EmployeeCode % 10) * 250}`,
      ClaimDate: `2026-${month}-10`,
      ApprovalStatus: statuses[record.EmployeeCode % statuses.length],
      selected: record.selected ?? false
    };
  }
}
