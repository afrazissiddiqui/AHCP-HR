import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import {
  ProbationEvaluationRecord,
  ProbationEvaluationService,
} from '../../../../services/probation-evaluation.service';
import { AlertService } from '../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';
import {
  PROBATION_EVALUATION_TABLE_FILTER,
  TableFilterComponent,
  TableFilterService,
} from '../../../table-filter';

type ProbationColumnKey = Exclude<keyof ProbationEvaluationRecord, 'selected' | 'Location' | 'ReportingManager' | 'EmployeeType' | 'GradeWorkLevel' | 'EmploymentCategory' | 'Remarks' | 'ProbationRating' | 'SupervisionRemark' | 'ExtensionOfProbation' | 'TerminationOfProbation' | 'SalaryAdjustment' | 'Allowances' | 'TotalSalary'>;

@Component({
  selector: 'app-probation-evaluation-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent, PageToolbarComponent, TableFilterComponent],
  templateUrl: './probation-evaluation-form.html',
  styleUrls: ['./probation-evaluation-form.css', '../../Application-Form/Application-Form.css'],
})
export class ProbationEvaluationFormComponent implements OnInit {
  readonly probationTableFilter = PROBATION_EVALUATION_TABLE_FILTER;

  constructor(
    private readonly probationService: ProbationEvaluationService,
    private readonly router: Router,
    private readonly alertService: AlertService,
    readonly tableFilter: TableFilterService,
  ) {}

  ngOnInit(): void {
    this.probationService.fetchProbationEvaluations().subscribe({
      error: (error: unknown) => {
        this.alertService.error('Load Failed', formatApiErrorMessage(error, 'Failed to load probation evaluations.'));
      },
    });
  }

  Math = Math;

  columns: Array<{ key: ProbationColumnKey; label: string; visible: boolean }> = [
    { key: 'EmployeeCode', label: 'Employee Code', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'Designation', label: 'Designation', visible: true },
    { key: 'EmployeeNature', label: 'Employment Nature', visible: true },
    { key: 'ProbationStartDate', label: 'Probation Start Date', visible: true },
    { key: 'ProbationEndDate', label: 'Probation End Date', visible: true },
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
  showDialog = false;
  activeTab: 'filter' = 'filter';
  showViewDialog = false;
  selectedRecord: ProbationEvaluationRecord | null = null;

  get probationList(): ProbationEvaluationRecord[] {
    return this.probationService.probations();
  }

  get filteredList(): ProbationEvaluationRecord[] {
    let list = this.tableFilter.filterItems([...this.probationList], this.probationTableFilter);
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.EmployeeName.toLowerCase().includes(search) ||
          item.Department.toLowerCase().includes(search) ||
          item.Designation.toLowerCase().includes(search) ||
          item.EmployeeNature.toLowerCase().includes(search) ||
          item.EmployeeCode.toLowerCase().includes(search) ||
          item.ProbationStartDate.toLowerCase().includes(search) ||
          item.ProbationEndDate.toLowerCase().includes(search),
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
    this.filteredList.forEach((item) => (item.selected = checked));
  }

  isAllSelected(): boolean {
    return this.filteredList.length > 0 && this.filteredList.every((item) => item.selected);
  }

  getSelectedCount(): number {
    return this.probationList.filter((item) => item.selected).length;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  hasActiveListFilters(): boolean {
    return this.tableFilter.hasActive(this.probationTableFilter);
  }

  onTableFilterApplied(): void {
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

  onUpdate(record: ProbationEvaluationRecord): void {
    if (!record.Id) {
      this.alertService.warning('Update', 'Unable to update this row: missing probation evaluation id.');
      return;
    }
    void this.router.navigate(['/employee-action/probation-evaluation-form/edit', record.Id]);
  }

  async onDelete(record: ProbationEvaluationRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete probation evaluation?',
      `Remove ${record.EmployeeName} (${record.EmployeeCode}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing probation evaluation id.');
      return;
    }

    this.probationService.deleteProbationEvaluation(record.Id).subscribe({
      next: () => {
        this.probationService.removeProbationRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'Probation evaluation removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error('Delete Failed', formatApiErrorMessage(error, 'Failed to delete probation evaluation.'));
      },
    });
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

  formatCellValue(record: ProbationEvaluationRecord, key: ProbationColumnKey): string {
    const value = record[key];
    if (value === undefined || value === null) {
      return '—';
    }
    const text = String(value).trim();
    return text === '' || text === '—' ? '—' : text;
  }
}
