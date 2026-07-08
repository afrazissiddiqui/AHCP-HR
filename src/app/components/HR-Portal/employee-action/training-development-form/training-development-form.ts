import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import {
  TrainingDevelopmentRecord,
  TrainingDevelopmentService,
} from '../../../../services/training-development.service';
import { AlertService } from '../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { formatTableCellValue } from '../../../../utils/date-format.util';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';
import {
  TRAINING_DEVELOPMENT_TABLE_FILTER,
  TableFilterComponent,
  TableFilterService,
} from '../../../table-filter';
import { ShellbarSearchService } from '../../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../../utils/shellbar-search-connect.util';
import { PermissionService } from '../../../../services/permission.service';

const TRAINING_DEVELOPMENT_MODULE = 'training_development_form';

type TrainingColumnKey = Exclude<
  keyof TrainingDevelopmentRecord,
  | 'selected'
  | 'Id'
  | 'Location'
  | 'Designation'
  | 'JobTitle'
  | 'ReportingManager'
  | 'EmployeeType'
  | 'GradeWorkLevel'
  | 'EmploymentCategory'
  | 'Remarks'
  | 'TrainingDetail'
  | 'TrainingEvaluation'
  | 'Salary'
  | 'Promotion'
>;

@Component({
  selector: 'app-training-development-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent, PageToolbarComponent, TableFilterComponent],
  templateUrl: './training-development-form.html',
  styleUrls: [
    '../../Application-Form/Application-Form.css'
  ],
  styles: [`
    :host .table-scroll {
      overflow-x: auto;
    }

    :host .mountain-table {
      width: 100%;
      min-width: 1000px;
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

    :host .mountain-table th:last-child,
    :host .mountain-table td:last-child {
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
export class TrainingDevelopmentFormComponent implements OnInit {
  readonly trainingTableFilter = TRAINING_DEVELOPMENT_TABLE_FILTER;
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellbarSearch = inject(ShellbarSearchService);

  constructor(
    private readonly trainingService: TrainingDevelopmentService,
    private readonly router: Router,
    private readonly alertService: AlertService,
    readonly tableFilter: TableFilterService,
    private readonly permissionService: PermissionService,
  ) {}

  ngOnInit(): void {
    connectShellbarSearch(this.shellbarSearch, this.destroyRef, {
      getSearchText: () => this.searchText,
      setSearchText: (value) => { this.searchText = value; },
      onSearchChange: () => this.onSearchChange(),
    });

    this.trainingService.fetchTrainingDevelopments().subscribe({
      error: (error: unknown) => {
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load training & development records.'),
        );
      },
    });
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
  showDialog = false;
  activeTab: 'filter' = 'filter';
  readonly showViewDialog = signal(false);
  readonly viewLoading = signal(false);
  readonly selectedRecord = signal<TrainingDevelopmentRecord | null>(null);

  get trainingList(): TrainingDevelopmentRecord[] {
    return this.trainingService.trainings();
  }

  get visibleColumns(): Array<{ key: TrainingColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((col) => col.visible);
  }

  get filteredList(): TrainingDevelopmentRecord[] {
    let list = this.tableFilter.filterItems([...this.trainingList], this.trainingTableFilter);
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(item =>
        item.EmployeeName.toLowerCase().includes(search) ||
        item.Department.toLowerCase().includes(search) ||
        item.EmploymentNature.toLowerCase().includes(search) ||
        item.EmployeeCode.toLowerCase().includes(search) ||
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
    this.shellbarSearch.syncQuery(this.searchText);
    this.currentPage = 1;
  }

  hasActiveListFilters(): boolean {
    return this.tableFilter.hasActive(this.trainingTableFilter);
  }

  onTableFilterApplied(): void {
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

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  viewRecord(record: TrainingDevelopmentRecord): void {
    if (!this.permissionService.assertCan(TRAINING_DEVELOPMENT_MODULE, 'view')) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('View', 'Unable to view this row: missing training & development id.');
      return;
    }

    this.showViewDialog.set(true);
    this.selectedRecord.set(null);
    this.viewLoading.set(true);

    this.trainingService.fetchTrainingDevelopmentDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRecord.set(detail);
        this.viewLoading.set(false);
      },
      error: (error: unknown) => {
        this.viewLoading.set(false);
        this.showViewDialog.set(false);
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load training & development details.'),
        );
      },
    });
  }

  onUpdate(record: TrainingDevelopmentRecord): void {
    if (!this.permissionService.assertCan(TRAINING_DEVELOPMENT_MODULE, 'update')) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Update', 'Unable to update this row: missing training & development id.');
      return;
    }
    void this.router.navigate(['/employee-action/training-development-form/edit', record.Id]);
  }

  async onDelete(record: TrainingDevelopmentRecord): Promise<void> {
    if (!this.permissionService.assertCan(TRAINING_DEVELOPMENT_MODULE, 'delete')) {
      return;
    }

    const result = await this.alertService.confirm(
      'Delete training & development?',
      `Remove ${record.EmployeeName} (${record.EmployeeCode}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing training & development id.');
      return;
    }

    this.trainingService.deleteTrainingDevelopment(record.Id).subscribe({
      next: () => {
        this.trainingService.removeTrainingRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'Training & development record removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete training & development record.'),
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

  createNewTraining(): void {
    if (!this.permissionService.assertCan(TRAINING_DEVELOPMENT_MODULE, 'add')) {
      return;
    }

    void this.router.navigateByUrl('/employee-action/training-development-form/create');
  }

  formatCellValue(record: TrainingDevelopmentRecord, key: TrainingColumnKey): string {
    return formatTableCellValue(key, record[key]);
  }
}
