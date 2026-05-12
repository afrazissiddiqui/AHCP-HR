import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import { ApplicationFormService, ApplicationFormRecord } from '../../../../services/application-form.service';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';

interface ProbationEvaluationRecord {
  EmployeeCode: number;
  EmployeeName: string;
  Department: string;
  Designation: string;
  EmployeeNature: string;
  ProbationStartDate: string;
  ProbationEndDate: string;
  selected?: boolean;
}

type ProbationColumnKey = Exclude<keyof ProbationEvaluationRecord, 'selected'>;

@Component({
  selector: 'app-probation-evaluation-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './probation-evaluation-form.html',
  styleUrl: '../../Application-Form/Application-Form.css',
})
export class ProbationEvaluationFormComponent {
  constructor(
    private readonly applicationFormService: ApplicationFormService,
    private readonly router: Router
  ) {
    this.probationList = this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toProbationRecord(record));
  }

  Math = Math;

  columns: Array<{ key: ProbationColumnKey; label: string; visible: boolean }> = [
    { key: 'EmployeeCode', label: 'Employee Code', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'Designation', label: 'Designation', visible: true },
    { key: 'EmployeeNature', label: 'Employment Nature', visible: true },
    { key: 'ProbationStartDate', label: 'Probation Start Date', visible: true },
    { key: 'ProbationEndDate', label: 'Probation End Date', visible: true }
  ];

  sidebarItems: SidebarItem[] = EMPLOYEE_ACTION_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = EMPLOYEE_ACTION_SIDEBAR_SECTIONS;

  activeSidebarItemId = 'probation-evaluation-form';
  sidebarCollapsed = signal(false);
  searchText = '';
  sortColumn: ProbationColumnKey = 'EmployeeCode';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  probationList: ProbationEvaluationRecord[] = [];
  showDialog = false;
  activeTab: 'filter' = 'filter';
  showViewDialog = false;
  selectedRecord: ProbationEvaluationRecord | null = null;

  get filteredList(): ProbationEvaluationRecord[] {
    let list = [...this.probationList];
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(item =>
        item.EmployeeName.toLowerCase().includes(search) ||
        item.Department.toLowerCase().includes(search) ||
        item.Designation.toLowerCase().includes(search) ||
        item.EmployeeNature.toLowerCase().includes(search) ||
        item.EmployeeCode.toString().includes(search) ||
        item.ProbationStartDate.toLowerCase().includes(search) ||
        item.ProbationEndDate.toLowerCase().includes(search)
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

  get paginatedList(): ProbationEvaluationRecord[] {
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
    return this.probationList.filter(item => item.selected).length;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  sortData(column: ProbationColumnKey): void {
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

  viewRecord(record: ProbationEvaluationRecord): void {
    this.selectedRecord = record;
    this.showViewDialog = true;
  }

  closeViewDialog(): void {
    this.showViewDialog = false;
    this.selectedRecord = null;
  }

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId = folderId;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((state) => !state);
  }

  createNewProbation(): void {
    void this.router.navigateByUrl('/employee-action/probation-evaluation-form/create');
  }

  private toProbationRecord(record: ApplicationFormRecord): ProbationEvaluationRecord {
    const startMonth = (record.EmployeeCode % 12) + 1;
    const startDate = `2026-${startMonth.toString().padStart(2, '0')}-01`;
    const endDate = `2026-${startMonth.toString().padStart(2, '0')}-30`;

    return {
      EmployeeCode: record.EmployeeCode,
      EmployeeName: record.EmployeeName,
      Department: record.Department,
      Designation: record.Designation,
      EmployeeNature: record.EmployeeNature,
      ProbationStartDate: startDate,
      ProbationEndDate: endDate,
      selected: record.selected ?? false
    };
  }
}