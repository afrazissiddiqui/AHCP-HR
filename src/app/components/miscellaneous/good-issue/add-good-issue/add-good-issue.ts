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
  GoodIssueHeader,
  GoodIssueLine,
  createEmptyGoodIssueHeader,
  createEmptyGoodIssueLine,
  updateGoodIssueLine,
} from '../good-issue.model';
import { GoodIssueService, buildCreateGoodIssuePayload } from '../good-issue.service';
import { formatApiErrorMessage, formatSapApiFailureMessage } from '../../../../utils/api-error.util';

@Component({
  selector: 'app-add-good-issue',
  standalone: true,
  imports: [CommonModule, FormsModule, OitmItemPickerDialogComponent, WarehouseSearchSelectComponent],
  templateUrl: './add-good-issue.html',
  styleUrls: ['../../miscellaneous-form.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddGoodIssue implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly goodIssueService = inject(GoodIssueService);
  private readonly oitmItemsService = inject(OitmItemsService);
  private readonly warehouseService = inject(WarehouseService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly saving = signal(false);
  readonly activeSection = signal<'header' | 'items' | 'footer'>('header');
  readonly itemPickerOpen = signal(false);
  readonly itemPickerRowIndex = signal<number | null>(null);
  readonly submittedBy = signal(this.authService.getSessionUser()?.name ?? '');
  readonly editingId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  readonly pageTitle = computed(() =>
    this.editingId() ? 'Edit Good Issue' : 'Add Good Issue',
  );

  readonly branchOptions = signal([
    { code: '1', name: 'AHCP_Peshawar' },
    { code: '2', name: 'AHCP_HO' },
    { code: '3', name: 'AHCP_Faisalabad' },
  ]);

  readonly headerForm = signal<GoodIssueHeader>(createEmptyGoodIssueHeader());
  readonly contentLines = signal<GoodIssueLine[]>([createEmptyGoodIssueLine()]);

  readonly totalAmount = computed(() =>
    this.contentLines()
      .map((line) => (line.quantity ?? 0) * (line.unitPrice ?? 0))
      .reduce((sum, amount) => sum + amount, 0),
  );

  ngOnInit(): void {
    this.oitmItemsService.ensureLoaded().subscribe({ error: () => undefined });
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

  updateHeaderField(field: keyof GoodIssueHeader, value: string): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  addContentLine(): void {
    this.contentLines.update((rows) => [...rows, createEmptyGoodIssueLine()]);
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  updateContentLine(index: number, field: keyof GoodIssueLine, value: string): void {
    if (field === 'warehouse') {
      const row = this.contentLines()[index];
      if (!row) {
        return;
      }

      const nextRow = { ...row, warehouse: value };
      const selectedItem = this.oitmItemForRow(row.itemCode);
      const matchingBatch = this.findBatchForWarehouse(selectedItem, value);
      if (!matchingBatch) {
        this.removeRowWithAlert(
          index,
          `No batch number found for item ${row.itemCode} in warehouse ${value}.`,
        );
        return;
      }

      this.contentLines.update((rows) =>
        rows.map((existingRow, rowIndex) =>
          rowIndex !== index
            ? existingRow
            : {
                ...nextRow,
                batchSerialNumber: matchingBatch.batchNumber || nextRow.batchSerialNumber,
                manufacturingDate: matchingBatch.manufacturingDate
                  ? String(matchingBatch.manufacturingDate).split(' ')[0]
                  : nextRow.manufacturingDate,
                expiryDate: matchingBatch.expiryDate
                  ? String(matchingBatch.expiryDate).split(' ')[0]
                  : nextRow.expiryDate,
              },
        ),
      );
      return;
    }

    this.contentLines.update((rows) => updateGoodIssueLine(rows, index, field, value));
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

    const validItems = items.filter((item) => this.firstBatchWithNumber(item));
    const invalidItems = items.filter((item) => !this.firstBatchWithNumber(item));

    if (invalidItems.length > 0) {
      const codes = invalidItems.map((item) => item.itemCode).join(', ');
      this.alertService.validation(
        `Batch number not found for: ${codes}. Those items were not added.`,
      );
    }

    if (validItems.length === 0) {
      this.removeRow(index);
      this.itemPickerRowIndex.set(null);
      return;
    }

    this.contentLines.update((rows) => {
      const updated = [...rows];
      const first = validItems[0];
      const firstBatch = this.firstBatchWithNumber(first);
      updated[index] = {
        ...updated[index],
        itemCode: first.itemCode,
        itemDescription: first.itemName,
        warehouse: firstBatch?.warehouse || updated[index].warehouse,
        batchSerialNumber: firstBatch?.batchNumber || '',
        manufacturingDate: firstBatch?.manufacturingDate
          ? String(firstBatch.manufacturingDate).split(' ')[0]
          : '',
        expiryDate: firstBatch?.expiryDate
          ? String(firstBatch.expiryDate).split(' ')[0]
          : createEmptyGoodIssueLine().expiryDate,
      };

      const extras = validItems.slice(1).map((item) => {
        const batch = this.firstBatchWithNumber(item);
        return {
          ...createEmptyGoodIssueLine(),
          itemCode: item.itemCode,
          itemDescription: item.itemName,
          warehouse: batch?.warehouse || '',
          batchSerialNumber: batch?.batchNumber || '',
          manufacturingDate: batch?.manufacturingDate
            ? String(batch.manufacturingDate).split(' ')[0]
            : '',
          expiryDate: batch?.expiryDate
            ? String(batch.expiryDate).split(' ')[0]
            : createEmptyGoodIssueLine().expiryDate,
        };
      });

      return [...updated, ...extras];
    });

    this.itemPickerRowIndex.set(null);
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

    if (!header.docDueDate.trim()) {
      this.alertService.validation('Doc Due Date is required.');
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

    const payload = buildCreateGoodIssuePayload(header, this.contentLines());

    this.saving.set(true);
    this.goodIssueService.create(payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        const ok = response?.success === true || response?.status === true;
        if (!ok) {
          void this.alertService.error(
            'Save Failed',
            formatSapApiFailureMessage(response, 'Good issue could not be saved.'),
          );
          return;
        }

        const docEntry = response?.docEntry ?? response?.data?.['docEntry'];
        const message =
          response?.message?.trim() ||
          (docEntry != null
            ? `Good issue created (Doc #${docEntry}).`
            : 'Good issue was created successfully.');

        void this.alertService.successAndWait('Success', message).then(() => {
          void this.router.navigate(['/miscellaneous/good-issue']);
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        void this.alertService.error(
          'Save Failed',
          formatApiErrorMessage(err, 'Could not save good issue. Make sure the backend is running.'),
        );
      },
    });
  }

  private oitmItemForRow(itemCode: string): OitmItem | undefined {
    return this.oitmItemsService.getCatalog().find((item) => item.itemCode === itemCode);
  }

  private firstBatchWithNumber(item: OitmItem | undefined) {
    return item?.batches?.find((batch) => batch.batchNumber?.trim());
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
        return [createEmptyGoodIssueLine()];
      }
      return rows.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  private removeRowWithAlert(index: number, message: string): void {
    this.removeRow(index);
    this.alertService.validation(message);
  }
}
