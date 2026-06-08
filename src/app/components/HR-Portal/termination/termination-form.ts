import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../column-resize';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { TerminationRecord, TerminationService } from '../../../services/termination.service';
import { AlertService } from '../../../services/alert.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import {
  TERMINATION_TABLE_FILTER,
  TableFilterComponent,
  TableFilterService,
} from '../../table-filter';

type TerminationColumnKey = Exclude<keyof TerminationRecord, 'selected' | 'detail' | 'Id'>;

@Component({
  selector: 'app-termination-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, PageToolbarComponent, TableFilterComponent],
  templateUrl: './termination-form.html',
  styleUrls: ['../Application-Form/Application-Form.css', './termination-form.css'],
})
export class TerminationFormComponent implements OnInit {
  readonly terminationTableFilter = TERMINATION_TABLE_FILTER;

  constructor(
    private readonly terminationService: TerminationService,
    private readonly router: Router,
    private readonly alertService: AlertService,
    readonly tableFilter: TableFilterService,
  ) {}

  ngOnInit(): void {
    this.terminationService.fetchFinalSettlements().subscribe({
      error: (error: unknown) => {
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load termination records.'),
        );
      },
    });
  }

  Math = Math;

  columns: Array<{ key: TerminationColumnKey; label: string; visible: boolean }> = [
    { key: 'EmployeeId', label: 'Employee ID', visible: true },
    { key: 'EmployeeName', label: 'Employee Name', visible: true },
    { key: 'Department', label: 'Department', visible: true },
    { key: 'Designation', label: 'Designation', visible: true },
    { key: 'BranchLocation', label: 'Branch / location', visible: true },
    { key: 'CostCenter', label: 'Cost Center', visible: true },
    { key: 'WorkGradeLevel', label: 'Work Grade Level', visible: true },
    { key: 'LastWorkingDay', label: 'Last Working Day', visible: true },
    { key: 'YearOfService', label: 'Year of service', visible: true },
  ];

  searchText = '';
  sortColumn: TerminationColumnKey = 'EmployeeId';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  showDialog = false;
  activeTab: 'filter' = 'filter';
  showViewDialog = false;
  viewLoading = false;
  selectedRecord: TerminationRecord | null = null;

  get terminationList(): TerminationRecord[] {
    return this.terminationService.getTerminationRecords();
  }

  hasActiveTableFilters(): boolean {
    return this.tableFilter.hasActive(this.terminationTableFilter);
  }

  onTableFilterApplied(): void {
    this.currentPage = 1;
  }

  get filteredList(): TerminationRecord[] {
    let list = this.tableFilter.filterItems([...this.terminationList], this.terminationTableFilter);
    if (this.searchText) {
      const search = this.searchText.trim().toLowerCase();
      list = list.filter(item =>
        item.EmployeeName.toLowerCase().includes(search) ||
        item.Department.toLowerCase().includes(search) ||
        item.Designation.toLowerCase().includes(search) ||
        item.BranchLocation.toLowerCase().includes(search) ||
        item.CostCenter.toLowerCase().includes(search) ||
        item.WorkGradeLevel.toLowerCase().includes(search) ||
        item.EmployeeId.toString().includes(search) ||
        item.LastWorkingDay.toLowerCase().includes(search) ||
        item.YearOfService.toString().includes(search)
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

  get paginatedList(): TerminationRecord[] {
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
    return this.terminationList.filter(item => item.selected).length;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  sortData(column: TerminationColumnKey): void {
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

  viewRecord(record: TerminationRecord): void {
    if (!record.Id) {
      this.alertService.warning('View', 'Unable to view this row: missing termination id.');
      return;
    }

    this.showViewDialog = true;
    this.selectedRecord = null;
    this.viewLoading = true;

    this.terminationService.fetchFinalSettlementDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRecord = detail;
        this.viewLoading = false;
      },
      error: (error: unknown) => {
        this.viewLoading = false;
        this.showViewDialog = false;
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load termination details.'),
        );
      },
    });
  }

  onUpdate(record: TerminationRecord): void {
    if (!record.Id) {
      this.alertService.warning('Update', 'Unable to update this row: missing termination id.');
      return;
    }
    void this.router.navigate(['/termination/edit', record.Id]);
  }

  async onDelete(record: TerminationRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete termination?',
      `Remove ${record.EmployeeName} (Employee ID: ${record.EmployeeId}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing termination id.');
      return;
    }

    this.terminationService.deleteFinalSettlement(record.Id).subscribe({
      next: () => {
        this.terminationService.removeTerminationRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'Termination removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete termination.'),
        );
      },
    });
  }

  closeViewDialog(): void {
    this.showViewDialog = false;
    this.selectedRecord = null;
    this.viewLoading = false;
  }

  formatDetail(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  formatCellValue(record: TerminationRecord, key: TerminationColumnKey): string | number {
    if (key === 'YearOfService') {
      return record.YearOfService.toFixed(1);
    }
    return record[key];
  }

  createNewTermination(): void {
    void this.router.navigateByUrl('/termination/create');
  }
}
