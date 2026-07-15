import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { AuthService } from '../../../../services/auth.service';
import { OitmItemsService } from '../../../../services/oitm-items.service';
import { WarehouseService } from '../../../../services/warehouse.service';
import { MiscellaneousLayoutService } from '../../miscellaneous-layout.service';
import { OitmItem } from '../../../../constants/oitm-items';
import { OitmItemPickerDialogComponent } from '../../oitm-item-picker-dialog';
import { WarehouseSearchSelectComponent } from '../../warehouse-search-select';
import {
  InventoryTransferHeader,
  InventoryTransferLine,
  createEmptyInventoryTransferHeader,
  createEmptyInventoryTransferLine,
} from '../../inventory-transfer/inventory-transfer.model';
import {
  buildCreateInventoryTransferPayload,
  InventoryTransferService,
} from '../../inventory-transfer/inventory-transfer.service';
import { formatApiErrorMessage, formatSapApiFailureMessage } from '../../../../utils/api-error.util';

@Component({
  selector: 'app-add-inventory-transfer-request',
  standalone: true,
  imports: [CommonModule, FormsModule, OitmItemPickerDialogComponent, WarehouseSearchSelectComponent],
  templateUrl: './add-inventory-transfer-request.html',
  styleUrls: ['../../miscellaneous-form.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddInventoryTransferRequest implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly inventoryTransferService = inject(InventoryTransferService);
  private readonly oitmItemsService = inject(OitmItemsService);
  private readonly warehouseService = inject(WarehouseService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly saving = signal(false);
  readonly activeSection = signal<'header' | 'items' | 'footer'>('header');
  readonly itemPickerOpen = signal(false);
  readonly itemPickerRowIndex = signal<number | null>(null);
  readonly submittedBy = signal(this.authService.getSessionUser()?.name ?? '');

  readonly editingId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  readonly pageTitle = computed(() => (this.editingId() ? 'Edit Inventory Transfer Request' : 'Add Inventory Transfer Request'));

  readonly headerForm = signal<InventoryTransferHeader>(createEmptyInventoryTransferHeader());
  readonly contentLines = signal<InventoryTransferLine[]>([createEmptyInventoryTransferLine()]);

  ngOnInit(): void {
    this.oitmItemsService.ensureLoaded().subscribe({ error: () => undefined });
    this.warehouseService.ensureLoaded().subscribe({ error: () => undefined });
  }

  updateHeaderField(field: keyof InventoryTransferHeader, value: string): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  addContentLine(): void {
    const header = this.headerForm();
    this.contentLines.update((rows) => [
      ...rows,
      createEmptyInventoryTransferLine(header.fromWarehouse, header.toWarehouse),
    ]);
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((rows) => rows.filter((_, i) => i !== index));
  }

  updateContentLine(index: number, field: keyof InventoryTransferLine, value: string): void {
    if (field === 'quantity') {
      this.contentLines.update((rows) =>
        rows.map((row, rowIndex) => {
          if (rowIndex !== index) {
            return row;
          }
          const numericValue = value === '' ? null : Number(value);
          return { ...row, quantity: Number.isNaN(numericValue) ? null : numericValue };
        }),
      );
      return;
    }

    if (field === 'fromWarehouse' || field === 'itemCode') {
      this.contentLines.update((rows) =>
        rows.map((row, rowIndex) => {
          if (rowIndex !== index) {
            return row;
          }
          const nextRow = { ...row, [field]: value };
          const options = this.batchOptionsForLine(nextRow);
          const nextBatch = options.includes(nextRow.batchNumber) ? nextRow.batchNumber : '';
          return { ...nextRow, batchNumber: nextBatch };
        }),
      );
      return;
    }

    this.contentLines.update((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  batchOptionsForLine(line: InventoryTransferLine): string[] {
    if (!line.itemCode.trim()) {
      return [];
    }

    const item = this.oitmItemsService.getCatalog().find((entry) => entry.itemCode === line.itemCode);
    if (!item?.batches?.length) {
      return [];
    }

    const selectedWarehouse = this.resolveWarehouseAliases(line.fromWarehouse);
    const filtered = selectedWarehouse.length
      ? item.batches.filter((batch) => {
          const batchWarehouse = this.resolveWarehouseAliases(batch.warehouse);
          return batchWarehouse.some((value) => selectedWarehouse.includes(value));
        })
      : item.batches;

    return [...new Set(filtered.map((batch) => batch.batchNumber.trim()).filter(Boolean))];
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

    const fromWarehouse = this.headerForm().fromWarehouse.trim();
    const validItems = items.filter((item) => this.findBatchForWarehouse(item, fromWarehouse));
    const invalidItems = items.filter((item) => !this.findBatchForWarehouse(item, fromWarehouse));

    if (invalidItems.length > 0) {
      const codes = invalidItems.map((item) => item.itemCode).join(', ');
      this.alertService.validation(
        fromWarehouse
          ? `No batch found for: ${codes} in warehouse ${fromWarehouse}. Those items were not added.`
          : `Select From Warehouse first. Items not added: ${codes}.`,
      );
    }

    if (validItems.length === 0) {
      if (items.length > 0 && !fromWarehouse) {
        this.itemPickerRowIndex.set(null);
        return;
      }
      this.removeRow(index);
      this.itemPickerRowIndex.set(null);
      return;
    }

    this.contentLines.update((rows) => {
      const updated = [...rows];
      const first = validItems[0];
      const firstBatch = this.findBatchForWarehouse(first, fromWarehouse);
      updated[index] = {
        ...updated[index],
        itemCode: first.itemCode,
        itemDescription: first.itemName,
        fromWarehouse: updated[index]?.fromWarehouse || fromWarehouse,
        toWarehouse: updated[index]?.toWarehouse || this.headerForm().toWarehouse,
        batchNumber: firstBatch?.batchNumber || '',
        baseEntry: updated[index]?.baseEntry || '',
        baseLine: updated[index]?.baseLine || '',
      };

      const extras = validItems.slice(1).map((item) => {
        const batch = this.findBatchForWarehouse(item, fromWarehouse);
        return {
          ...createEmptyInventoryTransferLine(fromWarehouse, this.headerForm().toWarehouse),
          itemCode: item.itemCode,
          itemDescription: item.itemName,
          batchNumber: batch?.batchNumber || '',
        };
      });

      return [...updated, ...extras];
    });

    this.itemPickerRowIndex.set(null);
  }

  private findBatchForWarehouse(item: OitmItem | undefined, warehouseValue: string) {
    if (!item || !warehouseValue.trim()) {
      return undefined;
    }

    const selectedWarehouse = this.resolveWarehouseAliases(warehouseValue);
    return item.batches?.find((batch) => {
      const batchWarehouse = this.resolveWarehouseAliases(batch.warehouse);
      return batchWarehouse.some((value) => selectedWarehouse.includes(value));
    });
  }

  private resolveWarehouseAliases(value: string): string[] {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const aliases = new Set([normalized]);
    const warehouse = this.warehouseService.getCatalog().find((entry) => {
      const code = entry.warehouseCode.trim().toLowerCase();
      const name = entry.warehouseName.trim().toLowerCase();
      return code === normalized || name === normalized;
    });

    if (warehouse) {
      aliases.add(warehouse.warehouseCode.trim().toLowerCase());
      aliases.add(warehouse.warehouseName.trim().toLowerCase());
    }

    return [...aliases];
  }

  private removeRow(index: number): void {
    this.contentLines.update((rows) => {
      if (rows.length <= 1) {
        return [createEmptyInventoryTransferLine(this.headerForm().fromWarehouse, this.headerForm().toWarehouse)];
      }

      return rows.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    const header = this.headerForm();
    if (!header.docDate.trim()) {
      this.alertService.validation('Doc Date is required.');
      return;
    }

    if (!header.taxDate.trim()) {
      this.alertService.validation('Tax Date is required.');
      return;
    }

    if (!header.fromWarehouse.trim()) {
      this.alertService.validation('From Warehouse is required.');
      return;
    }

    if (!header.toWarehouse.trim()) {
      this.alertService.validation('To Warehouse is required.');
      return;
    }

    const lines = this.contentLines().filter((line) => line.itemCode.trim());
    if (lines.length === 0) {
      this.alertService.validation('At least one line item is required.');
      return;
    }

    const missingQuantity = lines.some((line) => line.quantity == null || line.quantity <= 0);
    if (missingQuantity) {
      this.alertService.validation('Quantity is required for every line item.');
      return;
    }

    const missingWarehouse = lines.some((line) => !line.fromWarehouse.trim() || !line.toWarehouse.trim());
    if (missingWarehouse) {
      this.alertService.validation('From Warehouse and To Warehouse are required for every line item.');
      return;
    }

    const missingBatch = lines.some((line) => !line.batchNumber.trim());
    if (missingBatch) {
      this.alertService.validation('Batch Number is required for every line item.');
      return;
    }

    const payload = buildCreateInventoryTransferPayload(header, lines);

    this.saving.set(true);
    this.inventoryTransferService.create(payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        const ok = response?.success === true || response?.status === true;
        if (!ok) {
          void this.alertService.error('Save Failed', formatSapApiFailureMessage(response, 'Inventory transfer request could not be saved.'));
          return;
        }

        const message = response?.message?.trim() || (response?.docEntry != null ? `Inventory transfer request created (Doc #${response.docEntry}).` : 'Inventory transfer request was created successfully.');

        void this.alertService.successAndWait('Success', message).then(() => {
          void this.router.navigate(['/miscellaneous/inventory-transfer-request']);
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        void this.alertService.error('Save Failed', formatApiErrorMessage(err, 'Could not save inventory transfer request. Make sure the backend is running.'));
      },
    });
  }
}
