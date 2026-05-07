import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../column-resize';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../sidebar/sidebar';
import { JobSpecificationService, JobSpecificationRecord } from '../../../services/job-specification.service';

interface ColumnConfig {
  key: keyof JobSpecificationRecord;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-job-specification-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './job-specification-form.html',
  styleUrl: './job-specification-form.css',
})
export class JobSpecificationFormComponent {
  constructor(private router: Router, private jobSpecService: JobSpecificationService) { }

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
    { key: "Id", label: "Job ID", visible: true },
    { key: "jobTitle", label: "Job Title", visible: true },
    { key: "department", label: "Department", visible: true },
    { key: "vacancy", label: "Vacancy", visible: true },
    { key: "employmentCategory", label: "Employment Category", visible: true },
    { key: "employmentNature", label: "Employment Nature", visible: true },
  ];

  get jobSpecs(): JobSpecificationRecord[] {
    return this.jobSpecService.jobSpecs();
  }

  searchText: string = '';
  sortColumn: keyof JobSpecificationRecord = 'Id';
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

  viewDetails(record: JobSpecificationRecord): void {
    this.selectedJobSpec = record;
    this.showDetailDialog = true;
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

  get filteredList(): JobSpecificationRecord[] {
    let list = [...this.jobSpecs];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter(item =>
        item.jobTitle.toLowerCase().includes(search) ||
        item.department.toLowerCase().includes(search) ||
        item.vacancy.toString().includes(search) ||
        item.employmentCategory.toLowerCase().includes(search) ||
        item.Id.toString().includes(search)
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

  sortData(column: keyof JobSpecificationRecord) {
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
