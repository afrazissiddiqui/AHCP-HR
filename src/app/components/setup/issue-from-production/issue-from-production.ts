import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { formatApiErrorMessage, formatSapApiFailureMessage } from '../../../utils/api-error.util';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { ReceiptFromProductionService } from '../../miscellaneous/receipt-from-production/receipt-from-production.service';
import { WarehouseOption, WarehouseService } from '../../../services/warehouse.service';

interface ProductionOrderBatch {
  batchNo: string;
  quantity: number;
  issueQuantity?: number | null;
}

interface ProductionOrderItem {
  lineNum: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  issuedQuantity?: number;
  warehouse: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  baseLine: string;
  batches: ProductionOrderBatch[];
}

interface ProductionOrderRecord {
  docEntry: string;
  docNum: string;
  postDate: string;
  dueDate: string;
  warehouse: string;
  branch: string;
  batchNumber: string;
  status: string;
  items: ProductionOrderItem[];
}

interface IssueForProductionHeader {
  baseProductionOrderDocEntry: string;
  baseProductionOrderDocNum: string;
  branchId: string;
  branchName: string;
  remarks: string;
  documentDate: string;
  postingDate: string;
  dueDate: string;
}

interface IssueForProductionLine {
  itemCode: string;
  itemDescription: string;
  warehouse: string;
  quantity: number | null;
  requiredQuantity: number;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  baseEntry: string;
  baseLine: string;
  availableBatches: ProductionOrderBatch[];
}

@Component({
  selector: 'app-issue-from-production',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './issue-from-production.html',
  styleUrls: ['../../miscellaneous/miscellaneous-form.css', './issue-from-production.css'],
})
export class IssueFromProductionComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly receiptFromProductionService = inject(ReceiptFromProductionService);
  private readonly alertService = inject(AlertService);
  private readonly warehouseService = inject(WarehouseService);

  readonly productionOrders = signal<ProductionOrderRecord[]>([]);
  readonly productionOrdersLoading = signal(false);
  readonly productionOrdersError = signal<string | null>(null);
  readonly productionOrderDialogOpen = signal(false);
  readonly productionOrderItemsDialogOpen = signal(false);
  readonly batchSelectionDialogOpen = signal(false);
  readonly productionOrderItemsLoading = signal(false);
  readonly selectedProductionOrder = signal<ProductionOrderRecord | null>(null);
  readonly selectedProductionOrderItemKeys = signal<Set<string>>(new Set());
  readonly activeBatchSelectionLineIndex = signal<number | null>(null);
  readonly productionOrderSearchText = signal('');

  readonly branchOptions = signal([
    { code: '1', name: 'AHCP_Peshawar' },
    { code: '2', name: 'AHCP_HO' },
    { code: '3', name: 'AHCP_Faisalabad' },
  ]);
  readonly warehouseOptions = signal<WarehouseOption[]>([]);

  readonly headerForm = signal<IssueForProductionHeader>(this.createEmptyHeader());
  readonly contentLines = signal<IssueForProductionLine[]>([this.createEmptyLine()]);
  readonly saving = signal(false);

  readonly filteredProductionOrders = computed(() => {
    const query = this.productionOrderSearchText().trim().toLowerCase();
    if (!query) {
      return this.productionOrders();
    }

    return this.productionOrders().filter((order) => {
      const searchable = [
        order.docNum,
        order.postDate,
        order.dueDate,
        order.warehouse,
        order.status,
        ...order.items.map((item) => `${item.itemCode} ${item.itemDescription}`),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  });

  readonly productionOrderItems = computed(() => this.selectedProductionOrder()?.items ?? []);

  readonly selectedProductionOrderItems = computed(() => {
    const keys = this.selectedProductionOrderItemKeys();
    return this.productionOrderItems().filter((item) => keys.has(this.orderItemKey(item)));
  });

  readonly isAllProductionOrderItemsSelected = computed(() => {
    const items = this.productionOrderItems();
    if (items.length === 0) {
      return false;
    }

    const keys = this.selectedProductionOrderItemKeys();
    return items.every((item) => keys.has(this.orderItemKey(item)));
  });

  ngOnInit(): void {
    this.loadProductionOrders();
    this.warehouseService.ensureLoaded().subscribe({
      next: (warehouses) => this.warehouseOptions.set(warehouses),
      error: () => this.warehouseOptions.set([]),
    });
  }

  toggleSidebar(): void {
    document.body.classList.toggle('sidebar-collapsed');
  }

  openProductionOrderDialog(): void {
    this.productionOrderDialogOpen.set(true);
    this.productionOrderSearchText.set('');
    this.productionOrdersLoading.set(true);
    this.productionOrdersError.set(null);

    this.receiptFromProductionService
      .listProductionOrders()
      .pipe(finalize(() => this.productionOrdersLoading.set(false)))
      .subscribe({
        next: (orders) => {
          this.productionOrders.set(orders as unknown as ProductionOrderRecord[]);
        },
        error: (error: unknown) => {
          this.productionOrders.set([]);
          this.productionOrdersError.set('Could not load production orders.');
          void this.alertService.error('Load Failed', formatApiErrorMessage(error, 'Could not load production orders.'));
        },
      });
  }

  closeProductionOrderDialog(): void {
    this.productionOrderDialogOpen.set(false);
  }

  chooseProductionOrder(order: ProductionOrderRecord): void {
    this.productionOrderDialogOpen.set(false);
    this.selectedProductionOrder.set(order);
    this.selectedProductionOrderItemKeys.set(new Set());

    const branchId = this.normalizeBranchId(order.branch);
    this.headerForm.update((state) => ({
      ...state,
      branchId,
      branchName: this.getBranchDisplayName(branchId),
    }));

    if (order.items?.length) {
      this.productionOrderItemsDialogOpen.set(true);
      return;
    }

    this.productionOrderItemsLoading.set(true);
    this.receiptFromProductionService
      .getProductionOrderDetails(order.docEntry)
      .pipe(finalize(() => this.productionOrderItemsLoading.set(false)))
      .subscribe({
        next: (items) => {
          this.selectedProductionOrder.set({ ...order, items: items as unknown as ProductionOrderItem[] });
          this.productionOrderItemsDialogOpen.set(true);
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Could not load production order items.'),
          );
        },
      });
  }

  closeProductionOrderItemsDialog(): void {
    this.productionOrderItemsDialogOpen.set(false);
    this.selectedProductionOrderItemKeys.set(new Set());
  }

  closeBatchSelectionDialog(): void {
    this.batchSelectionDialogOpen.set(false);
    this.selectedProductionOrderItemKeys.set(new Set());
  }

  toggleProductionOrderItem(item: ProductionOrderItem): void {
    const key = this.orderItemKey(item);
    this.selectedProductionOrderItemKeys.update((set) => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  toggleSelectAllProductionOrderItems(): void {
    const items = this.productionOrderItems();
    if (items.length === 0) {
      return;
    }

    if (this.isAllProductionOrderItemsSelected()) {
      this.selectedProductionOrderItemKeys.set(new Set());
      return;
    }

    this.selectedProductionOrderItemKeys.set(new Set(items.map((item) => this.orderItemKey(item))));
  }

  isProductionOrderItemSelected(item: ProductionOrderItem): boolean {
    return this.selectedProductionOrderItemKeys().has(this.orderItemKey(item));
  }

  applySelectedProductionOrderItems(): void {
    const order = this.selectedProductionOrder();
    const selectedItems = this.selectedProductionOrderItems();
    if (!order || selectedItems.length === 0) {
      void this.alertService.warning('No items selected', 'Select at least one production order item before adding.');
      return;
    }

    const branchId = this.normalizeBranchId(order.branch);
    const branchName = this.getBranchDisplayName(branchId);
    const branchWarehouse = this.resolveDefaultWarehouseForBranch(branchId);

    this.headerForm.update((state) => ({
      ...state,
      baseProductionOrderDocEntry: order.docEntry,
      baseProductionOrderDocNum: order.docNum,
      documentDate: order.postDate || state.documentDate,
      postingDate: order.postDate || state.postingDate,
      dueDate: order.dueDate || state.dueDate,
      branchId,
      branchName,
    }));

    this.contentLines.set(
      selectedItems.map((item, index) => {
        const lineNum = this.resolveOrderItemLineNumber(item, index);
        return {
          ...this.createEmptyLine(),
          itemCode: item.itemCode,
          itemDescription: item.itemDescription,
          warehouse: branchWarehouse || item.warehouse || order.warehouse,
          quantity: item.quantity ?? null,
          requiredQuantity: item.quantity ?? 0,
          batchNumber: item.batches?.[0]?.batchNo || item.batchNumber || order.batchNumber || '',
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          baseEntry: order.docEntry,
          baseLine: lineNum,
          availableBatches: item.batches ?? [],
        };
      }),
    );

    this.activeBatchSelectionLineIndex.set(0);
    this.productionOrderItemsDialogOpen.set(false);
    this.selectedProductionOrderItemKeys.set(new Set());
  }

  openBatchSelectionDialog(): void {
    const lines = this.contentLines().filter((line) => line.itemCode.trim());
    if (lines.length === 0) {
      void this.alertService.warning('No items added', 'Add at least one selected item before opening batch selection.');
      return;
    }

    this.activeBatchSelectionLineIndex.set(0);
    this.batchSelectionDialogOpen.set(true);
  }

  selectBatchSelectionLine(index: number): void {
    this.activeBatchSelectionLineIndex.set(index);
  }

  selectBatchForActiveLine(batch: ProductionOrderBatch): void {
    const index = this.activeBatchSelectionLineIndex();
    if (index === null) {
      return;
    }

    this.contentLines.update((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        const updatedBatches = row.availableBatches.map((availableBatch) => {
          if (availableBatch.batchNo !== batch.batchNo) {
            return availableBatch;
          }
          // Don't auto-initialize; keep existing value or null
          return { ...availableBatch };
        });

        return {
          ...row,
          batchNumber: batch.batchNo,
          availableBatches: updatedBatches,
        };
      }),
    );
  }

  updateBatchIssueQuantity(batch: ProductionOrderBatch, value: string): void {
    const index = this.activeBatchSelectionLineIndex();
    if (index === null) {
      return;
    }

    const row = this.contentLines()[index];
    if (!row) {
      return;
    }

    const quantity = value === '' ? null : Number(value);
    const normalizedQuantity = Number.isNaN(quantity) ? null : quantity;

    if (normalizedQuantity == null) {
      this.contentLines.update((rows) =>
        rows.map((r, rowIndex) => {
          if (rowIndex !== index) {
            return r;
          }

          const updatedBatches = r.availableBatches.map((availableBatch) => {
            if (availableBatch.batchNo !== batch.batchNo) {
              return availableBatch;
            }
            return { ...availableBatch, issueQuantity: null };
          });

          return {
            ...r,
            availableBatches: updatedBatches,
          };
        }),
      );
      return;
    }

    // Use the constraint-based max: min(batch available, remaining required qty)
    const maxAllowed = this.getMaxAvailableForBatch(batch, row);
    const clampedQuantity = Math.min(normalizedQuantity, maxAllowed);

    this.contentLines.update((rows) =>
      rows.map((r, rowIndex) => {
        if (rowIndex !== index) {
          return r;
        }

        const updatedBatches = r.availableBatches.map((availableBatch) => {
          if (availableBatch.batchNo !== batch.batchNo) {
            return availableBatch;
          }
          return { ...availableBatch, issueQuantity: clampedQuantity };
        });

        return {
          ...r,
          availableBatches: updatedBatches,
        };
      }),
    );
  }

  getActiveBatchSelectionLine(): IssueForProductionLine | null {
    const index = this.activeBatchSelectionLineIndex();
    if (index === null) {
      return null;
    }

    return this.contentLines()[index] ?? null;
  }

  getMaxAvailableForBatch(batch: ProductionOrderBatch, line: IssueForProductionLine): number {
    // Max is: min(batch.available, remaining required)
    // Issued qty ≤ min(Available qty, Remaining required qty)
    // Remaining required is based only on the issue quantity entered in the form
    const batchAvailable = batch.quantity;
    const requiredQty = line.requiredQuantity;
    const totalIssueInForm = line.availableBatches
      .filter((b) => b.batchNo !== batch.batchNo)
      .reduce((sum, b) => sum + (b.issueQuantity ?? 0), 0);

    const remainingRequired = requiredQty - totalIssueInForm;
    const maxAllowed = Math.min(batchAvailable, Math.max(remainingRequired, 0));

    return Math.max(maxAllowed, 0);
  }

  isBatchSelectionComplete(line: IssueForProductionLine): boolean {
    return line.availableBatches.some((batch) => (batch.issueQuantity ?? 0) > 0);
  }

  getRemainingRequiredQuantity(line: IssueForProductionLine): number {
    const totalIssuedInForm = line.availableBatches.reduce((sum, b) => sum + (b.issueQuantity ?? 0), 0);
    const remaining = line.requiredQuantity - totalIssuedInForm;
    return Math.max(0, remaining);
  }

  getAlreadyIssuedQuantity(line: IssueForProductionLine): number {
    return Math.max(0, line.requiredQuantity - this.getRemainingRequiredQuantity(line));
  }

  getTotalIssuedInForm(line: IssueForProductionLine): number {
    return line.availableBatches.reduce((sum, b) => sum + (b.issueQuantity ?? 0), 0);
  }

  areAllBatchSelectionsComplete(): boolean {
    const lines = this.contentLines().filter((line) => line.itemCode.trim());
    return lines.length > 0 && lines.every((line) => this.isBatchSelectionComplete(line));
  }

  validateBatchIssueQuantity(batch: ProductionOrderBatch, line: IssueForProductionLine): void {
    const maxAvailable = this.getMaxAvailableForBatch(batch, line);
    const currentValue = batch.issueQuantity ?? 0;
    if (currentValue > maxAvailable) {
      const index = this.activeBatchSelectionLineIndex();
      if (index !== null) {
        this.contentLines.update((rows) =>
          rows.map((r, rowIndex) => {
            if (rowIndex !== index) {
              return r;
            }
            const updatedBatches = r.availableBatches.map((availableBatch) => {
              if (availableBatch.batchNo !== batch.batchNo) {
                return availableBatch;
              }
              return { ...availableBatch, issueQuantity: maxAvailable };
            });
            return {
              ...r,
              availableBatches: updatedBatches,
            };
          }),
        );
      }
    }
  }

  onBatchIssueQuantityInput(batch: ProductionOrderBatch, line: IssueForProductionLine, event: Event): void {
    const input = event.target as HTMLInputElement;
    const maxAvailable = this.getMaxAvailableForBatch(batch, line);
    const currentValue = Number(input.value);

    if (Number.isNaN(currentValue) || currentValue < 0) {
      input.value = (batch.issueQuantity ?? 0).toString();
      return;
    }

    if (currentValue > maxAvailable) {
      input.value = maxAvailable.toString();
      this.updateBatchIssueQuantity(batch, maxAvailable.toString());
      return;
    }
  }

  confirmSelectedProductionOrderItems(): void {
    this.batchSelectionDialogOpen.set(false);
    this.activeBatchSelectionLineIndex.set(null);
    this.selectedProductionOrderItemKeys.set(new Set());
    this.submitIssueForProduction(false);
  }

  addContentLine(): void {
    this.contentLines.update((lines) => [...lines, this.createEmptyLine()]);
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  updateHeaderField(field: keyof IssueForProductionHeader, value: string): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  updateContentLine(index: number, field: keyof IssueForProductionLine, value: string): void {
    this.contentLines.update((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }
        if (field === 'quantity') {
          const quantity = value === '' ? null : Number(value);
          return { ...row, quantity: Number.isNaN(quantity) ? null : quantity };
        }
        return { ...row, [field]: value };
      }),
    );
  }

  submitIssueForProduction(shouldOpenBatchModal = true): void {
    if (this.saving()) {
      return;
    }

    const header = this.headerForm();
    const lines = this.contentLines().filter((line) => line.itemCode.trim());

    if (!header.baseProductionOrderDocEntry.trim()) {
      this.alertService.validation('Select a production order before submitting.');
      return;
    }

    if (!header.documentDate.trim()) {
      this.alertService.validation('Document Date is required.');
      return;
    }

    if (!header.postingDate.trim()) {
      this.alertService.validation('Posting Date is required.');
      return;
    }

    if (!header.dueDate.trim()) {
      this.alertService.validation('Due Date is required.');
      return;
    }

    if (lines.length === 0) {
      this.alertService.validation('At least one row item is required.');
      return;
    }

    if (lines.some((line) => !line.warehouse.trim())) {
      this.alertService.validation('Warehouse is required for every row.');
      return;
    }

    if (lines.some((line) => line.quantity == null || line.quantity <= 0)) {
      this.alertService.validation('Quantity is required for every row.');
      return;
    }

    if (shouldOpenBatchModal && !this.batchSelectionDialogOpen()) {
      this.openBatchSelectionDialog();
      return;
    }

    const payload = {
      DocDate: header.documentDate.trim(),
      Remarks: header.remarks.trim(),
      docentry: Number(header.baseProductionOrderDocEntry.trim()) || 0,
      branch: header.branchId.trim(),
      items: lines.map((line, index) => {
        // Ensure baseLine has a valid non-zero value from the production order
        // baseLine contains the actual LineNum from the API response
        const baseLineNum = Number(line.baseLine ?? '0');
        const lineNum = baseLineNum > 0 ? baseLineNum : index + 1;
        const issueQtyTotal = this.getTotalIssuedInForm(line);
        return {
          line_num: lineNum,
          item_code: line.itemCode.trim(),
          quantity: issueQtyTotal,
          warehouse: line.warehouse.trim(),
          batch_no: line.batchNumber.trim(),
        };
      }),
    };

    this.saving.set(true);
    this.receiptFromProductionService
      .createIssueForProduction(payload as Record<string, unknown>)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          const ok = response?.success === true || response?.status === true;
          if (!ok) {
            void this.alertService.error(
              'Submit Failed',
              formatSapApiFailureMessage(response, 'Issue for production could not be submitted.'),
            );
            return;
          }

          const message = response?.message?.trim() || 'Issue for production submitted successfully.';
          void this.alertService.success('Success', message);
          void this.router.navigate(['/miscellaneous/good-issue']);
        },
        error: (error: unknown) => {
          void this.alertService.error('Submit Failed', formatApiErrorMessage(error, 'Could not submit issue for production.'));
        },
      });
  }

  private loadProductionOrders(): void {
    this.productionOrdersLoading.set(true);
    this.productionOrdersError.set(null);

    this.receiptFromProductionService
      .listProductionOrders()
      .pipe(finalize(() => this.productionOrdersLoading.set(false)))
      .subscribe({
        next: (orders) => {
          this.productionOrders.set(orders as unknown as ProductionOrderRecord[]);
        },
        error: (error: unknown) => {
          this.productionOrders.set([]);
          this.productionOrdersError.set('Could not load production orders.');
          void this.alertService.error('Load Failed', formatApiErrorMessage(error, 'Could not load production orders.'));
        },
      });
  }

  private parseProductionOrders(response: unknown): ProductionOrderRecord[] {
    const items = this.extractDataArray(response, ['production_orders', 'production_order', 'data']);
    return items
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => {
        const lines = this.extractLines(item);
        const parsedItems = lines.length > 0 ? lines.map((line) => this.mapProductionOrderItem(line)) : [this.mapProductionOrderItem(item)];
        const orderWarehouse = this.pickString(item, ['Warehouse', 'warehouse', 'WhsCode']);
        const orderBatchNumber = this.pickProductionOrderItemBatchNumber(item);
        const items = parsedItems.map((line) => ({
          ...line,
          warehouse: line.warehouse || orderWarehouse || parsedItems[0]?.warehouse || '',
          batchNumber: line.batchNumber || orderBatchNumber || parsedItems[0]?.batchNumber || '',
        }));

        return {
          docEntry: this.pickString(item, ['DocEntry', 'docEntry', 'id', 'Id']),
          docNum: this.pickString(item, ['DocNum', 'docNum', 'number', 'Number']),
          postDate: this.pickDate(item, ['PostDate', 'docDate', 'DocDate']),
          dueDate: this.pickDate(item, ['DueDate', 'docDueDate', 'DocDueDate']),
          warehouse: orderWarehouse || items[0]?.warehouse || '',
          branch: this.pickString(item, ['BPLId', 'BPLName', 'branch', 'Branch', 'branchId', 'branchName']),
          batchNumber: orderBatchNumber || items[0]?.batchNumber || '',
          status: this.pickString(item, ['Status', 'status', 'docStatus', 'DocStatus']),
          items,
        };
      });
  }

  private mapProductionOrderItem(item: Record<string, unknown>): ProductionOrderItem {
    const firstBatch = this.pickFirstBatch(item);
    // Extract line number from multiple possible field names
    const lineNumStr = this.pickString(item, [
      'LineNum',
      'lineNum',
      'line_num',
      'DocLine',
      'docLine',
      'doc_line',
      'lineNumber',
    ]);
    const issuedQuantity = this.pickNumber(item, ['IssuedQty', 'issuedQty']);
    return {
      lineNum: lineNumStr,
      itemCode: this.pickString(item, ['ItemCode', 'itemCode', 'Item']),
      itemDescription: this.pickString(item, ['Dscription', 'itemDescription', 'ItemName', 'ProdName']),
      quantity: this.pickProductionOrderItemQuantity(item),
      issuedQuantity: issuedQuantity > 0 ? issuedQuantity : undefined,
      warehouse:
        this.pickString(item, ['WhsCode', 'warehouse', 'Warehouse', 'wareHouse']) ||
        (firstBatch ? this.pickString(firstBatch, ['WhsCode', 'warehouse', 'Warehouse', 'wareHouse']) : ''),
      batchNumber: this.pickProductionOrderItemBatchNumber(item),
      manufacturingDate: this.pickDate(item, ['ManufactureDate', 'MfgDate', 'manufacturingDate']),
      expiryDate: this.pickDate(item, ['ExpiryDate', 'expiry_date', 'expiryDate']),
      baseLine: lineNumStr || '0',
      batches: this.pickAvailableBatches(item),
    };
  }

  private pickProductionOrderItemQuantity(item: Record<string, unknown>): number {
    const plannedQuantity = this.pickNumber(item, ['PlannedQty', 'plannedQty', 'Quantity', 'quantity', 'Qty', 'qty']);
    if (plannedQuantity > 0) {
      return plannedQuantity;
    }

    const firstBatch = this.pickFirstBatch(item);
    return firstBatch ? this.pickNumber(firstBatch, ['Quantity', 'quantity', 'Qty', 'qty']) : 0;
  }

  private pickProductionOrderItemBatchNumber(item: Record<string, unknown>): string {
    const batchNumber = this.pickString(item, ['BatchNum', 'batchNum', 'batchNumber', 'batch_number']);
    if (batchNumber) {
      return batchNumber;
    }

    const firstBatch = this.pickFirstBatch(item);
    return firstBatch ? this.pickString(firstBatch, ['BatchNo', 'BatchNum', 'batchNum', 'batch_number']) : '';
  }

  private pickAvailableBatches(item: Record<string, unknown>): ProductionOrderBatch[] {
    const batchEntries = this.pickArray(item, ['batches', 'Batches']);
    return batchEntries
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((entry) => ({
        batchNo: this.pickString(entry, ['BatchNo', 'batchNo', 'BatchNum', 'batchNum', 'batch_number', 'Batch']),
        quantity: this.pickNumber(entry, ['Quantity', 'quantity', 'Qty', 'qty', 'AvailableQty', 'availableQty']),
      }))
      .filter((entry) => entry.batchNo.trim() !== '');
  }

  private pickFirstBatch(item: Record<string, unknown>): Record<string, unknown> | null {
    const batches = this.pickArray(item, ['batches', 'Batches']);
    return batches.find((batch): batch is Record<string, unknown> => !!batch && typeof batch === 'object' && !Array.isArray(batch)) ?? null;
  }

  private extractDataArray(response: unknown, wrapperKeys: string[]): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (!response || typeof response !== 'object') {
      return [];
    }

    const root = response as Record<string, unknown>;
    for (const key of wrapperKeys) {
      const wrapper = root[key];
      if (Array.isArray(wrapper)) {
        return wrapper;
      }
      if (wrapper && typeof wrapper === 'object') {
        const nested = wrapper as Record<string, unknown>;
        if (Array.isArray(nested['data'])) {
          return nested['data'] as unknown[];
        }
      }
    }

    if (Array.isArray(root['data'])) {
      return root['data'] as unknown[];
    }

    return [];
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

  private pickArray(source: Record<string, unknown>, keys: string[]): unknown[] {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
    return [];
  }

  private createEmptyHeader(): IssueForProductionHeader {
    const today = this.todayIso();
    return {
      baseProductionOrderDocEntry: '',
      baseProductionOrderDocNum: '',
      branchId: '',
      branchName: '',
      remarks: 'Issue for Production Order',
      documentDate: today,
      postingDate: today,
      dueDate: today,
    };
  }

  private createEmptyLine(): IssueForProductionLine {
    return {
      itemCode: '',
      itemDescription: '',
      warehouse: this.resolveDefaultWarehouseForBranch(this.headerForm().branchId),
      quantity: null,
      requiredQuantity: 0,
      batchNumber: '',
      manufacturingDate: '',
      expiryDate: '',
      baseEntry: '',
      baseLine: '0',
      availableBatches: [],
    };
  }

  orderItemKey(item: ProductionOrderItem): string {
    const lineNumber = this.resolveOrderItemLineNumber(item, 0);
    return `${lineNumber}:${item.itemCode}`;
  }

  private resolveOrderItemLineNumber(item: ProductionOrderItem, index: number): string {
    const rawBaseLine = item.baseLine?.trim();
    const rawLineNum = item.lineNum?.trim();

    const baseLineNumber = Number(rawBaseLine);
    if (Number.isFinite(baseLineNumber) && baseLineNumber > 0) {
      return String(baseLineNumber);
    }

    const lineNumber = Number(rawLineNum);
    if (Number.isFinite(lineNumber) && lineNumber > 0) {
      return String(lineNumber);
    }

    return String(index + 1);
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (value === undefined || value === null) {
        continue;
      }
      const text = String(value).trim();
      if (text !== '') {
        return text;
      }
    }
    return '';
  }

  private pickNumber(source: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = source[key];
      const parsed = Number(String(value ?? ''));
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  private normalizeBranchId(branch: string | undefined): string {
    const normalizedBranch = (branch ?? '').trim().toLowerCase();

    if (normalizedBranch === '1' || normalizedBranch === 'peshawar' || normalizedBranch === 'ahcp_peshawar') {
      return '1';
    }

    if (normalizedBranch === '2' || normalizedBranch === 'faisalabad' || normalizedBranch === 'ahcp_faisalabad' || normalizedBranch === '3') {
      return '2';
    }

    return '';
  }

  getBranchDisplayName(branchId: string | undefined): string {
    const normalizedBranchId = this.normalizeBranchId(branchId);

    if (normalizedBranchId === '1') {
      return 'AHCP_Peshawar';
    }

    if (normalizedBranchId === '2') {
      return 'AHCP_Faisalabad';
    }

    return branchId?.trim() || '';
  }

  private resolveDefaultWarehouseForBranch(branchId: string): string {
    const normalizedBranchId = this.normalizeBranchId(branchId);

    if (normalizedBranchId === '2') {
      return 'FSD-WH03';
    }

    if (normalizedBranchId === '1') {
      return 'PSH-WH03';
    }

    return '';
  }

  private pickDate(source: Record<string, unknown>, keys: string[]): string {
    const raw = this.pickString(source, keys);
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : raw;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
