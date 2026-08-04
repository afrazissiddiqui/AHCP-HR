import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MiscellaneousLayoutService } from '../../miscellaneous/miscellaneous-layout.service';

interface PurchaseOrderListColumn {
  key: 'docNum' | 'docDate' | 'vendor' | 'warehouse' | 'itemCount' | 'status';
  label: string;
  visible: boolean;
}

interface PurchaseOrderListItem {
  docNum: string;
  docDate: string;
  vendor: string;
  warehouse: string;
  itemCount: number;
  status: string;
  remarks?: string;
  items: Array<{
    itemCode: string;
    itemDescription: string;
    warehouse: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    batchNumber?: string;
  }>;
}

@Component({
  selector: 'app-purchase-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-order-list.html',
  styleUrls: ['../../miscellaneous/miscellaneous-list.css', '../../sample-inspection-request/sample-inspection-request.css'],
})
export class PurchaseOrderListComponent {
  private readonly router = inject(Router);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly showDialog = signal(false);
  readonly showDetailDialog = signal(false);
  readonly selectedRow = signal<PurchaseOrderListItem | null>(null);
  readonly orders = signal<PurchaseOrderListItem[]>([
    {
      docNum: 'PO-1001',
      docDate: '2026-08-01',
      vendor: 'ABC Supplies',
      warehouse: 'WH-01',
      itemCount: 3,
      status: 'O',
      remarks: 'Urgent procurement for production line.',
      items: [
        {
          itemCode: 'ITEM-001',
          itemDescription: 'Raw Material A',
          warehouse: 'WH-01',
          quantity: 50,
          unitPrice: 12.5,
          lineTotal: 625,
          batchNumber: 'B-1001',
        },
        {
          itemCode: 'ITEM-002',
          itemDescription: 'Packing Box',
          warehouse: 'WH-01',
          quantity: 100,
          unitPrice: 2.25,
          lineTotal: 225,
          batchNumber: 'B-1002',
        },
      ],
    },
    {
      docNum: 'PO-1002',
      docDate: '2026-08-03',
      vendor: 'Global Parts',
      warehouse: 'WH-02',
      itemCount: 2,
      status: 'C',
      remarks: 'Approved through standard procurement.',
      items: [
        {
          itemCode: 'ITEM-003',
          itemDescription: 'Spare Valve',
          warehouse: 'WH-02',
          quantity: 10,
          unitPrice: 85,
          lineTotal: 850,
          batchNumber: 'B-2001',
        },
      ],
    },
  ]);

  readonly columns = signal<PurchaseOrderListColumn[]>([
    { key: 'docNum', label: 'Order No', visible: true },
    { key: 'docDate', label: 'Posting Date', visible: true },
    { key: 'vendor', label: 'Vendor', visible: true },
    { key: 'warehouse', label: 'Warehouse', visible: true },
    { key: 'itemCount', label: 'Items', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ]);

  readonly filteredOrders = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.orders();
    }

    return this.orders().filter(
      (row) =>
        row.docNum.toLowerCase().includes(term) ||
        row.vendor.toLowerCase().includes(term) ||
        row.warehouse.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term),
    );
  });

  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredOrders().length / this.pageSize)));
  readonly paginatedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });
  readonly paginationEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredOrders().length));

  onAddNew(): void {
    void this.router.navigate(['/miscellaneous/purchase-request']);
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

  isColumnVisible(key: PurchaseOrderListColumn['key']): boolean {
    return this.columns().find((column) => column.key === key)?.visible !== false;
  }

  toggleColumnVisibility(key: PurchaseOrderListColumn['key'], visible: boolean): void {
    this.columns.update((columns) => columns.map((column) => (column.key === key ? { ...column, visible } : column)));
  }

  viewDetails(row: PurchaseOrderListItem): void {
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
}
