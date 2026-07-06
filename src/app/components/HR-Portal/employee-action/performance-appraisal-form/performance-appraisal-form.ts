import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import {
  PerformanceAppraisalRecord,
  PerformanceAppraisalService,
  getPerformanceAllowanceLabel,
} from '../../../../services/performance-appraisal.service';
import { AlertService } from '../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { EMPLOYEE_ACTION_SIDEBAR_ITEMS, EMPLOYEE_ACTION_SIDEBAR_SECTIONS } from '../employee-action-sidebar';
import {
  PERFORMANCE_APPRAISAL_TABLE_FILTER,
  TableFilterComponent,
  TableFilterService,
} from '../../../table-filter';
import { ShellbarSearchService } from '../../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../../utils/shellbar-search-connect.util';

type AppraisalColumnKey = Exclude<
  keyof PerformanceAppraisalRecord,
  | 'selected'
  | 'Id'
  | 'WorkGradeLevel'
  | 'EmploymentNature'
  | 'Department'
  | 'Designation'
  | 'DateOfJoining'
  | 'JobTitle'
  | 'ReportingManager'
  | 'Increment'
  | 'Promotion'
  | 'OtherBenefits'
>;

@Component({
  selector: 'app-performance-appraisal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent, PageToolbarComponent, TableFilterComponent],
  templateUrl: './performance-appraisal-form.html',
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
    :host .pa-allowances-detail-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    :host .pa-allowances-detail-table th,
    :host .pa-allowances-detail-table td {
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      text-align: left;
      font-size: 0.9rem;
    }
    :host .pa-allowances-detail-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #334155;
    }
  `],
})
export class PerformanceAppraisalFormComponent implements OnInit {
  readonly appraisalTableFilter = PERFORMANCE_APPRAISAL_TABLE_FILTER;
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellbarSearch = inject(ShellbarSearchService);

  constructor(
    private readonly appraisalService: PerformanceAppraisalService,
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

    this.appraisalService.fetchPerformanceAppraisals().subscribe({
      error: (error: unknown) => {
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load performance appraisals.'),
        );
      },
    });
  }

  Math = Math;
  getAllowanceLabel = getPerformanceAllowanceLabel;

  columns: Array<{ key: AppraisalColumnKey; label: string; visible: boolean }> = [
    { key: 'FormNumber', label: 'Form Number', visible: true },
    { key: 'EmployeeId', label: 'Employee ID', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'EmployeeCategory', label: 'Employee Category', visible: true },
    { key: 'EmploymentType', label: 'Employment Type', visible: true },
    { key: 'AppraisalAuthority', label: 'Appraisal Authority', visible: true },
    { key: 'AppraisalPeriod', label: 'Appraisal Period', visible: true },
    { key: 'CurrentSalary', label: 'Current Salary', visible: true },
    { key: 'EvaluationDate', label: 'Evaluation Date', visible: true },
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
  showDialog = false;
  activeTab: 'filter' = 'filter';
  readonly showViewDialog = signal(false);
  readonly viewLoading = signal(false);
  readonly selectedRecord = signal<PerformanceAppraisalRecord | null>(null);

  get appraisalList(): PerformanceAppraisalRecord[] {
    return this.appraisalService.appraisals();
  }

  get visibleColumns(): Array<{ key: AppraisalColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((col) => col.visible);
  }

  get filteredList(): PerformanceAppraisalRecord[] {
    let list = this.tableFilter.filterItems([...this.appraisalList], this.appraisalTableFilter);
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.EmployeeName.toLowerCase().includes(search) ||
          item.FormNumber.toLowerCase().includes(search) ||
          item.EmployeeId.toLowerCase().includes(search) ||
          item.EmployeeCategory.toLowerCase().includes(search) ||
          item.EmploymentType.toLowerCase().includes(search) ||
          item.AppraisalAuthority.toLowerCase().includes(search) ||
          item.AppraisalPeriod.toLowerCase().includes(search) ||
          item.EvaluationDate.toLowerCase().includes(search) ||
          String(item.CurrentSalary).includes(search),
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
    return this.appraisalList.filter((item) => item.selected).length;
  }

  onSearchChange(): void {
    this.shellbarSearch.syncQuery(this.searchText);
    this.currentPage = 1;
  }

  hasActiveListFilters(): boolean {
    return this.tableFilter.hasActive(this.appraisalTableFilter);
  }

  onTableFilterApplied(): void {
    this.currentPage = 1;
  }

  sortData(column: AppraisalColumnKey): void {
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

  viewRecord(record: PerformanceAppraisalRecord): void {
    if (!record.Id) {
      this.alertService.warning('View', 'Unable to view this row: missing performance appraisal id.');
      return;
    }

    this.showViewDialog.set(true);
    this.selectedRecord.set(null);
    this.viewLoading.set(true);

    this.appraisalService.fetchPerformanceAppraisalDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRecord.set(detail);
        this.viewLoading.set(false);
      },
      error: (error: unknown) => {
        this.viewLoading.set(false);
        this.showViewDialog.set(false);
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load performance appraisal details.'),
        );
      },
    });
  }

  onUpdate(record: PerformanceAppraisalRecord): void {
    if (!record.Id) {
      this.alertService.warning('Update', 'Unable to update this row: missing performance appraisal id.');
      return;
    }
    void this.router.navigate(['/employee-action/performance-appraisal-form/edit', record.Id]);
  }

  async onDelete(record: PerformanceAppraisalRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete performance appraisal?',
      `Remove ${record.EmployeeName} (${record.FormNumber}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing performance appraisal id.');
      return;
    }

    this.appraisalService.deletePerformanceAppraisal(record.Id).subscribe({
      next: () => {
        this.appraisalService.removeAppraisalRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'Performance appraisal removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete performance appraisal.'),
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

  createNewAppraisal(): void {
    void this.router.navigateByUrl('/employee-action/performance-appraisal-form/create');
  }

  formatCellValue(record: PerformanceAppraisalRecord, key: AppraisalColumnKey): string {
    const value = record[key];
    if (value === undefined || value === null) {
      return '—';
    }
    const text = String(value).trim();
    return text === '' || text === '—' ? '—' : text;
  }
}
