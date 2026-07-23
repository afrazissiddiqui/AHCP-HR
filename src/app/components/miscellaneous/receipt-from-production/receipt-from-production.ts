import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
<<<<<<< HEAD
import {
  ReceiptFromProductionListItem,
  ReceiptFromProductionService,
} from './receipt-from-production.service';
=======
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
>>>>>>> 83a0991f3d176f2370e57291e30699e9114d82fc
import { MiscellaneousLayoutService } from '../miscellaneous-layout.service';
import { ReceiptFromProductionListItem, ReceiptFromProductionService } from './receipt-from-production.service';

interface ReceiptFromProductionColumn {
  key: 'docNum' | 'docDate' | 'warehouse' | 'branch' | 'itemCount' | 'status';
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-receipt-from-production',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receipt-from-production.html',
<<<<<<< HEAD
  styleUrls: ['../../sample-inspection-request/sample-inspection-request.css', './production-sticker.css'],
=======
  styleUrls: ['../miscellaneous-list.css'],
>>>>>>> 83a0991f3d176f2370e57291e30699e9114d82fc
})
export class ReceiptFromProduction implements OnInit {
  private readonly router = inject(Router);
  private readonly receiptService = inject(ReceiptFromProductionService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly showDialog = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly showDetailDialog = signal(false);
  readonly selectedRow = signal<ReceiptFromProductionListItem | null>(null);
  readonly rows = signal<ReceiptFromProductionListItem[]>([]);
  readonly columns = signal<ReceiptFromProductionColumn[]>([
    { key: 'docNum', label: 'Receipt No', visible: true },
    { key: 'docDate', label: 'Posting Date', visible: true },
    { key: 'warehouse', label: 'Warehouse', visible: true },
    { key: 'branch', label: 'Branch', visible: true },
    { key: 'itemCount', label: 'Items', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ]);

  readonly filteredRows = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.rows();
    }

    return this.rows().filter(
      (row) =>
        row.docNum.toLowerCase().includes(term) ||
        row.warehouse.toLowerCase().includes(term) ||
        row.branch.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term),
    );
  });

  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize)));
  readonly paginatedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });
  readonly paginationEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredRows().length));

  ngOnInit(): void {
    this.loadRows();
  }

  onAddNewReceipt(): void {
    void this.router.navigate(['/miscellaneous/receipt-from-production/create']);
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

  isColumnVisible(key: ReceiptFromProductionColumn['key']): boolean {
    return this.columns().find((column) => column.key === key)?.visible !== false;
  }

  toggleColumnVisibility(key: ReceiptFromProductionColumn['key'], visible: boolean): void {
    this.columns.update((columns) => columns.map((column) => (column.key === key ? { ...column, visible } : column)));
  }

  viewDetails(row: ReceiptFromProductionListItem): void {
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

  loadRows(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.receiptService.list().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.currentPage.set(1);
        this.loading.set(false);
        this.loadError.set('Could not load receipt from production records.');
      },
    });
  }
}
