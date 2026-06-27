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
import { OgpRecord, OgpService } from './ogp.service';
import { ShellbarSearchService } from '../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../utils/shellbar-search-connect.util';

type OgpSortableKey = Exclude<keyof OgpRecord, 'lines' | 'selected'>;

interface ColumnConfig {
  key: OgpSortableKey;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-ogp',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, PageToolbarComponent],
  templateUrl: './ogp.html',
  styleUrl: '../igp/igp.css',
})
export class OgpComponent implements OnInit {
  readonly warehouseLabel = gatePassWarehouseLabel;
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellbarSearch = inject(ShellbarSearchService);

  constructor(
    private readonly router: Router,
    private readonly ogpService: OgpService,
    private readonly layout: GatePassLayoutService,
    private readonly alertService: AlertService,
  ) {}

  formatCell(record: OgpRecord, key: OgpSortableKey): string {
    return formatGatePassListCell(record[key] as string | number | null | undefined, key);
  }

  ngOnInit(): void {
    connectShellbarSearch(this.shellbarSearch, this.destroyRef, {
      getSearchText: () => this.searchText,
      setSearchText: (value) => { this.searchText = value; },
      onSearchChange: () => this.onSearchChange(),
    });

    this.ogpService.fetchOutwardGatePasses().subscribe({
      error: (error: unknown) => {
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load OGP records.'),
        );
      },
    });
  }

  Math = Math;

  columns: ColumnConfig[] = [
    { key: 'Id', label: 'ID', visible: true },
    { key: 'referenceNo', label: 'OGP no.', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'submittedDate', label: 'Date', visible: true },
    { key: 'businessPartnerName', label: 'Business partner', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'vehicleNo', label: 'Vehicle no.', visible: true },
    { key: 'location', label: 'Location', visible: true },
    { key: 'totalQty', label: 'Total qty', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ];

  get rows(): OgpRecord[] {
    return this.ogpService.records();
  }

  searchText = '';
  sortColumn: OgpSortableKey = 'Id';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showDialog = false;
  readonly showDetailDialog = signal(false);
  readonly detailLoading = signal(false);
  readonly selectedRow = signal<OgpRecord | null>(null);
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  viewDetails(record: OgpRecord): void {
    if (!record.Id) {
      this.alertService.warning('View', 'Unable to view this row: missing OGP id.');
      return;
    }

    this.showDetailDialog.set(true);
    this.selectedRow.set(null);
    this.detailLoading.set(true);

    this.ogpService.fetchOutwardGatePassDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRow.set(detail);
        this.detailLoading.set(false);
      },
      error: (error: unknown) => {
        this.detailLoading.set(false);
        this.showDetailDialog.set(false);
        this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load OGP details.'),
        );
      },
    });
  }

  async onDelete(record: OgpRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete OGP?',
      `Remove ${record.referenceNo} (${record.businessPartnerName}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing OGP id.');
      return;
    }

    this.ogpService.deleteOutwardGatePass(record.Id).subscribe({
      next: () => {
        this.ogpService.removeOgpRecord(record);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.alertService.success('Deleted', 'OGP record removed successfully.');
      },
      error: (error: unknown) => {
        this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete OGP record.'),
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

  get filteredList(): OgpRecord[] {
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

  get paginatedList(): OgpRecord[] {
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

  sortData(column: OgpSortableKey): void {
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
    void this.router.navigateByUrl('/gate-pass/ogp/create');
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
