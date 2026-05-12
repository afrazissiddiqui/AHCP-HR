import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { ApplicationFormRecord, ApplicationFormService } from '../../../../services/application-form.service';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';

interface PerformanceAppraisalRecord {
  FormNumber: string;
  EmployeeID: number;
  EmployeeName: string;
  EmployeeCategory: string;
  EmploymentType: string;
  AppraisalAuthority: string;
  AppraisalPeriod: string;
  CurrentSalary: string;
  EvaluationDate: string;
  selected?: boolean;
}

type AppraisalColumnKey = Exclude<keyof PerformanceAppraisalRecord, 'selected'>;

@Component({
  selector: 'app-performance-appraisal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './performance-appraisal-form.html',
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
export class PerformanceAppraisalFormComponent {
  constructor(
    private readonly applicationFormService: ApplicationFormService,
    private readonly router: Router
  ) {
    this.appraisalList = this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toAppraisalRecord(record));
  }

  Math = Math;

  columns: Array<{ key: AppraisalColumnKey; label: string; visible: boolean }> = [
    { key: 'FormNumber', label: 'Form Number', visible: true },
    { key: 'EmployeeID', label: 'Employee ID', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'EmployeeCategory', label: 'Employee Category', visible: true },
    { key: 'EmploymentType', label: 'Employment Type', visible: true },
    { key: 'AppraisalAuthority', label: 'Appraisal Authority', visible: true },
    { key: 'AppraisalPeriod', label: 'Appraisal Period', visible: true },
    { key: 'CurrentSalary', label: 'Current Salary', visible: true },
    { key: 'EvaluationDate', label: 'Evaluation Date', visible: true }
  ];

  sidebarItems: SidebarItem[] = EMPLOYEE_ACTION_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = EMPLOYEE_ACTION_SIDEBAR_SECTIONS;

  activeSidebarItemId = 'performance-appraisal-form';
  sidebarCollapsed = signal(false);
  searchText = '';
  sortColumn: AppraisalColumnKey = 'FormNumber';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  appraisalList: PerformanceAppraisalRecord[] = [];
  showDialog = false;
  activeTab: 'filter' = 'filter';

  get filteredList(): PerformanceAppraisalRecord[] {
    let list = [...this.appraisalList];
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(item =>
        item.EmployeeName.toLowerCase().includes(search) ||
        item.FormNumber.toLowerCase().includes(search) ||
        item.EmployeeCategory.toLowerCase().includes(search) ||
        item.EmploymentType.toLowerCase().includes(search) ||
        item.AppraisalAuthority.toLowerCase().includes(search) ||
        item.AppraisalPeriod.toLowerCase().includes(search) ||
        item.CurrentSalary.toLowerCase().includes(search) ||
        item.EvaluationDate.toLowerCase().includes(search) ||
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

  get paginatedList(): PerformanceAppraisalRecord[] {
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
  getSelectedCount(): number { return this.appraisalList.filter(item => item.selected).length; }
  onSearchChange(): void { this.currentPage = 1; }
  sortData(column: AppraisalColumnKey): void {
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
  createNewAppraisal(): void {
    void this.router.navigateByUrl('/employee-action/performance-appraisal-form/create');
  }

  private toAppraisalRecord(record: ApplicationFormRecord): PerformanceAppraisalRecord {
    const categories = ['Permanent', 'Contract', 'Probation'] as const;
    const employmentTypes = ['Full-time', 'Part-time', 'Intern'] as const;
    const appraisalAuthorities = ['HOD', 'Manager', 'Supervisor'] as const;
    const month = ((record.EmployeeCode % 12) + 1).toString().padStart(2, '0');
    return {
      FormNumber: `PAF-${record.EmployeeCode.toString().padStart(4, '0')}`,
      EmployeeID: record.EmployeeCode,
      EmployeeName: record.EmployeeName,
      EmployeeCategory: categories[record.EmployeeCode % categories.length],
      EmploymentType: employmentTypes[record.EmployeeCode % employmentTypes.length],
      AppraisalAuthority: appraisalAuthorities[record.EmployeeCode % appraisalAuthorities.length],
      AppraisalPeriod: '6 months',
      CurrentSalary: `${50000 + (record.EmployeeCode % 10) * 5000}`,
      EvaluationDate: `2026-${month}-01`,
      selected: record.selected ?? false
    };
  }
}
