import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../../config/api.config';

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
  [key: string]: unknown;
}

@Component({
  selector: 'app-issue-from-production',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue-from-production.html',
  styleUrl: './issue-from-production.css',
})
export class IssueFromProductionComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly records = signal<PostedProductionOrderRecord[]>([]);
  readonly searchText = signal('');

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
    return {
      docEntry: this.pickValue(item, ['docEntry', 'DocEntry', 'id', 'Id']),
      docNum: this.pickValue(item, ['docNum', 'DocNum', 'number', 'Number']),
      docDate: this.pickText(item, ['docDate', 'DocDate', 'date', 'Date']),
      dueDate: this.pickText(item, ['dueDate', 'DocDueDate', 'docDueDate', 'DueDate']),
      itemCode: this.pickText(item, ['itemCode', 'ItemCode', 'item_code', 'Item']),
      itemName: this.pickText(item, ['itemName', 'ItemName', 'item_name', 'Dscription', 'itemDescription', 'ItemDescription']),
      itemDescription: this.pickText(item, ['itemDescription', 'ItemDescription', 'description', 'Dscription']),
      quantity: this.pickNumber(item, ['quantity', 'Quantity', 'qty', 'Qty']),
      warehouse: this.pickText(item, ['warehouse', 'Warehouse', 'WhsCode']),
      status: this.pickText(item, ['status', 'Status', 'docStatus', 'DocStatus']),
    };
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
}
