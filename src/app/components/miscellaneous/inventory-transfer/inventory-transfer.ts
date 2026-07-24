import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryTransferListItem, InventoryTransferService } from './inventory-transfer.service';
import { MiscellaneousLayoutService } from '../miscellaneous-layout.service';

interface InventoryTransferColumn {
  key: 'docNum' | 'docDate' | 'fromWarehouse' | 'toWarehouse' | 'itemCount' | 'status';
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-inventory-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-transfer.html',
  styleUrls: ['../miscellaneous-list.css', '../../sample-inspection-request/sample-inspection-request.css'],
})
export class InventoryTransfer implements OnInit {
  private readonly router = inject(Router);
  private readonly inventoryTransferService = inject(InventoryTransferService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly showDialog = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly showDetailDialog = signal(false);
  readonly selectedRow = signal<InventoryTransferListItem | null>(null);
  readonly transfers = signal<InventoryTransferListItem[]>([]);
  readonly columns = signal<InventoryTransferColumn[]>([
    { key: 'docNum', label: 'Transfer No', visible: true },
    { key: 'docDate', label: 'Posting Date', visible: true },
    { key: 'fromWarehouse', label: 'From Warehouse', visible: true },
    { key: 'toWarehouse', label: 'To Warehouse', visible: true },
    { key: 'itemCount', label: 'Items', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ]);

  readonly filteredTransfers = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.transfers();
    }

    return this.transfers().filter(
      (row) =>
        row.docNum.toLowerCase().includes(term) ||
        row.fromWarehouse.toLowerCase().includes(term) ||
        row.toWarehouse.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term),
    );
  });
  readonly pageSize = 10;
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTransfers().length / this.pageSize)),
  );
  readonly paginatedTransfers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredTransfers().slice(start, start + this.pageSize);
  });
  readonly paginationEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filteredTransfers().length),
  );

  ngOnInit(): void {
    this.loadTransfers();
  }

  onAddNewTransfer(): void {
    void this.router.navigate(['/miscellaneous/inventory-transfer/create']);
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

  isColumnVisible(key: InventoryTransferColumn['key']): boolean {
    return this.columns().find((column) => column.key === key)?.visible !== false;
  }

  toggleColumnVisibility(key: InventoryTransferColumn['key'], visible: boolean): void {
    this.columns.update((columns) =>
      columns.map((column) => (column.key === key ? { ...column, visible } : column)),
    );
  }

  viewDetails(row: InventoryTransferListItem): void {
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

  loadTransfers(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.inventoryTransferService.list().subscribe({
      next: (rows) => {
        this.transfers.set(rows);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.transfers.set([]);
        this.currentPage.set(1);
        this.loading.set(false);
        this.loadError.set('Could not load inventory transfers.');
      },
    });
  }
}
