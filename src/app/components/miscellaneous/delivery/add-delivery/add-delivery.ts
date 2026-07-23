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
import { resolveBranchNameFromBplId } from '../../../../utils/branch-name.util';
import {
  DeliveryHeader,
  DeliveryLine,
  createEmptyDeliveryHeader,
  createEmptyDeliveryLine,
  updateDeliveryLine,
} from '../delivery.model';
import { DeliveryService, buildCreateDeliveryPayload } from '../delivery.service';
import { formatApiErrorMessage, formatSapApiFailureMessage } from '../../../../utils/api-error.util';

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
  readonly activeSection = signal<'header' | 'logistics' | 'items' | 'footer'>('header');
  readonly itemPickerOpen = signal(false);
  readonly itemPickerRowIndex = signal<number | null>(null);
  readonly submittedBy = signal(this.authService.getSessionUser()?.name ?? '');
  readonly salesOrderDialogOpen = signal(false);
  readonly salesOrders = signal<SalesOrderRecord[]>([]);
  readonly salesOrderSearchQuery = signal('');
  readonly salesOrderSearchResults = signal<SalesOrderRecord[]>([]);
  readonly salesOrdersLoading = signal(false);
  readonly salesOrdersError = signal<string | null>(null);
  readonly selectedSalesOrder = signal<SalesOrderRecord | null>(null);

  readonly branchOptions = signal([
    { code: '1', name: 'AHCP_Peshawar' },
    { code: '2', name: 'AHCP_HO' },
    { code: '3', name: 'AHCP_Faisalabad' },
  ]);

  readonly taxCodeOptions = signal([
    'EX',
    'SR',
    'Z0',
    'Z1',
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
      .map((line) => this.computeLineQuantity(line) * (line.unitPrice ?? 0))
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

  private resolveBranchFromWarehouseCode(value: string): { code: string; name: string } | null {
    const raw = value.trim();
    if (!raw) {
      return null;
    }

    const normalized = raw.toLowerCase();
    const branchMap: Record<string, { code: string; name: string }> = {
      '1': { code: '1', name: 'AHCP_Peshawar' },
      '2': { code: '2', name: 'AHCP_HO' },
      '3': { code: '3', name: 'AHCP_Faisalabad' },
      psh: { code: '1', name: 'AHCP_Peshawar' },
      peshawar: { code: '1', name: 'AHCP_Peshawar' },
      ho: { code: '2', name: 'AHCP_HO' },
      'head office': { code: '2', name: 'AHCP_HO' },
      fsd: { code: '3', name: 'AHCP_Faisalabad' },
      faisalabad: { code: '3', name: 'AHCP_Faisalabad' },
    };

    if (branchMap[normalized]) {
      return branchMap[normalized];
    }

    const prefix = normalized.split(/[-_\s]/, 1)[0];
    if (prefix && branchMap[prefix]) {
      return branchMap[prefix];
    }

    if (normalized.includes('psh')) {
      return branchMap['psh'];
    }
    if (normalized.includes('fsd') || normalized.includes('faisalabad')) {
      return branchMap['fsd'];
    }
    if (normalized.includes('ho') || normalized.includes('head office')) {
      return branchMap['ho'];
    }

    return null;
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
    return this.computeLineQuantity(line) * (line.unitPrice ?? 0);
  }

  computeLineQuantity(line: DeliveryLine): number {
    const per = line.qtyPerJumboCarton ?? 0;
    const count = line.jumboCartonsCount ?? 0;
    if (per > 0 && count > 0) {
      return per * count;
    }
    return line.quantity ?? 0;
  }

  trackByIndex(index: number): number {
    return index;
  }

  scrollTo(section: 'header' | 'logistics' | 'items' | 'footer'): void {
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
    this.salesOrderSearchQuery.set('');

    this.salesOrderService.list().subscribe({
      next: (orders) => {
        this.salesOrders.set(orders);
        this.salesOrderSearchResults.set(orders);
        this.salesOrdersLoading.set(false);
      },
      error: () => {
        this.salesOrders.set([]);
        this.salesOrderSearchResults.set([]);
        this.salesOrdersLoading.set(false);
        this.salesOrdersError.set('Could not load sales orders.');
      },
    });
  }

  searchSalesOrders(): void {
    const query = this.salesOrderSearchQuery().trim().toLowerCase();
    if (!query) {
      this.salesOrderSearchResults.set(this.salesOrders());
      return;
    }

    this.salesOrderSearchResults.set(
      this.salesOrders().filter((order) => {
        const haystack = [
          order.docNum,
          order.cardCode,
          order.cardName,
          order.branchId,
          order.customerPoNo,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      }),
    );
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
      branchName: resolveBranchNameFromBplId(order.branchId) || state.branchName,
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
            ...createEmptyDeliveryLine(),
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
            qtyPerJumboCarton: (line as any).qtyPerJumboCarton ?? null,
            jumboCartonsCount: (line as any).jumboCartonsCount ?? null,
            branch: resolveBranchNameFromBplId(order.branchId) || '',
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
          void this.alertService.error(
            'Save Failed',
            formatSapApiFailureMessage(response, 'Delivery could not be saved.'),
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
      error: (err: unknown) => {
        this.saving.set(false);
        void this.alertService.error(
          'Save Failed',
          formatApiErrorMessage(err, 'Could not save delivery. Make sure the backend is running.'),
        );
      },
    });
  }
}
