import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnResizeDirective } from '../../../column-resize';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../sidebar/sidebar';
import { ApplicationFormService, ApplicationFormRecord } from '../../../services/application-form.service';
import { AlertService } from '../../../services/alert.service';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from './employee-action-sidebar';

type EmployeeActionDataColumnKey = Exclude<keyof ApplicationFormRecord, 'selected'>;
type EmployeeActionColumnKey = EmployeeActionDataColumnKey | 'action';

@Component({
  selector: 'app-employee-action',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './employee-action.html',
  styleUrl: '../Application-Form/Application-Form.css',
})
export class EmployeeActionComponent {
  constructor(
    private alertService: AlertService,
    private applicationFormService: ApplicationFormService
  ) { }

  Math = Math;

  interfaceColumns: Array<{ key: EmployeeActionColumnKey; label: string; visible: boolean }> = [
    { key: 'EmployeeCode', label: 'Employee Code', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'EmployeeNature', label: 'Employee Nature', visible: true },
    { key: 'Designation', label: 'Designation', visible: true },
    { key: 'ReportingManager', label: 'Reporting Manager', visible: true },
    { key: 'EmploymentType', label: 'Employment Type', visible: true },
    { key: 'EmploymentCategory', label: 'Employment Category', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'action', label: 'Action', visible: true }
  ];

  sidebarItems: SidebarItem[] = EMPLOYEE_ACTION_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = EMPLOYEE_ACTION_SIDEBAR_SECTIONS;

  activeSidebarItemId = 'employee-action-list';
  sidebarCollapsed = signal(false);
  searchText = '';
  sortColumn: EmployeeActionDataColumnKey = 'EmployeeCode';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  showDialog = false;
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  get columns() {
    return this.interfaceColumns;
  }

  onHeaderClick(columnKey: EmployeeActionColumnKey): void {
    if (columnKey === 'action') {
      return;
    }
    this.sortData(columnKey);
  }

  getCellValue(item: ApplicationFormRecord, columnKey: EmployeeActionColumnKey): string | number {
    if (columnKey === 'action') {
      return '';
    }
    return item[columnKey] ?? '';
  }

  get employeeActionList(): ApplicationFormRecord[] {
    return this.applicationFormService.getApplicationRecords();
  }

  get filteredList(): ApplicationFormRecord[] {
    let list = [...this.employeeActionList];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter(item =>
        item.EmployeeName.toLowerCase().includes(search) ||
        item.Department.toLowerCase().includes(search) ||
        item.EmployeeNature.toLowerCase().includes(search) ||
        item.Designation.toLowerCase().includes(search) ||
        item.ReportingManager.toLowerCase().includes(search) ||
        item.EmploymentType.toLowerCase().includes(search) ||
        item.EmploymentCategory.toLowerCase().includes(search)
      );
    }

    list.sort((a, b) => {
      const valueA = a[this.sortColumn];
      const valueB = b[this.sortColumn];
      if (valueA === undefined || valueB === undefined) return 0;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      return 0;
    });

    return list;
  }

  get paginatedList(): ApplicationFormRecord[] {
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
    this.filteredList.forEach(item => item.selected = checked);
  }

  isAllSelected(): boolean {
    return this.filteredList.length > 0 && this.filteredList.every(item => item.selected);
  }

  getSelectedCount(): number {
    return this.employeeActionList.filter(item => item.selected).length;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  sortData(column: EmployeeActionDataColumnKey): void {
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

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId = folderId;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((state) => !state);
  }

  approveApplication(record: ApplicationFormRecord): void {
    this.alertService.confirm('Approve Application', `Are you sure you want to approve application ${record.EmployeeName}?`)
      .then((result) => {
        if (result.isConfirmed) {
          record.EmploymentCategory = 'Approved';
          this.alertService.success('Success', 'Application approved successfully');
        }
      });
  }

  rejectApplication(record: ApplicationFormRecord): void {
    this.alertService.confirm('Reject Application', `Are you sure you want to reject application ${record.EmployeeName}?`)
      .then((result) => {
        if (result.isConfirmed) {
          record.EmploymentCategory = 'Rejected';
          this.alertService.success('Success', 'Application rejected successfully');
        }
      });
  }
}
