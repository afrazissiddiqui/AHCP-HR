import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../column-resize';
import { ui5SelectStringValue } from '../../ui5-select-helpers';
import { PermissionService } from '../../services/permission.service';
import { ShellbarSearchService } from '../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../utils/shellbar-search-connect.util';
import {
  SampleInspectionRequestService,
  SampleInspectionRecord,
} from '../../services/sample-inspection-request.service';
import { MiscellaneousLayoutService } from '../miscellaneous/miscellaneous-layout.service';

type SirListColumnKey =
  | 'documentNumber'
  | 'igpNo'
  | 'bpCode'
  | 'bpName'
  | 'receivingDate'
  | 'documentDate'
  | 'department'
  | 'submittedBy'
  | 'action';

type SirSortableKey = Exclude<SirListColumnKey, 'action'>;

interface ColumnConfig {
  key: SirListColumnKey;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-sample-inspection-request',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective],
  templateUrl: './sample-inspection-request.html',
  styleUrls: ['./sample-inspection-request.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SampleInspectionRequest implements OnInit {
  private readonly router = inject(Router);
  private readonly sampleInspectionRequestService = inject(SampleInspectionRequestService);
  private readonly shellbarSearch = inject(ShellbarSearchService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly layout = inject(MiscellaneousLayoutService);
  protected readonly perm = inject(PermissionService);

  readonly sirList = signal<SampleInspectionRecord[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  Math = Math;

  columns: ColumnConfig[] = [
    { key: 'documentNumber', label: 'Document No.', visible: true },
    { key: 'igpNo', label: 'IGP No.', visible: true },
    { key: 'bpCode', label: 'BP Code', visible: true },
    { key: 'bpName', label: 'BP Name', visible: true },
    { key: 'receivingDate', label: 'Receiving Date', visible: true },
    { key: 'documentDate', label: 'Document Date', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'submittedBy', label: 'Submitted By', visible: true },
    { key: 'action', label: 'Action', visible: true },
  ];

  searchText = '';
  sortColumn: SirSortableKey = 'documentDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showDialog = false;
  activeTab: 'filter' = 'filter';

  ngOnInit(): void {
    connectShellbarSearch(this.shellbarSearch, this.destroyRef, {
      getSearchText: () => this.searchText,
      setSearchText: (value) => {
        this.searchText = value;
      },
      onSearchChange: () => this.onSearchChange(),
    });

    this.loadList();
  }

  loadList(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.sampleInspectionRequestService.getList().subscribe({
      next: (rows) => {
        this.sirList.set(rows.map((row) => ({ ...row, selected: false })));
        this.loading.set(false);
      },
      error: () => {
        this.sirList.set([]);
        this.loading.set(false);
        this.loadError.set('Could not load sample inspection requests. Make sure the backend is running.');
      },
    });
  }

  retryLoad(): void {
    this.loadList();
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  createNewSIR(): void {
    void this.router.navigate(['/miscellaneous/sample-inspection-request/form']);
  }

  viewRecord(record: SampleInspectionRecord): void {
    void this.router.navigate(['/miscellaneous/sample-inspection-request/form'], {
      queryParams: { sirNo: record.sirNo, mode: 'view' },
    });
  }

  editRecord(record: SampleInspectionRecord): void {
    void this.router.navigate(['/miscellaneous/sample-inspection-request/form'], {
      queryParams: { sirNo: record.sirNo, mode: 'edit' },
    });
  }

  printRecord(_record: SampleInspectionRecord): void {
    window.print();
  }

  cellDisplayValue(record: SampleInspectionRecord, key: SirListColumnKey): string {
    if (key === 'action') {
      return '';
    }
    const value = record[key];
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }

  trackBySirNo(_index: number, record: SampleInspectionRecord): number {
    return record.sirNo;
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredList.forEach((row) => {
      row.selected = checked;
    });
  }

  isAllSelected(): boolean {
    return this.filteredList.length > 0 && this.filteredList.every((row) => row.selected);
  }

  getSelectedCount(): number {
    return this.sirList().filter((row) => row.selected).length;
  }

  get filteredList(): SampleInspectionRecord[] {
    let list = [...this.sirList()];

    if (this.searchText.trim()) {
      const term = this.searchText.trim().toLowerCase();
      list = list.filter((row) =>
        [
          row.documentNumber,
          row.igpNo,
          row.bpCode,
          row.bpName,
          row.receivingDate,
          row.documentDate,
          row.department,
          row.submittedBy,
          row.lotBatchNo,
          row.remarks,
        ]
          .map((value) => String(value ?? '').toLowerCase())
          .some((value) => value.includes(term)),
      );
    }

    list.sort((a, b) => this.compareRecords(a, b, this.sortColumn, this.sortDirection));
    return list;
  }

  get paginatedList(): SampleInspectionRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  onSearchChange(): void {
    this.shellbarSearch.syncQuery(this.searchText);
    this.currentPage = 1;
  }

  sortData(column: SirListColumnKey): void {
    if (column === 'action') {
      return;
    }

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

  onPageSizeUi5Change(ev: Event): void {
    const pageSize = Number(ui5SelectStringValue(ev));
    if (!Number.isFinite(pageSize) || pageSize <= 0) {
      return;
    }
    this.pageSize = pageSize;
    this.currentPage = 1;
  }

  toggleFullScreen(): void {
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      void element.requestFullscreen();
      return;
    }
    void document.exitFullscreen();
  }

  private compareRecords(
    a: SampleInspectionRecord,
    b: SampleInspectionRecord,
    column: SirSortableKey,
    direction: 'asc' | 'desc',
  ): number {
    const left = this.cellDisplayValue(a, column).toLowerCase();
    const right = this.cellDisplayValue(b, column).toLowerCase();
    const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }
}
