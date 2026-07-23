import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryTransferRequestRecord, InventoryTransferService } from '../inventory-transfer/inventory-transfer.service';
import { MiscellaneousLayoutService } from '../miscellaneous-layout.service';

interface InventoryTransferRequestColumn {
  key: 'docNum' | 'docDate' | 'fromWarehouse' | 'toWarehouse' | 'itemCount' | 'docStatus';
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-inventory-transfer-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-transfer-request.html',
  styleUrls: ['../../sample-inspection-request/sample-inspection-request.css'],
})
export class InventoryTransferRequest implements OnInit {
  private readonly router = inject(Router);
  private readonly inventoryTransferService = inject(InventoryTransferService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly showDialog = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly showDetailDialog = signal(false);
  readonly selectedRow = signal<InventoryTransferRequestRecord | null>(null);
  readonly requests = signal<InventoryTransferRequestRecord[]>([]);
  readonly columns = signal<InventoryTransferRequestColumn[]>([
    { key: 'docNum', label: 'Request No', visible: true },
    { key: 'docDate', label: 'Posting Date', visible: true },
    { key: 'fromWarehouse', label: 'From Warehouse', visible: true },
    { key: 'toWarehouse', label: 'To Warehouse', visible: true },
    { key: 'itemCount', label: 'Items', visible: true },
    { key: 'docStatus', label: 'Status', visible: true },
  ]);

  readonly filteredRequests = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.requests();
    }

    return this.requests().filter(
      (row) =>
        row.docNum.toLowerCase().includes(term) ||
        row.fromWarehouse.toLowerCase().includes(term) ||
        row.toWarehouse.toLowerCase().includes(term) ||
        row.docStatus.toLowerCase().includes(term),
    );
  });
  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRequests().length / this.pageSize)));
  readonly paginatedRequests = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRequests().slice(start, start + this.pageSize);
  });
  readonly paginationEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredRequests().length));

  ngOnInit(): void {
    this.loadRequests();
  }

  onAddNewRequest(): void {
    void this.router.navigate(['/miscellaneous/inventory-transfer-request/create']);
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

  isColumnVisible(key: InventoryTransferRequestColumn['key']): boolean {
    return this.columns().find((column) => column.key === key)?.visible !== false;
  }

  toggleColumnVisibility(key: InventoryTransferRequestColumn['key'], visible: boolean): void {
    this.columns.update((columns) => columns.map((column) => (column.key === key ? { ...column, visible } : column)));
  }

  viewDetails(row: InventoryTransferRequestRecord): void {
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

  loadRequests(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.inventoryTransferService.listRequests().subscribe({
      next: (rows) => {
        this.requests.set(rows);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.requests.set([]);
        this.currentPage.set(1);
        this.loading.set(false);
        this.loadError.set('Could not load inventory transfer requests.');
      },
    });
  }
}
