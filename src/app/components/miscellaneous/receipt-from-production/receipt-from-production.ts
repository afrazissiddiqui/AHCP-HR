import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import {
  ReceiptFromProductionListItem,
  ReceiptFromProductionService,
} from './receipt-from-production.service';
import { MiscellaneousLayoutService } from '../miscellaneous-layout.service';

interface ReceiptColumn {
  key: 'docNum' | 'docDate' | 'seriesName' | 'branch' | 'warehouse' | 'itemCount' | 'status';
  label: string;
  visible: boolean;
}

export interface ProductionStickerData {
  stickerId: string;
  productDescription: string;
  colour: string;
  machine: string;
  material: string;
  productionDateTime: string;
  shift: string;
  quantity: string;
  bestBefore: string;
  bestBeforeNote: string;
  qrPayload: string;
  qrImageUrl: string;
}

@Component({
  selector: 'app-receipt-from-production',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './receipt-from-production.html',
  styleUrls: ['../miscellaneous-list.css', './production-sticker.css'],
})
export class ReceiptFromProduction implements OnInit {
  private readonly router = inject(Router);
  private readonly receiptFromProductionService = inject(ReceiptFromProductionService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly searchText = signal('');
  readonly currentPage = signal(1);
  readonly showDialog = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly showDetailDialog = signal(false);
  readonly selectedRow = signal<ReceiptFromProductionListItem | null>(null);
  readonly showStickerDialog = signal(false);
  readonly stickerData = signal<ProductionStickerData | null>(null);
  readonly receipts = signal<ReceiptFromProductionListItem[]>([]);
  readonly columns = signal<ReceiptColumn[]>([
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

  isColumnVisible(key: ReceiptColumn['key']): boolean {
    return this.columns().find((column) => column.key === key)?.visible !== false;
  }

  toggleColumnVisibility(key: ReceiptColumn['key'], visible: boolean): void {
    this.columns.update((columns) =>
      columns.map((column) => (column.key === key ? { ...column, visible } : column)),
    );
  }

  viewDetails(row: ReceiptFromProductionListItem): void {
    this.selectedRow.set(row);
    this.showDetailDialog.set(true);
  }

  closeDetailDialog(): void {
    this.selectedRow.set(null);
    this.showDetailDialog.set(false);
  }

  openSticker(row: ReceiptFromProductionListItem): void {
    this.stickerData.set(this.buildStickerData(row));
    this.showStickerDialog.set(true);
  }

  closeStickerDialog(): void {
    this.showStickerDialog.set(false);
    this.stickerData.set(null);
  }

  printSticker(): void {
    const sticker = this.stickerData();
    if (!sticker) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=720,height=640');
    if (!printWindow) {
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Production Sticker</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
    }
    body { padding: 12px; }
    .production-sticker {
      width: 460px;
      border: 1.5px solid #111;
      border-radius: 4px;
      background: #fff;
      padding: 8px 10px 10px;
    }
    .production-sticker__title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .production-sticker__title-line {
      flex: 1;
      height: 1px;
      background: #111;
    }
    .production-sticker__title-text {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .production-sticker__id {
      border: 1.5px solid #111;
      border-radius: 3px;
      text-align: center;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.03em;
      padding: 6px 8px;
      margin-bottom: 6px;
      line-height: 1.2;
    }
    .production-sticker__body {
      display: grid;
      grid-template-columns: 1fr 110px;
      gap: 6px;
      align-items: stretch;
    }
    .production-sticker__grid {
      display: grid;
      grid-template-columns: 1.35fr 0.75fr;
      border: 1.5px solid #111;
      border-radius: 3px;
      overflow: hidden;
    }
    .production-sticker__cell {
      border-right: 1px solid #111;
      border-bottom: 1px solid #111;
      padding: 5px 7px;
      min-height: 42px;
    }
    .production-sticker__cell:nth-child(2n) { border-right: 0; }
    .production-sticker__cell:nth-last-child(-n + 2) { border-bottom: 0; }
    .production-sticker__label {
      font-size: 9px;
      color: #333;
      margin-bottom: 2px;
      line-height: 1.2;
    }
    .production-sticker__value {
      font-size: 12px;
      font-weight: 700;
      line-height: 1.2;
      word-break: break-word;
    }
    .production-sticker__note {
      margin-top: 1px;
      font-size: 8px;
      color: #444;
      line-height: 1.2;
    }
    .production-sticker__qr {
      border: 1.5px solid #111;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      min-height: 100%;
    }
    .production-sticker__qr img {
      width: 92px;
      height: 92px;
      object-fit: contain;
      display: block;
    }
    @page { margin: 8mm; size: auto; }
    @media print {
      body { padding: 0; }
      .production-sticker {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="production-sticker">
    <div class="production-sticker__title">
      <span class="production-sticker__title-line"></span>
      <span class="production-sticker__title-text">PRODUCTION STICKER</span>
      <span class="production-sticker__title-line"></span>
    </div>
    <div class="production-sticker__id">${this.escapeHtml(sticker.stickerId)}</div>
    <div class="production-sticker__body">
      <div class="production-sticker__grid">
        <div class="production-sticker__cell">
          <div class="production-sticker__label">Product Description</div>
          <div class="production-sticker__value">${this.escapeHtml(sticker.productDescription)}</div>
        </div>
        <div class="production-sticker__cell">
          <div class="production-sticker__label">Colour</div>
          <div class="production-sticker__value">${this.escapeHtml(sticker.colour)}</div>
        </div>
        <div class="production-sticker__cell">
          <div class="production-sticker__label">Machine</div>
          <div class="production-sticker__value">${this.escapeHtml(sticker.machine)}</div>
        </div>
        <div class="production-sticker__cell">
          <div class="production-sticker__label">Material</div>
          <div class="production-sticker__value">${this.escapeHtml(sticker.material)}</div>
        </div>
        <div class="production-sticker__cell">
          <div class="production-sticker__label">Production Date &amp; Time</div>
          <div class="production-sticker__value">${this.escapeHtml(sticker.productionDateTime)}</div>
        </div>
        <div class="production-sticker__cell">
          <div class="production-sticker__label">Shift</div>
          <div class="production-sticker__value">${this.escapeHtml(sticker.shift)}</div>
        </div>
        <div class="production-sticker__cell">
          <div class="production-sticker__label">Quantity (PCS)</div>
          <div class="production-sticker__value">${this.escapeHtml(sticker.quantity)}</div>
        </div>
        <div class="production-sticker__cell">
          <div class="production-sticker__label">Best Before</div>
          <div class="production-sticker__value">${this.escapeHtml(sticker.bestBefore)}</div>
          <div class="production-sticker__note">${this.escapeHtml(sticker.bestBeforeNote)}</div>
        </div>
      </div>
      <div class="production-sticker__qr">
        <img src="${this.escapeHtml(sticker.qrImageUrl)}" alt="${this.escapeHtml(sticker.stickerId)}" />
      </div>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

    this.receiptFromProductionService.list().subscribe({
      next: (rows) => {
        this.receipts.set(rows);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.receipts.set([]);
        this.currentPage.set(1);
        this.loading.set(false);
        this.loadError.set('Could not load receipt from production records.');
      },
    });
  }

  private buildStickerData(row: ReceiptFromProductionListItem): ProductionStickerData {
    const firstLine = row.items[0] ?? null;
    const quantity = row.items.reduce((sum, line) => sum + (line.quantity || 0), 0);
    const batchNumber = firstLine?.batchNumber?.trim() || '';
    const stickerId = batchNumber || this.buildStickerId(row.docDate, row.docNum);
    const productDescription =
      firstLine?.itemDescription?.trim() || firstLine?.itemCode?.trim() || '—';
    const productionDate = row.docDate || '';
    const bestBefore = row.docDueDate || this.addMonths(productionDate, 6);
    const qrPayload = stickerId;

    return {
      stickerId,
      productDescription,
      colour: firstLine?.itemColor?.trim() || 'Flint',
      machine: row.machineName?.trim() || 'H-1',
      material: 'IR',
      productionDateTime: this.formatStickerDateTime(productionDate),
      shift: row.shift?.trim() || 'A',
      quantity: this.formatQuantity(quantity),
      bestBefore: this.formatDisplayDate(bestBefore),
      bestBeforeNote: '6 Months from Production Date',
      qrPayload,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(qrPayload)}`,
    };
  }

  private buildStickerId(docDate: string, docNum: string): string {
    const match = docDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const datePart = match ? `${match[3]}${match[2]}${match[1].slice(-2)}` : '000000';
    const numPart = (docNum || '0').replace(/\D/g, '').padStart(3, '0') || '001';
    return `P-${datePart}-${numPart}`;
  }

  private formatStickerDateTime(isoDate: string): string {
    const displayDate = this.formatDisplayDate(isoDate);
    if (!displayDate || displayDate === '—') {
      return '—';
    }
    return `${displayDate} 09:30 AM`;
  }

  private formatDisplayDate(isoDate: string): string {
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return isoDate || '—';
    }
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  private formatQuantity(value: number): string {
    if (!value) {
      return '0';
    }
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  private addMonths(isoDate: string, months: number): string {
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return '';
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setMonth(date.getMonth() + months);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
