import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { AuthService } from '../../../../services/auth.service';
import { WarehouseService } from '../../../../services/warehouse.service';
import { MiscellaneousLayoutService } from '../../miscellaneous-layout.service';
import { OitmItem } from '../../../../constants/oitm-items';
import { OitmItemPickerDialogComponent } from '../../oitm-item-picker-dialog';
import { WarehouseSearchSelectComponent } from '../../warehouse-search-select';
import {
  ReceiptFromProductionHeader,
  ReceiptFromProductionLine,
  createEmptyReceiptFromProductionHeader,
  createEmptyReceiptFromProductionLine,
  updateReceiptFromProductionLine,
} from '../receipt-from-production.model';
import {
  ProductionOrderRecord,
  ReceiptFromProductionService,
  buildCreateReceiptFromProductionPayload,
} from '../receipt-from-production.service';
import { formatApiErrorMessage, formatSapApiFailureMessage } from '../../../../utils/api-error.util';

@Component({
  selector: 'app-add-receipt-from-production',
  standalone: true,
  imports: [CommonModule, FormsModule, OitmItemPickerDialogComponent, WarehouseSearchSelectComponent],
  templateUrl: './add-receipt-from-production.html',
  styleUrls: ['../../miscellaneous-form.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddReceiptFromProduction implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly receiptFromProductionService = inject(ReceiptFromProductionService);
  private readonly warehouseService = inject(WarehouseService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly saving = signal(false);
  readonly activeSection = signal<'header' | 'items' | 'footer'>('header');
  readonly itemPickerOpen = signal(false);
  readonly itemPickerRowIndex = signal<number | null>(null);
  readonly submittedBy = signal(this.authService.getSessionUser()?.name ?? '');
  readonly productionOrderDialogOpen = signal(false);
  readonly productionOrders = signal<ProductionOrderRecord[]>([]);
  readonly productionOrdersLoading = signal(false);
  readonly productionOrdersError = signal<string | null>(null);
  readonly selectedProductionOrder = signal<ProductionOrderRecord | null>(null);

  readonly branchOptions = signal([
    { code: '1', name: 'AHCP_Peshawar' },
    { code: '2', name: 'AHCP_HO' },
    { code: '3', name: 'AHCP_Faisalabad' },
  ]);

  readonly pageTitle = computed(() => 'Add Receipt From Production');

  readonly headerForm = signal<ReceiptFromProductionHeader>(
    createEmptyReceiptFromProductionHeader(),
  );
  readonly contentLines = signal<ReceiptFromProductionLine[]>([
    createEmptyReceiptFromProductionLine(),
  ]);

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

  updateHeaderField(field: keyof ReceiptFromProductionHeader, value: string): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  addContentLine(): void {
    this.contentLines.update((lines) => [...lines, createEmptyReceiptFromProductionLine()]);
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  updateContentLine(index: number, field: keyof ReceiptFromProductionLine, value: string): void {
    this.contentLines.update((rows) => updateReceiptFromProductionLine(rows, index, field, value));
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

  openProductionOrderDialog(): void {
    this.productionOrderDialogOpen.set(true);
    this.productionOrdersLoading.set(true);
    this.productionOrdersError.set(null);

    this.receiptFromProductionService.listProductionOrders().subscribe({
      next: (orders) => {
        this.productionOrders.set(orders);
        this.productionOrdersLoading.set(false);
      },
      error: () => {
        this.productionOrders.set([]);
        this.productionOrdersLoading.set(false);
        this.productionOrdersError.set('Could not load production orders.');
      },
    });
  }

  closeProductionOrderDialog(): void {
    this.productionOrderDialogOpen.set(false);
    this.selectedProductionOrder.set(null);
  }

  chooseProductionOrder(order: ProductionOrderRecord): void {
    this.selectedProductionOrder.set(order);
  }

  copyFromProductionOrder(): void {
    const order = this.selectedProductionOrder();
    if (!order) {
      return;
    }
    this.applyProductionOrder(order);
  }

  applyProductionOrder(order: ProductionOrderRecord): void {
    const docDate = order.postDate || order.startDate;
    const warehouse = (order.warehouse || '').trim();

    this.headerForm.update((state) => ({
      ...state,
      documentDate: docDate || state.documentDate,
      postingDate: docDate || state.postingDate,
      dueDate: order.dueDate || docDate || state.dueDate,
      baseProductionOrderDocEntry: order.docEntry,
      baseProductionOrderDocNum: order.docNum,
    }));

    this.contentLines.set([
      {
        ...createEmptyReceiptFromProductionLine(),
        itemCode: order.itemCode,
        itemDescription: order.itemDescription,
        warehouse,
        quantity: order.receiptQty > 0 ? order.receiptQty : null,
        manufacturingDate: docDate,
        baseEntry: order.docEntry,
        baseLine: '0',
      },
    ]);

    this.closeProductionOrderDialog();
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
        ...createEmptyReceiptFromProductionLine(),
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

    const payload = buildCreateReceiptFromProductionPayload(header, this.contentLines());

    this.saving.set(true);
    this.receiptFromProductionService.create(payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        const ok = response?.success === true || response?.status === true;
        if (!ok) {
          void this.alertService.error(
            'Save Failed',
            formatSapApiFailureMessage(response, 'Receipt from production could not be saved.'),
          );
          return;
        }

        const docEntry = response?.docEntry ?? response?.data?.['docEntry'];
        const message =
          response?.message?.trim() ||
          (docEntry != null
            ? `Receipt from production created (Doc #${docEntry}).`
            : 'Receipt from production was created successfully.');

        void this.alertService.successAndWait('Success', message).then(() => {
          void this.router.navigate(['/miscellaneous/receipt-from-production']);
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        void this.alertService.error(
          'Save Failed',
          formatApiErrorMessage(err, 'Could not save receipt from production. Make sure the backend is running.'),
        );
      },
    });
  }
}
