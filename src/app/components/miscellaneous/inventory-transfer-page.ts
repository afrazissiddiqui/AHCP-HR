import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar';

interface InventoryTransferRow {
  transferNo: string;
  postingDate: string;
  fromWarehouse: string;
  toWarehouse: string;
  itemCount: number;
  status: 'Draft' | 'Posted';
}

type LineSection = 'content' | 'attachment';

interface TransferLineRow {
  itemNo: string;
  itemDescription: string;
  quantity: number | null;
  account: string;
  itemCost: number | null;
  uomCode: string;
}

@Component({
  selector: 'app-inventory-transfer-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './inventory-transfer-page.html',
  styleUrl: './inventory-transfer-page.css',
})
export class InventoryTransferPageComponent {
  readonly searchText = signal('');
  readonly showAddForm = signal(false);
  readonly activeLineSection = signal<LineSection>('content');

  readonly headerForm = signal({
    numberSeries: '',
    postingDate: '',
    documentDate: '',
    refNumber: '',
    priceList: '',
  });

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

  readonly contentLines = signal<TransferLineRow[]>([this.createEmptyLine()]);
  readonly attachmentLines = signal<TransferLineRow[]>([this.createEmptyLine()]);

  onAddNewTransfer(): void {
    this.showAddForm.set(true);
  }

  onBackToList(): void {
    this.showAddForm.set(false);
  }

  setLineSection(section: LineSection): void {
    this.activeLineSection.set(section);
  }

  updateHeaderField(
    field: 'numberSeries' | 'postingDate' | 'documentDate' | 'refNumber' | 'priceList',
    value: string
  ): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  getActiveLines(): TransferLineRow[] {
    return this.activeLineSection() === 'content' ? this.contentLines() : this.attachmentLines();
  }

  addLineRow(): void {
    if (this.activeLineSection() === 'content') {
      this.contentLines.update((rows) => [...rows, this.createEmptyLine()]);
      return;
    }
    this.attachmentLines.update((rows) => [...rows, this.createEmptyLine()]);
  }

  updateLine(
    index: number,
    field: keyof TransferLineRow,
    value: string
  ): void {
    const target = this.activeLineSection() === 'content' ? this.contentLines : this.attachmentLines;
    target.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) {
          return row;
        }

        if (field === 'quantity' || field === 'itemCost') {
          const numericValue = value === '' ? null : Number(value);
          return { ...row, [field]: Number.isNaN(numericValue) ? null : numericValue };
        }

        return { ...row, [field]: value };
      })
    );
  }

  private createEmptyLine(): TransferLineRow {
    return {
      itemNo: '',
      itemDescription: '',
      quantity: null,
      account: '',
      itemCost: null,
      uomCode: '',
    };
  }
}
