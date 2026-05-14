import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColumnResizeDirective } from '../../../column-resize';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../sidebar/sidebar';
import { Router } from '@angular/router';
import {
  ApplicationFormDetail,
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../services/application-form.service';

type ApplicationFormColumnKey = Exclude<keyof ApplicationFormRecord, 'detail' | 'selected'>;

interface ColumnConfig {
  key: ApplicationFormColumnKey;
  label: string;
  visible: boolean;
}


@Component({
  selector: 'app-recruitment',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './application-form.html',
  styleUrls: ['./Application-Form.css'],
})
export class RecruitmentComponent {

  constructor(
    private router: Router,
    private applicationFormService: ApplicationFormService
  ) { }

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

  activeSidebarItemId = 'recruitment-list';
  sidebarCollapsed = signal(false);

  columns: ColumnConfig[] = [
    { key: 'EmployeeCode', label: 'Employee Code', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
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

  // Searching, Sorting, Pagination State
  searchText: string = '';
  sortColumn: ApplicationFormColumnKey = 'EmployeeCode';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showColumnPanel = false;
  showDialog = false;
  activeTab: 'filter' = 'filter';
  detailRecord: ApplicationFormRecord | null = null;

  toggleColumnPanel() {
    this.showColumnPanel = !this.showColumnPanel;
  }

  openDialog() {
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
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
    let list = [...this.sirList];

    // Search
    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter(item =>
        String(item.EmployeeCode).toLowerCase().includes(search) ||
        item.EmployeeName.toLowerCase().includes(search) ||
        item.Department.toLowerCase().includes(search) ||
        item.EmployeeNature.toLowerCase().includes(search) ||
        item.Designation.toLowerCase().includes(search) ||
        item.ReportingManager.toLowerCase().includes(search) ||
        item.EmploymentType.toLowerCase().includes(search) ||
        item.EmploymentCategory.toLowerCase().includes(search)
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
    this.detailRecord = record;
  }

  closeApplicationDetail() {
    this.detailRecord = null;
  }

  get applicationDetail(): ApplicationFormDetail | null {
    return this.detailRecord?.detail ?? null;
  }

  displayDash(value: string | number | undefined | null): string {
    if (value === undefined || value === null) {
      return '—';
    }
    const s = String(value).trim();
    return s === '' ? '—' : s;
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