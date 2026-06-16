import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar';
import { MiscellaneousLayoutService } from './miscellaneous-layout.service';

interface InventoryTransferRow {
  transferNo: string;
  postingDate: string;
  fromWarehouse: string;
  toWarehouse: string;
  itemCount: number;
  status: 'Draft' | 'Posted';
}

@Component({
  selector: 'app-inventory-transfer-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './inventory-transfer-page.html',
  styleUrls: ['./miscellaneous-list.css'],
})
export class InventoryTransferPageComponent {
  private readonly router = inject(Router);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');

  readonly transfers = signal<InventoryTransferRow[]>([
    {
      transferNo: 'IT-2026-0001',
      postingDate: '2026-06-10',
      fromWarehouse: 'Main Store',
      toWarehouse: 'Plant Store',
      itemCount: 5,
      status: 'Posted',
    },
    {
      transferNo: 'IT-2026-0002',
      postingDate: '2026-06-12',
      fromWarehouse: 'Spare Parts',
      toWarehouse: 'Assembly',
      itemCount: 3,
      status: 'Draft',
    },
    {
      transferNo: 'IT-2026-0003',
      postingDate: '2026-06-14',
      fromWarehouse: 'Raw Material',
      toWarehouse: 'Production',
      itemCount: 8,
      status: 'Posted',
    },
  ]);

  readonly filteredTransfers = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.transfers();
    }

    return this.transfers().filter((row) =>
      row.transferNo.toLowerCase().includes(term) ||
      row.fromWarehouse.toLowerCase().includes(term) ||
      row.toWarehouse.toLowerCase().includes(term) ||
      row.status.toLowerCase().includes(term)
    );
  });

  onAddNewTransfer(): void {
    void this.router.navigate(['/miscellaneous/inventory-transfer/create']);
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
