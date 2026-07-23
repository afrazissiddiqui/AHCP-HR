import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DeliveryListItem, DeliveryService } from './delivery.service';
import { MiscellaneousLayoutService } from '../miscellaneous-layout.service';

interface DeliveryColumn {
  key: 'docNum' | 'docDate' | 'customer' | 'shipToAddress' | 'itemCount' | 'status';
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery.html',
  styleUrls: ['../../sample-inspection-request/sample-inspection-request.css'],
})
export class Delivery implements OnInit {
  private readonly router = inject(Router);
  private readonly deliveryService = inject(DeliveryService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly showDialog = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly showDetailDialog = signal(false);
  readonly selectedRow = signal<DeliveryListItem | null>(null);
  readonly deliveries = signal<DeliveryListItem[]>([]);
  readonly columns = signal<DeliveryColumn[]>([
    { key: 'docNum', label: 'Delivery No.', visible: true },
    { key: 'docDate', label: 'Posting Date', visible: true },
    { key: 'customer', label: 'Customer', visible: true },
    { key: 'shipToAddress', label: 'Ship To Address', visible: true },
    { key: 'itemCount', label: 'Item Count', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ]);

  readonly filteredDeliveries = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.deliveries();
    }

    return this.deliveries().filter(
      (row) =>
        row.docNum.toLowerCase().includes(term) ||
        `${row.cardCode} ${row.cardName}`.toLowerCase().includes(term) ||
        row.shipToAddress.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term),
    );
  });
  readonly pageSize = 10;
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredDeliveries().length / this.pageSize)),
  );
  readonly paginatedDeliveries = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredDeliveries().slice(start, start + this.pageSize);
  });
  readonly paginationEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filteredDeliveries().length),
  );

  ngOnInit(): void {
    this.loadDeliveries();
  }

  onAddNewDelivery(): void {
    void this.router.navigate(['/miscellaneous/delivery/create']);
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

  isColumnVisible(key: DeliveryColumn['key']): boolean {
    return this.columns().find((column) => column.key === key)?.visible !== false;
  }

  toggleColumnVisibility(key: DeliveryColumn['key'], visible: boolean): void {
    this.columns.update((columns) =>
      columns.map((column) => (column.key === key ? { ...column, visible } : column)),
    );
  }

  onViewDetails(row: DeliveryListItem): void {
    this.selectedRow.set(row);
    this.showDetailDialog.set(true);
  }

  closeDetailDialog(): void {
    this.showDetailDialog.set(false);
    this.selectedRow.set(null);
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

  loadDeliveries(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.deliveryService.list().subscribe({
      next: (rows) => {
        this.deliveries.set(rows);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.deliveries.set([]);
        this.currentPage.set(1);
        this.loading.set(false);
        this.loadError.set('Could not load deliveries.');
      },
    });
  }
}
