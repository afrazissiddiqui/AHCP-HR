import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { AuthService } from '../../../../services/auth.service';
import { GoodReceiptService, buildCreateGoodReceiptPayload } from '../good-receipt.service';
import { WarehouseService } from '../../../../services/warehouse.service';
import { MiscellaneousLayoutService } from '../../miscellaneous-layout.service';
import { OitmItem } from '../../../../constants/oitm-items';
import { OitmItemPickerDialogComponent } from '../../oitm-item-picker-dialog';
import { WarehouseSearchSelectComponent } from '../../warehouse-search-select';
import {
  GoodReceiptHeader,
  GoodReceiptLine,
  createEmptyGoodReceiptHeader,
  createEmptyGoodReceiptLine,
  updateGoodReceiptLine,
} from '../good-receipt.model';

@Component({
  selector: 'app-add-good-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule, OitmItemPickerDialogComponent, WarehouseSearchSelectComponent],
  templateUrl: './add-good-receipt.html',
  styleUrls: ['../../miscellaneous-form.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddGoodReceipt implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly goodReceiptService = inject(GoodReceiptService);
  private readonly warehouseService = inject(WarehouseService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly saving = signal(false);
  readonly activeSection = signal<'header' | 'items' | 'footer'>('header');
  readonly itemPickerOpen = signal(false);
  readonly itemPickerRowIndex = signal<number | null>(null);
  readonly submittedBy = signal(this.authService.getSessionUser()?.name ?? '');

  readonly branchOptions = signal([
    { code: '1', name: 'AHCP_Peshawar' },
    { code: '2', name: 'AHCP_HO' },
    { code: '3', name: 'AHCP_Faisalabad' },
  ]);

  readonly pageTitle = computed(() => 'Good Receipt');

  readonly headerForm = signal<GoodReceiptHeader>(createEmptyGoodReceiptHeader());
  readonly contentLines = signal<GoodReceiptLine[]>([createEmptyGoodReceiptLine()]);

  readonly totalAmount = computed(() =>
    this.contentLines()
      .map((line) => (line.quantity ?? 0) * (line.unitPrice ?? 0))
      .reduce((sum, amount) => sum + amount, 0),
  );

  ngOnInit(): void {
    this.warehouseService.ensureLoaded().subscribe({ error: () => undefined });
  }

  updateBranch(value: string): void {
    const selected = this.branchOptions().find((branch) => branch.code === value);
    if (!selected) {
      return;
    }
    this.headerForm.update((state) => ({
      ...state,
      branchId: selected.code,
      branchName: selected.name,
    }));
  }

  updateHeaderField(field: keyof GoodReceiptHeader, value: string): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  addContentLine(): void {
    this.contentLines.update((lines) => [...lines, createEmptyGoodReceiptLine()]);
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  updateContentLine(index: number, field: keyof GoodReceiptLine, value: string): void {
    this.contentLines.update((rows) => updateGoodReceiptLine(rows, index, field, value));
  }

  formatAmount(value: number): string {
    return value === 0
      ? '0.00'
      : value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  }

  scrollTo(section: 'header' | 'items' | 'footer'): void {
    this.activeSection.set(section);
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
  }

  openItemPicker(index: number): void {
    this.itemPickerRowIndex.set(index);
    this.itemPickerOpen.set(true);
  }

  onItemsSelected(items: OitmItem[]): void {
    const index = this.itemPickerRowIndex();
    if (index === null || items.length === 0) {
      return;
    }

    this.contentLines.update((rows) => {
      const updated = [...rows];
      const first = items[0];
      updated[index] = {
        ...updated[index],
        itemCode: first.itemCode,
        itemDescription: first.itemName,
      };

      const extras = items.slice(1).map((item) => ({
        ...createEmptyGoodReceiptLine(),
        itemCode: item.itemCode,
        itemDescription: item.itemName,
      }));

      return [...updated, ...extras];
    });

    this.itemPickerRowIndex.set(null);
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    const header = this.headerForm();
    if (!header.documentDate.trim()) {
      this.alertService.validation('Document Date is required.');
      return;
    }

    if (!header.postingDate.trim()) {
      this.alertService.validation('Posting Date is required.');
      return;
    }

    const lines = this.contentLines().filter((line) => line.itemCode.trim());
    if (lines.length === 0) {
      this.alertService.validation('At least one line item is required.');
      return;
    }

    if (lines.some((line) => !line.warehouse.trim())) {
      this.alertService.validation('Warehouse is required for every line item.');
      return;
    }

    if (lines.some((line) => line.quantity == null || line.quantity <= 0)) {
      this.alertService.validation('Quantity is required for every line item.');
      return;
    }

    const payload = buildCreateGoodReceiptPayload(header, this.contentLines());

    this.saving.set(true);
    this.goodReceiptService.create(payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        const ok = response?.success === true || response?.status === true;
        if (!ok) {
          this.alertService.validation(
            response?.message?.trim() || 'Good receipt could not be saved.',
          );
          return;
        }

        const docEntry = response?.docEntry ?? response?.data?.['docEntry'];
        const message =
          response?.message?.trim() ||
          (docEntry != null
            ? `Good receipt created (Doc #${docEntry}).`
            : 'Good receipt was created successfully.');

        void this.alertService.successAndWait('Success', message).then(() => {
          void this.router.navigate(['/miscellaneous/good-receipt-note']);
        });
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.saving.set(false);
        this.alertService.validation(
          err?.error?.message ??
            err?.message ??
            'Could not save good receipt. Make sure the backend is running.',
        );
      },
    });
  }
}
