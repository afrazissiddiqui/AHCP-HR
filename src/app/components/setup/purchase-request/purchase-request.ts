import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { MiscellaneousLayoutService } from '../../miscellaneous/miscellaneous-layout.service';
import { OitmItem } from '../../../constants/oitm-items';
import { OitmItemsService } from '../../../services/oitm-items.service';

interface PurchaseRequestHeader {
  requestDate: string;
  postingDate: string;
  dueDate: string;
  branch: string;
  remarks: string;
  selectedBaseOrder: string;
}

interface PurchaseRequestLine {
  itemCode: string;
  itemDescription: string;
  vendor: string;
  requiredDate: string;
  requiredQuantity: number | null;
  infoPrice: number | null;
  discount: number | null;
  taxCode: string;
  department: string;
  uomCode: string;
  warehouse: string;
  quantity: number | null;
  manufacturingDate: string;
  expiryDate: string;
  batchNumber: string;
}

@Component({
  selector: 'app-purchase-request',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './purchase-request.html',
  styleUrls: ['../../sample-inspection-request/sample-inspection-request.css', '../../miscellaneous/miscellaneous-form.css', './purchase-request.css'],
})
export class PurchaseRequestComponent {
  private readonly router = inject(Router);
  private readonly oitmItemsService = inject(OitmItemsService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly headerForm = signal<PurchaseRequestHeader>({
    requestDate: '',
    postingDate: '',
    dueDate: '',
    branch: '',
    remarks: '',
    selectedBaseOrder: '',
  });

  readonly contentLines = signal<PurchaseRequestLine[]>([this.createEmptyLine()]);
  readonly itemOptions = signal<OitmItem[]>([]);
  readonly itemOptionsLoading = signal(false);
  readonly itemOptionsError = signal<string | null>(null);
  readonly itemSearchTerms = signal<Record<number, string>>({});
  readonly saving = signal(false);

  get hasValidLine(): boolean {
    return this.contentLines().some((line) => line.itemCode.trim().length > 0);
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  updateHeaderField<K extends keyof PurchaseRequestHeader>(field: K, value: string): void {
    this.headerForm.update((form) => ({ ...form, [field]: value }));
  }

  updateContentLine(index: number, field: keyof PurchaseRequestLine, value: string | number | null): void {
    this.contentLines.update((lines) =>
      lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  addContentLine(): void {
    this.contentLines.update((lines) => [...lines, this.createEmptyLine()]);
  }

  loadItemOptions(forceReload = false): void {
    if (!forceReload && this.itemOptions().length > 0) {
      return;
    }

    this.itemOptionsLoading.set(true);
    this.itemOptionsError.set(null);

    const request = forceReload ? this.oitmItemsService.reload() : this.oitmItemsService.ensureLoaded();

    request.subscribe({
      next: (items) => {
        this.itemOptions.set(items);
        this.itemOptionsLoading.set(false);
      },
      error: () => {
        this.itemOptions.set([]);
        this.itemOptionsLoading.set(false);
        this.itemOptionsError.set('Could not load items from AHCP.');
      },
    });
  }

  onItemCodeFocus(): void {
    this.loadItemOptions();
  }

  updateItemSearch(index: number, value: string): void {
    this.itemSearchTerms.update((terms) => ({ ...terms, [index]: value }));
  }

  getFilteredItemSuggestions(index: number): OitmItem[] {
    const term = (this.itemSearchTerms()[index] ?? '').trim().toLowerCase();
    if (!term) {
      return [];
    }

    return this.itemOptions().filter((item) => {
      const haystack = `${item.itemCode} ${item.itemName}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  applySuggestedItem(index: number, item: OitmItem): void {
    this.contentLines.update((lines) =>
      lines.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        return {
          ...line,
          itemCode: item.itemCode,
          itemDescription: item.itemName,
          uomCode: item.uom,
        };
      }),
    );
    this.itemSearchTerms.update((terms) => ({ ...terms, [index]: item.itemCode }));
  }

  selectItem(index: number, value: string): void {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      this.contentLines.update((lines) =>
        lines.map((line, lineIndex) => (lineIndex === index ? { ...line, itemCode: '', itemDescription: '', uomCode: '' } : line)),
      );
      return;
    }

    const selectedItem = this.itemOptions().find(
      (item) => item.itemCode.toLowerCase() === normalized || item.itemName.toLowerCase() === normalized,
    );

    if (!selectedItem) {
      return;
    }

    this.contentLines.update((lines) =>
      lines.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        return {
          ...line,
          itemCode: selectedItem.itemCode,
          itemDescription: selectedItem.itemName,
          uomCode: selectedItem.uom,
        };
      }),
    );
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  submitPurchaseRequest(): void {
    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
    }, 600);
  }

  createEmptyLine(): PurchaseRequestLine {
    return {
      itemCode: '',
      itemDescription: '',
      vendor: '',
      requiredDate: '',
      requiredQuantity: null,
      infoPrice: null,
      discount: null,
      taxCode: '',
      department: '',
      uomCode: '',
      warehouse: '',
      quantity: null,
      manufacturingDate: '',
      expiryDate: '',
      batchNumber: '',
    };
  }
}
