import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import { ApplicationFormService, ApplicationFormRecord } from '../../../../services/application-form.service';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';

interface TrainingDevelopmentRecord {
  EmployeeCode: number;
  EmployeeName: string;
  Department: string;
  EmploymentNature: string;
  DateOfJoining: string;
  TrainingTitle: string;
  TrainingCategory: string;
  TrainingStage: string;
  TrainingStartDate: string;
  TrainingEndDate: string;
  selected?: boolean;
}

type TrainingColumnKey = Exclude<keyof TrainingDevelopmentRecord, 'selected'>;

@Component({
  selector: 'app-training-development-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './training-development-form.html',
  styleUrls: [
    '../../Application-Form/Application-Form.css'
  ],
  styles: [`
    :host .table-scroll {
      overflow-x: auto;
    }

    :host .mountain-table {
      width: max-content;
      min-width: 100%;
      table-layout: auto;
    }

    :host .mountain-table th,
    :host .mountain-table td {
      min-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host .mountain-table th:first-child,
    :host .mountain-table td:first-child {
      min-width: 40px;
      width: 40px;
    }

    :host .mountain-table th:nth-child(2),
    :host .mountain-table td:nth-child(2) {
      min-width: 110px;
    }

    :host .mountain-table th:nth-child(3),
    :host .mountain-table td:nth-child(3) {
      min-width: 140px;
    }

    :host .mountain-table th:nth-child(4),
    :host .mountain-table td:nth-child(4) {
      min-width: 120px;
    }

    :host .mountain-table th:nth-child(5),
    :host .mountain-table td:nth-child(5) {
      min-width: 145px;
    }
  `],
})
export class TrainingDevelopmentFormComponent {
  constructor(
    private readonly applicationFormService: ApplicationFormService,
    private readonly router: Router
  ) {
    this.trainingList = this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toTrainingRecord(record));
  }

  Math = Math;

  columns: Array<{ key: TrainingColumnKey; label: string; visible: boolean }> = [
    { key: 'EmployeeCode', label: 'Employee Code', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'EmploymentNature', label: 'Employment Nature', visible: true },
    { key: 'DateOfJoining', label: 'Date of joining', visible: true },
    { key: 'TrainingTitle', label: 'Training Title', visible: true },
    { key: 'TrainingCategory', label: 'Training category', visible: true },
    { key: 'TrainingStage', label: 'Training stage', visible: true },
    { key: 'TrainingStartDate', label: 'Training start date', visible: true },
    { key: 'TrainingEndDate', label: 'Training end date', visible: true }
  ];

  sidebarItems: SidebarItem[] = EMPLOYEE_ACTION_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = EMPLOYEE_ACTION_SIDEBAR_SECTIONS;

  activeSidebarItemId = 'training-development-form';
  sidebarCollapsed = signal(false);
  searchText = '';
  sortColumn: TrainingColumnKey = 'EmployeeCode';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  trainingList: TrainingDevelopmentRecord[] = [];

  get filteredList(): TrainingDevelopmentRecord[] {
    let list = [...this.trainingList];
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(item =>
        item.EmployeeName.toLowerCase().includes(search) ||
        item.Department.toLowerCase().includes(search) ||
        item.EmploymentNature.toLowerCase().includes(search) ||
        item.EmployeeCode.toString().includes(search) ||
        item.DateOfJoining.toLowerCase().includes(search) ||
        item.TrainingTitle.toLowerCase().includes(search) ||
        item.TrainingCategory.toLowerCase().includes(search) ||
        item.TrainingStage.toLowerCase().includes(search) ||
        item.TrainingStartDate.toLowerCase().includes(search) ||
        item.TrainingEndDate.toLowerCase().includes(search)
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

  get paginatedList(): TrainingDevelopmentRecord[] {
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
    return this.trainingList.filter(item => item.selected).length;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  sortData(column: TrainingColumnKey): void {
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

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId = folderId;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((state) => !state);
  }

  createNewTraining(): void {
    void this.router.navigateByUrl('/employee-action/training-development-form/create');
  }

  private toTrainingRecord(record: ApplicationFormRecord): TrainingDevelopmentRecord {
    const month = (record.EmployeeCode % 12) + 1;
    const joinDate = `2025-${month.toString().padStart(2, '0')}-15`;
    const startDate = `2026-${month.toString().padStart(2, '0')}-05`;
    const endDate = `2026-${month.toString().padStart(2, '0')}-20`;
    const stages = ['Nomination', 'In Progress', 'Completed'] as const;
    const categories = ['Technical', 'Behavioral', 'Compliance'] as const;
    const stage = stages[record.EmployeeCode % stages.length];
    const category = categories[record.EmployeeCode % categories.length];

    return {
      EmployeeCode: record.EmployeeCode,
      EmployeeName: record.EmployeeName,
      Department: record.Department,
      EmploymentNature: record.EmployeeNature,
      DateOfJoining: joinDate,
      TrainingTitle: `${record.Department} Skills Program`,
      TrainingCategory: category,
      TrainingStage: stage,
      TrainingStartDate: startDate,
      TrainingEndDate: endDate,
      selected: record.selected ?? false
    };
  }
}
