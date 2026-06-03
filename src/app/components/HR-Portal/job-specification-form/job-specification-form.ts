import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../column-resize';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../sidebar/sidebar';
import { JobSpecificationService, JobSpecificationRecord } from '../../../services/job-specification.service';
import { AlertService } from '../../../services/alert.service';
import {
  JOB_SPECIFICATION_TABLE_FILTER,
  TableFilterComponent,
  TableFilterService,
} from '../../table-filter';

type JobSpecificationColumnKey = Exclude<keyof JobSpecificationRecord, 'selected'>;

interface ColumnConfig {
  key: JobSpecificationColumnKey;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-job-specification-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ColumnResizeDirective,
    SidebarComponent,
    PageToolbarComponent,
    TableFilterComponent,
  ],
  templateUrl: './job-specification-form.html',
  styleUrl: './job-specification-form.css',
})
export class JobSpecificationFormComponent implements OnInit {
  readonly jobSpecTableFilter = JOB_SPECIFICATION_TABLE_FILTER;

  constructor(
    private router: Router,
    private jobSpecService: JobSpecificationService,
    private readonly alertService: AlertService,
    readonly tableFilter: TableFilterService
  ) { }

  ngOnInit(): void {
    this.jobSpecService.fetchPostedJobSpecifications().subscribe({
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to load job specifications.';
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
        { id: 'create-requisition', label: 'Application Form / Employee Profile', route: '/recruitment' },
        { id: 'Job-Specification-Form', label: 'Job Specification Form', route: '/job-specification-form' }
      ]
    }
  ];

  activeSidebarItemId = 'Job-Specification-Form';
  sidebarCollapsed = signal(false);

  columns: ColumnConfig[] = [
    { key: 'jobTitle', label: 'Job Title', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'vacancyCount', label: 'Vacancy Count', visible: true },
    { key: 'experienceRequirement', label: 'Experience Requirement', visible: true },
    { key: 'employmentCategory', label: 'Employment Category', visible: true },
    { key: 'employmentNature', label: 'Employment Nature', visible: true },
    { key: 'employmentType', label: 'Employment Type', visible: true },
    { key: 'gradeWorkLevel', label: 'Grade / Work Level', visible: true },
    { key: 'basicSalary', label: 'Basic Salary', visible: true },
    { key: 'medicalAllowance', label: 'Medical Allowance', visible: true },
    { key: 'fuelAllowance', label: 'Fuel Allowance', visible: true },
    { key: 'jobDescription', label: 'Job Description', visible: false },
    { key: 'keyResponsibilities', label: 'Key Responsibilities', visible: false },
    { key: 'packagePerks', label: 'Package / Perks', visible: false },
    { key: 'qualifications', label: 'Qualifications', visible: false },
  ];

  get jobSpecs(): JobSpecificationRecord[] {
    return this.jobSpecService.jobSpecs();
  }

  searchText: string = '';
  sortColumn: JobSpecificationColumnKey = 'jobTitle';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showDialog = false;
  showDetailDialog = false;
  selectedJobSpec: JobSpecificationRecord | null = null;
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  openDialog() {
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  hasActiveListFilters(): boolean {
    return this.tableFilter.hasActive(this.jobSpecTableFilter);
  }

  onTableFilterApplied(): void {
    this.currentPage = 1;
  }

  viewDetails(record: JobSpecificationRecord): void {
    this.selectedJobSpec = record;
    this.showDetailDialog = true;
  }

  onUpdate(record: JobSpecificationRecord): void {
    if (!record.Id) {
      this.alertService.warning('Update', 'Unable to update this row: missing job specification id.');
      return;
    }
    void this.router.navigate(['/job-specification-form/edit', record.Id]);
  }

  async onDelete(record: JobSpecificationRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete job specification?',
      `Remove ${record.jobTitle} (${record.Id}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing job specification id.');
      return;
    }

    this.jobSpecService.deleteJobSpec(record.Id).subscribe({
      next: () => {
        this.jobSpecService.removeJobSpecRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'Job specification removed successfully.');
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to delete job specification.';
        this.alertService.error('Delete Failed', errorMessage);
      },
    });
  }

  closeDetailDialog(): void {
    this.selectedJobSpec = null;
    this.showDetailDialog = false;
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredList.forEach(s => s.selected = checked);
  }

  isAllSelected(): boolean {
    return this.filteredList.length > 0 && this.filteredList.every(s => s.selected);
  }

  getSelectedCount(): number {
    return this.jobSpecs.filter(x => x.selected).length;
  }

  formatCellValue(record: JobSpecificationRecord, key: JobSpecificationColumnKey): string {
    const value = record[key];
    if (value === undefined || value === null) {
      return '—';
    }
    if (Array.isArray(value)) {
      return value.length ? value.join(', ') : '—';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    const text = String(value).trim();
    return text === '' || text === '—' ? '—' : text;
  }

  get filteredList(): JobSpecificationRecord[] {
    let list = this.tableFilter.filterItems([...this.jobSpecs], this.jobSpecTableFilter);

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter(item =>
        item.jobTitle.toLowerCase().includes(search) ||
        item.department.toLowerCase().includes(search) ||
        item.vacancyCount.toString().includes(search) ||
        item.experienceRequirement.toLowerCase().includes(search) ||
        item.employmentCategory.toLowerCase().includes(search) ||
        item.employmentNature.toLowerCase().includes(search) ||
        item.employmentType.toLowerCase().includes(search) ||
        item.gradeWorkLevel.toLowerCase().includes(search) ||
        item.keyResponsibilities.toLowerCase().includes(search) ||
        item.packagePerks.toLowerCase().includes(search) ||
        item.qualifications.some((qual) => qual.toLowerCase().includes(search)) ||
        String(item.Id).includes(search)
      );
    }

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

  get paginatedList(): JobSpecificationRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredList.length / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onSearchChange() {
    this.currentPage = 1;
  }

  sortData(column: JobSpecificationColumnKey) {
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

  createNewJobSpec(): void {
    void this.router.navigateByUrl('/job-specification-form/create');
  }

  onFolderSelected(folder: string): void {
    this.activeSidebarItemId = folder;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(s => !s);
  }
}
