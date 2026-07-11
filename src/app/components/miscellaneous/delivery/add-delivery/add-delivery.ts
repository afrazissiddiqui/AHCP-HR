import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { AuthService } from '../../../../services/auth.service';
import { OitmItemsService } from '../../../../services/oitm-items.service';
import { SalesOrderRecord, SalesOrderService } from '../../../../services/sales-order.service';
import { MiscellaneousLayoutService } from '../../miscellaneous-layout.service';
import { OitmItem } from '../../../../constants/oitm-items';
import { OitmItemPickerDialogComponent } from '../../oitm-item-picker-dialog';
import { WarehouseSearchSelectComponent } from '../../warehouse-search-select';
import {
  DeliveryHeader,
  DeliveryLine,
  createEmptyDeliveryHeader,
  createEmptyDeliveryLine,
  updateDeliveryLine,
} from '../delivery.model';
import { DeliveryService, buildCreateDeliveryPayload } from '../delivery.service';

interface DeliveryTab {
  key: 'contents';
  label: string;
}

@Component({
  selector: 'app-add-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, OitmItemPickerDialogComponent, WarehouseSearchSelectComponent],
  templateUrl: './add-delivery.html',
  styleUrls: ['../../miscellaneous-form.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddDelivery {
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly oitmItemsService = inject(OitmItemsService);
  private readonly salesOrderService = inject(SalesOrderService);
  protected readonly layout = inject(MiscellaneousLayoutService);
  readonly saving = signal(false);
  readonly activeSection = signal<'header' | 'items' | 'footer'>('header');
  readonly itemPickerOpen = signal(false);
  readonly itemPickerRowIndex = signal<number | null>(null);
  readonly submittedBy = signal(this.authService.getSessionUser()?.name ?? '');
  readonly salesOrderDialogOpen = signal(false);
  readonly salesOrders = signal<SalesOrderRecord[]>([]);
  readonly salesOrdersLoading = signal(false);
  readonly salesOrdersError = signal<string | null>(null);
  readonly selectedSalesOrder = signal<SalesOrderRecord | null>(null);

  readonly branchOptions = signal([
    { code: '1', name: 'AHCP_Peshawar' },
    { code: '2', name: 'AHCP_HO' },
    { code: '3', name: 'AHCP_Faisalabad' },
  ]);

  readonly deliveryMethodOptions = signal([
    'Standard Delivery',
    'Express Delivery',
    'Self Pickup',
    'Third Party Courier',
  ]);

  readonly tabs: DeliveryTab[] = [{ key: 'contents', label: 'Contents' }];

  readonly editingId = signal<string | null>(null);
  readonly pageTitle = computed(() =>
    this.editingId() ? 'Edit Delivery' : 'Add Delivery',
  );
  readonly headerForm = signal<DeliveryHeader>(createEmptyDeliveryHeader());
  readonly contentLines = signal<DeliveryLine[]>([createEmptyDeliveryLine()]);

  readonly totals = computed(() => ({
    totalAmount: this.contentLines()
      .map((line) => (line.quantity ?? 0) * (line.unitPrice ?? 0))
      .reduce((sum, amount) => sum + amount, 0),
  }));

  constructor() {
    this.oitmItemsService.ensureLoaded().subscribe({ error: () => undefined });
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

  updateHeaderField(field: keyof DeliveryHeader, value: string): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  addContentLine(): void {
    this.contentLines.update((lines) => [...lines, createEmptyDeliveryLine()]);
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  updateContentLine(index: number, field: keyof DeliveryLine, value: string): void {
    this.contentLines.update((rows) => updateDeliveryLine(rows, index, field, value));
  }

  batchOptionsForLine(line: DeliveryLine): string[] {
    if (!line.itemCode.trim()) {
      return [];
    }

    const item = this.oitmItemsService.getCatalog().find((entry) => entry.itemCode === line.itemCode);
    if (!item?.batches?.length) {
      return [];
    }

    const selectedWarehouse = line.warehouse.trim().toLowerCase();
    const filtered = selectedWarehouse
      ? item.batches.filter((batch) => batch.warehouse.trim().toLowerCase() === selectedWarehouse)
      : item.batches;

    return [...new Set(filtered.map((batch) => batch.batchNumber.trim()).filter(Boolean))];
  }

  formatAmount(value: number): string {
    return value === 0
      ? '0.00'
      : value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  }

  totalAmount(): number {
    return this.totals().totalAmount;
  }

  calculateLineTotal(line: DeliveryLine): number {
    return (line.quantity ?? 0) * (line.unitPrice ?? 0);
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
        unitOfMeasure: first.uom,
      };

      const extras = items.slice(1).map((item) => ({
        ...createEmptyDeliveryLine(),
        itemCode: item.itemCode,
        itemDescription: item.itemName,
        unitOfMeasure: item.uom,
      }));

      return [...updated, ...extras];
    });

    this.itemPickerRowIndex.set(null);
  }

  openSalesOrderDialog(): void {
    this.salesOrderDialogOpen.set(true);
    this.salesOrdersLoading.set(true);
    this.salesOrdersError.set(null);

    this.salesOrderService.list().subscribe({
      next: (orders) => {
        this.salesOrders.set(orders);
        this.salesOrdersLoading.set(false);
      },
      error: () => {
        this.salesOrders.set([]);
        this.salesOrdersLoading.set(false);
        this.salesOrdersError.set('Could not load sales orders.');
      },
    });
  }

  closeSalesOrderDialog(): void {
    this.salesOrderDialogOpen.set(false);
    this.selectedSalesOrder.set(null);
  }

  chooseSalesOrder(order: SalesOrderRecord): void {
    this.selectedSalesOrder.set(order);
  }

  copyFromSalesOrder(): void {
    const order = this.selectedSalesOrder();
    if (!order) {
      return;
    }
    this.applySalesOrder(order);
  }

  applySalesOrder(order: SalesOrderRecord): void {
    this.headerForm.update((state) => ({
      ...state,
      branchId: order.branchId || state.branchId,
      customer: order.cardCode,
      customerName: order.cardName,
      customerRefNo: order.customerPoNo || state.customerRefNo,
      baseSalesOrderNumber: order.docNum,
      baseSalesOrderDocEntry: order.docEntry,
      shipToAddress: order.address,
      driver: order.driverName || state.driver,
      vehicleNumber: order.vehicleNo || state.vehicleNumber,
      postingDate: order.docDate || state.postingDate,
      documentDate: order.docDueDate || order.docDate || state.documentDate,
    }));

    this.contentLines.set(
      order.items.length > 0
        ? order.items.map((line) => ({
            itemCode: line.itemCode,
            itemDescription: line.itemDescription,
            baseDocEntry: line.docEntry || order.docEntry,
            baseLine: line.lineNum,
            quantity: line.quantity,
            warehouse: line.warehouse,
            unitOfMeasure: '',
            unitPrice: line.unitPrice,
            batchSerialNumber: '',
            taxCode: '',
          }))
        : [createEmptyDeliveryLine()],
    );

    this.closeSalesOrderDialog();
  }

  cancel(): void {
    void this.router.navigate(['/miscellaneous']);
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    const header = this.headerForm();
    if (!header.customer.trim()) {
      this.alertService.validation('Customer code is required. Select a Sales Order first.');
      return;
    }

    if (!header.baseSalesOrderDocEntry.trim()) {
      this.alertService.validation('Base Sales Order is required. Use Copy From SO.');
      return;
    }

    if (!header.documentDate.trim()) {
      this.alertService.validation('Doc Date is required.');
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

    const missingWarehouse = lines.some((line) => !line.warehouse.trim());
    if (missingWarehouse) {
      this.alertService.validation('Warehouse is required for every line item.');
      return;
    }

    const missingQty = lines.some((line) => line.quantity == null || line.quantity <= 0);
    if (missingQty) {
      this.alertService.validation('Quantity is required for every line item.');
      return;
    }

    const payload = buildCreateDeliveryPayload(header, lines);

    this.saving.set(true);
    this.deliveryService.create(payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        const ok = response?.success === true || response?.status === true;
        if (!ok) {
          this.alertService.validation(
            response?.error?.trim() ||
              response?.message?.trim() ||
              'Delivery could not be saved.',
          );
          return;
        }

        const message =
          response?.message?.trim() ||
          (response?.docEntry != null
            ? `Delivery created (Doc #${response.docEntry}).`
            : response?.data?.['docEntry'] != null
              ? `Delivery created (Doc #${response.data['docEntry']}).`
              : 'Delivery was created successfully.');

        void this.alertService.successAndWait('Success', message).then(() => {
          void this.router.navigate(['/miscellaneous/delivery']);
        });
      },
      error: (err: { error?: { message?: string; error?: string }; message?: string }) => {
        this.saving.set(false);
        const message =
          err?.error?.error ??
          err?.error?.message ??
          err?.message ??
          'Could not save delivery. Make sure the backend is running.';
        this.alertService.validation(message);
      },
    });
  }
}
