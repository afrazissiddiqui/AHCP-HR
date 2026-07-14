import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../../config/api.config';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';

export interface PostedProductionOrderRecord {
  docEntry?: string | number;
  docNum?: string | number;
  docDate?: string;
  dueDate?: string;
  itemCode?: string;
  itemName?: string;
  itemDescription?: string;
  quantity?: number | string;
  warehouse?: string;
  status?: string;
  batchNumber?: string;
  [key: string]: unknown;
}

interface ReceiptFromProductionApiPayload {
  docEntry: number;
  docDate: string;
  taxDate: string;
  docDueDate: string;
  remarks: string;
  warehouse: string;
  quantity: number;
  batchNumber: string;
  manufacturingDate: string;
  branch: string;
  expiryDate: string;
}

@Component({
  selector: 'app-issue-from-production',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './issue-from-production.html',
  styleUrl: './issue-from-production.css',
})
export class IssueFromProductionComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly records = signal<PostedProductionOrderRecord[]>([]);
  readonly searchText = signal('');
  readonly showDetailDialog = signal(false);
  readonly selectedRecord = signal<PostedProductionOrderRecord | null>(null);

  readonly columns = [
    { key: 'docNum', label: 'Doc No.' },
    { key: 'docDate', label: 'Doc Date' },
    { key: 'itemCode', label: 'Item Code' },
    { key: 'itemName', label: 'Item Name' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'status', label: 'Status' },
  ] as const;

  readonly totalRecords = computed(() => this.records().length);

  readonly filteredRecords = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    if (!query) {
      return this.records();
    }

    return this.records().filter((record) => {
      const searchable = [
        this.displayValue(record.docNum),
        this.displayValue(record.docDate),
        this.displayValue(record.itemCode),
        this.displayValue(record.itemName),
        this.displayValue(record.itemDescription),
        this.displayValue(record.quantity),
        this.displayValue(record.warehouse),
        this.displayValue(record.status),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  });

  ngOnInit(): void {
    this.loadRecords();
  }

  toggleSidebar(): void {
    document.body.classList.toggle('sidebar-collapsed');
  }

  viewRecord(record: PostedProductionOrderRecord): void {
    this.selectedRecord.set(record);
    this.showDetailDialog.set(true);
  }

  addReceiptFromProduction(record: PostedProductionOrderRecord): void {
    this.selectedRecord.set(record);
    void this.submitIssueForProduction(record);
  }

  closeDetailDialog(): void {
    this.showDetailDialog.set(false);
    this.selectedRecord.set(null);
  }

  loadRecords(): void {
    this.loading.set(true);
    this.http
      .get<unknown>(apiUrl('receipt_from_production'))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const items = this.extractRecords(response);
          this.records.set(items);
        },
        error: (error: unknown) => {
          this.records.set([]);
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load posted production orders.'),
          );
        },
      });
  }

  submitIssueForProduction(record?: PostedProductionOrderRecord): void {
    const activeRecord = record ?? this.selectedRecord();
    if (!activeRecord) {
      return;
    }

    const docEntry = this.parseDocEntry(activeRecord.docEntry);
    if (!docEntry) {
      void this.alertService.warning('Missing production order', 'Select a production order with a valid document entry.');
      return;
    }

    const payload = this.buildReceiptFromProductionPayload(activeRecord);

    this.submitting.set(true);
    this.http
      .post<unknown>(apiUrl('createReceiptFromProduction'), payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.alertService.success('Success', 'Receipt from production submitted successfully.');
          this.closeDetailDialog();
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Submit Failed',
            formatApiErrorMessage(error, 'Could not submit receipt from production.'),
          );
        },
      });
  }

  cellValue(record: PostedProductionOrderRecord, key: string): string {
    const value = record[key as keyof PostedProductionOrderRecord];
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    if (key === 'quantity') {
      const normalized = Number(value);
      return Number.isFinite(normalized) ? normalized.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
    }

    return String(value);
  }

  private extractRecords(response: unknown): PostedProductionOrderRecord[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map((item) => this.mapRecord(item));
    }

    if (typeof response !== 'object') {
      return [];
    }

    const root = response as Record<string, unknown>;
    const candidates = ['data', 'items', 'results', 'records', 'list', 'receipt_from_production', 'receipts_from_production'];

    for (const key of candidates) {
      const value = root[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map((item) => this.mapRecord(item));
      }
      if (value && typeof value === 'object') {
        const nested = this.extractRecords(value);
        if (nested.length) {
          return nested;
        }
      }
    }

    return [this.mapRecord(root)];
  }

  private mapRecord(item: Record<string, unknown>): PostedProductionOrderRecord {
    const lines = this.extractLines(item);
    const firstLine = lines[0] ?? null;

    return {
      docEntry: this.pickValue(item, ['docEntry', 'DocEntry', 'id', 'Id']),
      docNum: this.pickValue(item, ['docNum', 'DocNum', 'number', 'Number']),
      docDate: this.pickText(item, ['docDate', 'DocDate', 'date', 'Date']),
      dueDate: this.pickText(item, ['dueDate', 'DocDueDate', 'docDueDate', 'DueDate']),
      itemCode:
        this.pickText(item, ['itemCode', 'ItemCode', 'item_code', 'Item']) ||
        this.pickText(firstLine ?? {}, ['ItemCode', 'itemCode', 'item_code', 'Item']),
      itemName:
        this.pickText(item, ['itemName', 'ItemName', 'item_name', 'Dscription', 'itemDescription', 'ItemDescription']) ||
        this.pickText(firstLine ?? {}, ['Dscription', 'itemDescription', 'ItemDescription', 'itemName', 'ItemName']),
      itemDescription:
        this.pickText(item, ['itemDescription', 'ItemDescription', 'description', 'Dscription']) ||
        this.pickText(firstLine ?? {}, ['Dscription', 'itemDescription', 'ItemDescription', 'description']),
      quantity:
        this.pickNumber(item, ['quantity', 'Quantity', 'qty', 'Qty']) ||
        this.pickNumber(firstLine ?? {}, ['Quantity', 'quantity', 'qty', 'Qty']),
      warehouse:
        this.pickText(item, ['warehouse', 'Warehouse', 'WhsCode']) ||
        this.pickText(firstLine ?? {}, ['WhsCode', 'warehouse', 'Warehouse']),
      status: this.pickText(item, ['status', 'Status', 'docStatus', 'DocStatus']),
      batchNumber:
        this.pickText(item, ['batchNumber', 'BatchNumber', 'batchNum', 'BatchNum']) ||
        this.pickText(firstLine ?? {}, ['BatchNum', 'batchNum', 'batchNumber', 'batch_number']),
    };
  }

  private extractLines(item: Record<string, unknown>): Record<string, unknown>[] {
    const candidates = ['DocumentLines', 'documentLines', 'Lines', 'lines', 'items', 'Items'];

    for (const key of candidates) {
      const value = item[key];
      if (Array.isArray(value)) {
        return value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object');
      }
    }

    return [];
  }

  private pickText(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (value === null || value === undefined || value === '') {
        continue;
      }
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
    return '';
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number | string {
    for (const key of keys) {
      const value = source[key];
      if (value === null || value === undefined || value === '') {
        continue;
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return '';
  }

  private pickValue(source: Record<string, unknown>, keys: string[]): string | number {
    for (const key of keys) {
      const value = source[key];
      if (value === null || value === undefined || value === '') {
        continue;
      }
      return String(value);
    }
    return '';
  }

  private displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value);
  }

  private parseDocEntry(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private parseQuantity(value: unknown): number {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 1;
  }

  buildReceiptFromProductionPayload(record: PostedProductionOrderRecord): ReceiptFromProductionApiPayload {
    const docDate = this.formatDate(record.docDate) || this.todayIso();
    const quantity = this.parseQuantity(record.quantity);

    return {
      docEntry: this.parseDocEntry(record.docEntry) ?? 0,
      docDate,
      taxDate: docDate,
      docDueDate: this.formatDate(record.dueDate) || docDate,
      remarks: 'Receipt From Production Api hit',
      warehouse: this.displayValue(record.warehouse) || 'PSH-WH06',
      quantity,
      batchNumber: this.displayValue(record.batchNumber) || 'FG250702001',
      manufacturingDate: docDate,
      branch: '1',
      expiryDate: this.addYears(docDate, 2),
    };
  }

  private formatDate(value: unknown): string {
    const text = this.displayValue(value);
    if (!text) {
      return '';
    }
    const match = text.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : text;
  }

  private addYears(value: string, years: number): string {
    const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
    if (![year, month, day].every((part) => Number.isFinite(part))) {
      return value;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCFullYear(date.getUTCFullYear() + years);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
