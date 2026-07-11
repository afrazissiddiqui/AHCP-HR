import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { GoodReceiptListItem, GoodReceiptService } from './good-receipt.service';
import { MiscellaneousLayoutService } from '../miscellaneous-layout.service';

interface GoodReceiptColumn {
  key: 'docNum' | 'docDate' | 'seriesName' | 'branch' | 'warehouse' | 'itemCount' | 'status';
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-good-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './good-receipt.html',
  styleUrls: ['../miscellaneous-list.css'],
})
export class GoodReceipt implements OnInit {
  private readonly router = inject(Router);
  private readonly goodReceiptService = inject(GoodReceiptService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly showDialog = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly showDetailDialog = signal(false);
  readonly selectedRow = signal<GoodReceiptListItem | null>(null);
  readonly receipts = signal<GoodReceiptListItem[]>([]);
  readonly columns = signal<GoodReceiptColumn[]>([
    { key: 'docNum', label: 'Receipt No', visible: true },
    { key: 'docDate', label: 'Posting Date', visible: true },
    { key: 'seriesName', label: 'Series', visible: true },
    { key: 'branch', label: 'Branch', visible: true },
    { key: 'warehouse', label: 'Warehouse', visible: true },
    { key: 'itemCount', label: 'Items', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ]);

  readonly filteredReceipts = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.receipts();
    }

    return this.receipts().filter(
      (row) =>
        row.docNum.toLowerCase().includes(term) ||
        row.seriesName.toLowerCase().includes(term) ||
        row.branch.toLowerCase().includes(term) ||
        row.warehouse.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term),
    );
  });
  readonly pageSize = 10;
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredReceipts().length / this.pageSize)),
  );
  readonly paginatedReceipts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredReceipts().slice(start, start + this.pageSize);
  });
  readonly paginationEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filteredReceipts().length),
  );

  ngOnInit(): void {
    this.loadReceipts();
  }

  onAddNew(): void {
    void this.router.navigate(['/miscellaneous/good-receipt-note/create']);
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
  }

  openDialog(): void {
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  isColumnVisible(key: GoodReceiptColumn['key']): boolean {
    return this.columns().find((column) => column.key === key)?.visible !== false;
  }

  toggleColumnVisibility(key: GoodReceiptColumn['key'], visible: boolean): void {
    this.columns.update((columns) =>
      columns.map((column) => (column.key === key ? { ...column, visible } : column)),
    );
  }

  viewDetails(row: GoodReceiptListItem): void {
    this.selectedRow.set(row);
    this.showDetailDialog.set(true);
  }

  closeDetailDialog(): void {
    this.selectedRow.set(null);
    this.showDetailDialog.set(false);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
  }

  statusLabel(status: string): string {
    return status === 'C' ? 'Close' : 'Open';
  }

  isClosed(status: string): boolean {
    return status === 'C';
  }

  formatAmount(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  loadReceipts(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.goodReceiptService.listGoodsReceipts().subscribe({
      next: (rows) => {
        this.receipts.set(rows);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.receipts.set([]);
        this.currentPage.set(1);
        this.loading.set(false);
        this.loadError.set('Could not load good receipt records.');
      },
    });
  }
}
