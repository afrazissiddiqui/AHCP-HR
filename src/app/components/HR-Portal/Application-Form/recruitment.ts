import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ColumnResizeDirective } from '../../../column-resize';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../sidebar/sidebar';
import { Router } from '@angular/router';
import { AlertService } from '../../../services/alert.service';
import {
  ApplicationFormAttachmentMeta,
  ApplicationFormRemuneration,
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../services/application-form.service';
import {
  APPLICATION_FORM_TABLE_FILTER,
  TableFilterComponent,
  TableFilterService,
} from '../../table-filter';
import { ShellbarSearchService } from '../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../utils/shellbar-search-connect.util';
import { displayDateOnly } from '../../../utils/date-format.util';

type ApplicationFormColumnKey = Exclude<keyof ApplicationFormRecord, 'detail' | 'selected'>;

interface ColumnConfig {
  key: ApplicationFormColumnKey;
  label: string;
  visible: boolean;
}

interface ApplicationDetailViewState {
  open: boolean;
  loading: boolean;
  record: ApplicationFormRecord | null;
}

@Component({
  selector: 'app-recruitment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ColumnResizeDirective,
    SidebarComponent,
    PageToolbarComponent,
    TableFilterComponent,
  ],
  templateUrl: './Application-Form.html',
  styleUrls: ['./Application-Form.css'],
})
export class RecruitmentComponent implements OnInit {

  readonly applicationTableFilter = APPLICATION_FORM_TABLE_FILTER;
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellbarSearch = inject(ShellbarSearchService);
  readonly detailViewState$ = new BehaviorSubject<ApplicationDetailViewState>({
    open: false,
    loading: false,
    record: null,
  });

  constructor(
    private router: Router,
    private applicationFormService: ApplicationFormService,
    private readonly alertService: AlertService,
    readonly tableFilter: TableFilterService
  ) {
    connectShellbarSearch(this.shellbarSearch, this.destroyRef, {
      getSearchText: () => this.searchText,
      setSearchText: (value) => { this.searchText = value; },
      onSearchChange: () => this.onSearchChange(),
    });
  }

  ngOnInit(): void {
    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: () => undefined,
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to load user list.';
        this.alertService.error('Load Failed', errorMessage);
      },
    });
  }

  Math = Math;

  sidebarItems: SidebarItem[] = [
    { id: 'recruitment-list', label: 'Recruitment List', route: '/recruitment' }
  ];

  sidebarSections: SidebarSection[] = [
    {
      id: 'recruitment-actions',
      title: 'Recruitment Actions',
      items: [
        { id: 'Job-Specification-Form', label: 'Job Specification Form', route: '/job-specification-form' },
        { id: 'create-requisition', label: 'Application Form / Employee Profile', route: '/recruitment' },
      ]
    }
  ];

  activeSidebarItemId = 'recruitment-list';
  sidebarCollapsed = signal(false);

  columns: ColumnConfig[] = [
    { key: 'EmployeeCode', label: 'Employee ID', visible: true },
    { key: 'EmployeeName', label: 'Person Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'EmployeeNature', label: 'Employee Nature', visible: true },
    { key: 'Designation', label: 'Designation', visible: true },
    { key: 'ReportingManager', label: 'Reporting Manager', visible: true },
    { key: 'EmploymentType', label: 'Employment Type', visible: true },
    { key: 'EmploymentCategory', label: 'Employment Category', visible: true },
    { key: 'status', label: 'Status', visible: true },

  ];

  get sirList(): ApplicationFormRecord[] {
    return this.applicationFormService.getApplicationRecords();
  }

  get visibleColumns(): ColumnConfig[] {
    return this.columns.filter((col) => col.visible);
  }

  // Searching, Sorting, Pagination State
  searchText: string = '';
  sortColumn: ApplicationFormColumnKey = 'EmployeeCode';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showColumnPanel = false;
  showDialog = false;
  activeTab: 'columns' = 'columns';

  toggleColumnPanel() {
    this.showColumnPanel = !this.showColumnPanel;
  }

  openDialog() {
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  hasActiveListFilters(): boolean {
    return this.tableFilter.hasActive(this.applicationTableFilter);
  }

  onTableFilterApplied(): void {
    this.currentPage = 1;
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredList.forEach(s => s.selected = checked);
  }

  isAllSelected(): boolean {
    return this.filteredList.length > 0 && this.filteredList.every(s => s.selected);
  }

  getSelectedCount(): number {
    return this.sirList.filter(x => x.selected).length;
  }

  // Getters for searching, sorting, and pagination
  get filteredList(): ApplicationFormRecord[] {
    let list = this.tableFilter.filterItems([...this.sirList], this.applicationTableFilter);

    // Search
    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter(item =>
        String(item.EmployeeCode ?? '').toLowerCase().includes(search) ||
        String(item.EmployeeName ?? '').toLowerCase().includes(search) ||
        String(item.detail?.personalInfo?.personName ?? '').toLowerCase().includes(search) ||
        String(item.Department ?? '').toLowerCase().includes(search) ||
        String(item.EmployeeNature ?? '').toLowerCase().includes(search) ||
        String(item.Designation ?? '').toLowerCase().includes(search) ||
        String(item.ReportingManager ?? '').toLowerCase().includes(search) ||
        String(item.EmploymentType ?? '').toLowerCase().includes(search) ||
        String(item.EmploymentCategory ?? '').toLowerCase().includes(search)
      );
    }

    // Sort
    list.sort((a, b) => {
      const valA = a[this.sortColumn];
      const valB = b[this.sortColumn];

      if (valA === undefined || valB === undefined) return 0;

      let comparison = 0;
      if (valA > valB) comparison = 1;
      else if (valA < valB) comparison = -1;

      return this.sortDirection === 'asc' ? comparison : -comparison;
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

  // Actions
  onSearchChange() {
    this.shellbarSearch.syncQuery(this.searchText);
    this.currentPage = 1; // Reset to first page on search
  }

  sortData(column: ApplicationFormColumnKey) {

    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
  }

  openApplicationDetail(record: ApplicationFormRecord) {
    const viewId = record.apiId ?? record.EmployeeCode;
    this.detailViewState$.next({ open: true, loading: true, record });

    this.applicationFormService.fetchEmployeeProfileDetail(viewId).subscribe({
      next: (fullRecord) => {
        this.detailViewState$.next({
          open: true,
          loading: false,
          record: {
            ...fullRecord,
            selected: record.selected,
          },
        });
      },
      error: (error: unknown) => {
        this.detailViewState$.next({ open: false, loading: false, record: null });
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to load employee details.';
        this.alertService.error('Load Failed', errorMessage);
      },
    });
  }

  closeApplicationDetail() {
    this.detailViewState$.next({ open: false, loading: false, record: null });
  }

  displayDash(value: string | number | undefined | null): string {
    if (value === undefined || value === null) {
      return '—';
    }
    const s = String(value).trim();
    return s === '' ? '—' : s;
  }

  resolveAttachmentFor(attachment: ApplicationFormAttachmentMeta): string {
    return this.applicationFormService.resolveAttachmentForLabel(attachment);
  }

  displayMaximumLoanCapacity(remuneration: ApplicationFormRemuneration): string {
    const value =
      remuneration.loanAmountAllowed?.trim() || remuneration.maximumLoanCapacity?.trim() || '';
    return this.displayDash(value);
  }

  displayDate(value: string | number | undefined | null): string {
    return displayDateOnly(value);
  }

  displayPersonName(record: ApplicationFormRecord): string {
    const personName = record.detail?.personalInfo?.personName?.trim();
    if (personName) {
      return personName;
    }
    const name = record.EmployeeName?.trim();
    return name && name !== '—' ? name : '—';
  }

  maskedPassword(password: string | undefined): string {
    if (!password || !String(password).trim()) {
      return '—';
    }
    return '••••••••';
  }


  createNewSIR(): void {
    console.log("New SIR clicked");

    // Navigate to Create Job Requisition page
    this.router.navigate(["/recruitment/create"]);
  }

  onUpdate(record: ApplicationFormRecord): void {
    const id = record.apiId;
    if (!id) {
      this.alertService.warning('Update', 'Unable to update this row: missing employee id.');
      return;
    }
    void this.router.navigate(['/recruitment/edit', id]);
  }

  async onDelete(record: ApplicationFormRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete employee?',
      `Remove ${record.EmployeeName} (${record.EmployeeCode}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    const id = record.apiId;
    if (!id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing employee id.');
      return;
    }

    this.applicationFormService.deleteEmployeeProfile(id).subscribe({
      next: () => {
        this.applicationFormService.removeApplicationRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'Employee removed successfully.');
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to delete employee.';
        this.alertService.error('Delete Failed', errorMessage);
      },
    });
  }

  // Sidebar event handlers
  onFolderSelected(folder: string): void {
    this.activeSidebarItemId = folder;
  }

  onManageFolders(): void {
    console.log('Manage folders clicked');
    // Handle manage folders action
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(s => !s);
  }

}