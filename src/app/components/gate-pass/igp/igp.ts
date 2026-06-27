import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../column-resize';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { AlertService } from '../../../services/alert.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { GatePassLayoutService } from '../gate-pass-layout.service';
import { gatePassWarehouseLabel } from '../gate-pass-warehouse.options';
import { formatGatePassListCell } from '../gate-pass-list-display.util';
import { IgpService, IgpRecord } from './igp.service';
import { ShellbarSearchService } from '../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../utils/shellbar-search-connect.util';

type IgpSortableKey = Exclude<keyof IgpRecord, 'lines' | 'selected'>;

interface ColumnConfig {
  key: IgpSortableKey;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-igp',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, PageToolbarComponent],
  templateUrl: './igp.html',
  styleUrl: './igp.css',
})
export class IgpComponent implements OnInit {
  private readonly igpService = inject(IgpService);
  private readonly router = inject(Router);
  private readonly layout = inject(GatePassLayoutService);
  private readonly alertService = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellbarSearch = inject(ShellbarSearchService);

  readonly warehouseLabel = gatePassWarehouseLabel;
  readonly records = this.igpService.records;
  readonly listLoading = signal(true);

  formatCell(record: IgpRecord, key: IgpSortableKey): string {
    return formatGatePassListCell(record[key] as string | number | null | undefined, key);
  }

  trackRowId(_index: number, record: IgpRecord): string | number {
    return record.Id ?? record.referenceNo ?? _index;
  }

  ngOnInit(): void {
    connectShellbarSearch(this.shellbarSearch, this.destroyRef, {
      getSearchText: () => this.searchText,
      setSearchText: (value) => { this.searchText = value; },
      onSearchChange: () => this.onSearchChange(),
    });

    this.loadList();
  }

  loadList(): void {
    this.listLoading.set(true);
    this.igpService.fetchInwardGatePasses().subscribe({
      next: () => this.listLoading.set(false),
      error: (error: unknown) => {
        this.listLoading.set(false);
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load IGP records.'),
        );
      },
    });
  }

  Math = Math;

  columns: ColumnConfig[] = [
    { key: 'Id', label: 'ID', visible: true },
    { key: 'referenceNo', label: 'IGP no.', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'submittedDate', label: 'Date', visible: true },
    { key: 'businessPartnerName', label: 'Business partner', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'vehicleNo', label: 'Vehicle no.', visible: true },
    { key: 'location', label: 'Location', visible: true },
    { key: 'totalQty', label: 'Total qty', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ];

  get visibleColumnCount(): number {
    return this.columns.filter((col) => col.visible).length;
  }

  get rows(): IgpRecord[] {
    return this.records();
  }

  searchText = '';
  sortColumn: IgpSortableKey = 'Id';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showDialog = false;
  readonly showDetailDialog = signal(false);
  readonly detailLoading = signal(false);
  readonly selectedRow = signal<IgpRecord | null>(null);
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  viewDetails(record: IgpRecord): void {
    if (!record.Id) {
      this.alertService.warning('View', 'Unable to view this row: missing IGP id.');
      return;
    }

    this.showDetailDialog.set(true);
    this.selectedRow.set(null);
    this.detailLoading.set(true);

    this.igpService.fetchInwardGatePassDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRow.set(detail);
        this.detailLoading.set(false);
      },
      error: (error: unknown) => {
        this.detailLoading.set(false);
        this.showDetailDialog.set(false);
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load IGP details.'),
        );
      },
    });
  }

  async onDelete(record: IgpRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete IGP?',
      `Remove ${record.referenceNo} (${record.businessPartnerName}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing IGP id.');
      return;
    }

    this.igpService.deleteInwardGatePass(record.Id).subscribe({
      next: () => {
        this.igpService.removeIgpRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'IGP record removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete IGP record.'),
        );
      },
    });
  }

  closeDetailDialog(): void {
    this.selectedRow.set(null);
    this.showDetailDialog.set(false);
    this.detailLoading.set(false);
  }

  formatDetail(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '' || value === '—') {
      return '—';
    }
    return String(value);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredList.forEach((s) => (s.selected = checked));
  }

  isAllSelected(): boolean {
    return this.filteredList.length > 0 && this.filteredList.every((s) => s.selected);
  }

  getSelectedCount(): number {
    return this.rows.filter((x) => x.selected).length;
  }

  get filteredList(): IgpRecord[] {
    let list = [...this.rows];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter((item) => {
        const hay = [
          item.title,
          item.department,
          item.referenceNo,
          item.status,
          item.type,
          item.businessPartnerName,
          item.businessPartnerCode,
          item.baseDocNo,
          item.vehicleNo,
          item.location,
          String(item.Id),
          String(item.totalQty ?? ''),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(search);
      });
    }

    list.sort((a, b) => {
      const valA = a[this.sortColumn];
      const valB = b[this.sortColumn];
      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const sa = String(valA);
      const sb = String(valB);
      let comparison = 0;
      if (sa > sb) comparison = 1;
      else if (sa < sb) comparison = -1;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }

  get paginatedList(): IgpRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredList.length / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onSearchChange(): void {
    this.shellbarSearch.syncQuery(this.searchText);
    this.currentPage = 1;
  }

  sortData(column: IgpSortableKey): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  createNew(): void {
    void this.router.navigateByUrl('/gate-pass/igp/create');
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
