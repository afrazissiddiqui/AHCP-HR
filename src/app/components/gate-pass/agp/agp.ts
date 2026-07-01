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
import { compareGatePassListRecords, formatGatePassListCell } from '../gate-pass-list-display.util';
import { AgpRecord, AgpService } from './agp.service';
import { ShellbarSearchService } from '../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../utils/shellbar-search-connect.util';

type AgpSortableKey = Exclude<keyof AgpRecord, 'lines' | 'selected'>;

interface ColumnConfig {
  key: AgpSortableKey;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-agp',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, PageToolbarComponent],
  templateUrl: './agp.html',
  styleUrl: '../igp/igp.css',
})
export class AgpComponent implements OnInit {
  readonly warehouseLabel = gatePassWarehouseLabel;
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellbarSearch = inject(ShellbarSearchService);

  constructor(
    private readonly router: Router,
    private readonly agpService: AgpService,
    private readonly layout: GatePassLayoutService,
    private readonly alertService: AlertService,
  ) {}

  formatCell(record: AgpRecord, key: AgpSortableKey): string {
    return formatGatePassListCell(record[key] as string | number | null | undefined, key);
  }

  ngOnInit(): void {
    connectShellbarSearch(this.shellbarSearch, this.destroyRef, {
      getSearchText: () => this.searchText,
      setSearchText: (value) => { this.searchText = value; },
      onSearchChange: () => this.onSearchChange(),
    });

    this.agpService.fetchArticleGatePasses().subscribe({
      error: (error: unknown) => {
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load AGP records.'),
        );
      },
    });
  }

  Math = Math;

  columns: ColumnConfig[] = [
    { key: 'Id', label: 'ID', visible: true },
    { key: 'referenceNo', label: 'AGP no.', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'submittedDate', label: 'Date', visible: true },
    { key: 'businessPartnerName', label: 'Business partner', visible: true },
    { key: 'requestingDepartment', label: 'Department', visible: true },
    { key: 'vehicleNo', label: 'Vehicle no.', visible: true },
    { key: 'totalQtySent', label: 'Qty sent', visible: true },
    { key: 'totalQtyReceived', label: 'Qty received', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ];

  get rows(): AgpRecord[] {
    return this.agpService.records();
  }

  searchText = '';
  sortColumn: AgpSortableKey = 'submittedDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showDialog = false;
  readonly showDetailDialog = signal(false);
  readonly detailLoading = signal(false);
  readonly selectedRow = signal<AgpRecord | null>(null);
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  viewDetails(record: AgpRecord): void {
    if (!record.Id) {
      this.alertService.warning('View', 'Unable to view this row: missing AGP id.');
      return;
    }

    this.showDetailDialog.set(true);
    this.selectedRow.set(record);
    this.detailLoading.set(true);

    this.agpService.fetchArticleGatePassDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRow.set(detail);
        this.detailLoading.set(false);
      },
      error: (error: unknown) => {
        const cached = this.agpService.findCachedRecord(record.Id) ?? record;
        this.selectedRow.set(cached);
        this.detailLoading.set(false);
        this.alertService.warning(
          'Detail unavailable',
          formatApiErrorMessage(error, 'Showing list data — full detail could not be loaded.'),
        );
      },
    });
  }

  async onDelete(record: AgpRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete AGP?',
      `Remove ${record.referenceNo} (${record.businessPartnerName}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing AGP id.');
      return;
    }

    this.agpService.deleteArticleGatePass(record.Id).subscribe({
      next: (response) => {
        if (response?.status === false || response?.success === false) {
          this.alertService.error(
            'Delete Failed',
            response.message || 'Failed to delete AGP record.',
          );
          return;
        }

        this.agpService.removeAgpRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', response?.message || 'AGP record removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete AGP record.'),
        );
      },
    });
  }

  closeDetailDialog(): void {
    this.selectedRow.set(null);
    this.showDetailDialog.set(false);
    this.detailLoading.set(false);
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

  get filteredList(): AgpRecord[] {
    let list = [...this.rows];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter((item) => {
        const hay = [
          item.title,
          item.requestingDepartment,
          item.department,
          item.referenceNo,
          item.status,
          item.type,
          item.businessPartnerName,
          item.businessPartnerCode,
          item.baseDocNo,
          item.vehicleNo,
          String(item.Id),
          String(item.totalQtySent ?? ''),
          String(item.totalQtyReceived ?? ''),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(search);
      });
    }

    list.sort((a, b) => compareGatePassListRecords(a, b, this.sortColumn, this.sortDirection));

    return list;
  }

  get paginatedList(): AgpRecord[] {
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

  sortData(column: AgpSortableKey): void {
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
    void this.router.navigateByUrl('/gate-pass/agp/create');
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
