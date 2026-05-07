import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { ApplicationFormRecord, ApplicationFormService } from '../../../../services/application-form.service';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';

interface LoanAdvanceRecord {
  FormNumber: string;
  EmployeeID: number;
  EmployeeName: string;
  Department: string;
  RequestType: string;
  RequestedAmount: string;
  Installments: string;
  ApprovalStatus: string;
  selected?: boolean;
}

type LoanColumnKey = Exclude<keyof LoanAdvanceRecord, 'selected'>;

@Component({
  selector: 'app-loan-advance-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './loan-advance-form.html',
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
export class LoanAdvanceFormComponent {
  constructor(
    private readonly applicationFormService: ApplicationFormService,
    private readonly router: Router
  ) {
    this.loanList = this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toLoanRecord(record));
  }

  Math = Math;

  columns: Array<{ key: LoanColumnKey; label: string; visible: boolean }> = [
    { key: 'FormNumber', label: 'Form Number', visible: true },
    { key: 'EmployeeID', label: 'Employee ID', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'RequestType', label: 'Request Type', visible: true },
    { key: 'RequestedAmount', label: 'Requested Amount', visible: true },
    { key: 'Installments', label: 'Installments', visible: true },
    { key: 'ApprovalStatus', label: 'Approval Status', visible: true }
  ];

  sidebarItems: SidebarItem[] = EMPLOYEE_ACTION_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = EMPLOYEE_ACTION_SIDEBAR_SECTIONS;

  activeSidebarItemId = 'loan-advance-form';
  sidebarCollapsed = signal(false);
  searchText = '';
  sortColumn: LoanColumnKey = 'FormNumber';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  loanList: LoanAdvanceRecord[] = [];

  get filteredList(): LoanAdvanceRecord[] {
    let list = [...this.loanList];
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(item =>
        item.EmployeeName.toLowerCase().includes(search) ||
        item.FormNumber.toLowerCase().includes(search) ||
        item.Department.toLowerCase().includes(search) ||
        item.RequestType.toLowerCase().includes(search) ||
        item.RequestedAmount.toLowerCase().includes(search) ||
        item.Installments.toLowerCase().includes(search) ||
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

  get paginatedList(): LoanAdvanceRecord[] {
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
  getSelectedCount(): number { return this.loanList.filter(item => item.selected).length; }
  onSearchChange(): void { this.currentPage = 1; }
  sortData(column: LoanColumnKey): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }
  setPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }
  onPageSizeChange(): void { this.currentPage = 1; }
  onFolderSelected(folderId: string): void { this.activeSidebarItemId = folderId; }
  toggleSidebar(): void { this.sidebarCollapsed.update((state) => !state); }
  createNewLoanAdvance(): void {
    void this.router.navigateByUrl('/employee-action/loan-advance-form/create');
  }

  private toLoanRecord(record: ApplicationFormRecord): LoanAdvanceRecord {
    const requestTypes = ['Loan', 'Advance'] as const;
    const statuses = ['Pending', 'Approved', 'Rejected'] as const;
    return {
      FormNumber: `LAF-${record.EmployeeCode.toString().padStart(4, '0')}`,
      EmployeeID: record.EmployeeCode,
      EmployeeName: record.EmployeeName,
      Department: record.Department,
      RequestType: requestTypes[record.EmployeeCode % requestTypes.length],
      RequestedAmount: `${10000 + (record.EmployeeCode % 10) * 2500}`,
      Installments: `${3 + (record.EmployeeCode % 10)}`,
      ApprovalStatus: statuses[record.EmployeeCode % statuses.length],
      selected: record.selected ?? false
    };
  }
}
