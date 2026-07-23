import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AlertService } from '../../../../services/alert.service';
import { AuthService } from '../../../../services/auth.service';
import { WarehouseOption, WarehouseService } from '../../../../services/warehouse.service';
import { MiscellaneousLayoutService } from '../../miscellaneous-layout.service';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { ReceiptFromProductionHeader, ReceiptFromProductionLine, createEmptyReceiptFromProductionHeader, createEmptyReceiptFromProductionLine } from '../receipt-from-production.model';
import { buildCreateReceiptFromProductionPayload, ProductionOrderRecord, ReceiptFromProductionService } from '../receipt-from-production.service';
import { formatApiErrorMessage, formatSapApiFailureMessage } from '../../../../utils/api-error.util';

@Component({
  selector: 'app-add-receipt-from-production',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './add-receipt-from-production.html',
  styleUrls: ['../../miscellaneous-form.css'],
})
export class AddReceiptFromProduction implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly receiptService = inject(ReceiptFromProductionService);
  private readonly warehouseService = inject(WarehouseService);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly saving = signal(false);
  readonly activeSection = signal<'header' | 'items' | 'footer'>('header');
  readonly submittedBy = signal(this.authService.getSessionUser()?.name ?? '');
  readonly productionOrderDialogOpen = signal(false);
  readonly productionOrdersLoading = signal(false);
  readonly productionOrdersError = signal<string | null>(null);
  readonly productionOrderSearchText = signal('');
  readonly productionOrders = signal<ProductionOrderRecord[]>([]);
  readonly selectedProductionOrder = signal<ProductionOrderRecord | null>(null);
  readonly warehouseOptions = signal<WarehouseOption[]>([]);

  readonly editingId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  readonly pageTitle = computed(() => (this.editingId() ? 'Edit Receipt from Production' : 'Add Receipt from Production'));

  readonly headerForm = signal<ReceiptFromProductionHeader>(createEmptyReceiptFromProductionHeader());
  readonly contentLines = signal<ReceiptFromProductionLine[]>([createEmptyReceiptFromProductionLine()]);

  readonly branchOptions = signal([
    { code: '1', name: 'AHCP_Peshawar' },
    { code: '2', name: 'AHCP_HO' },
    { code: '3', name: 'AHCP_Faisalabad' },
  ]);

  ngOnInit(): void {
    this.warehouseService.ensureLoaded().subscribe({
      next: (warehouses) => this.warehouseOptions.set(warehouses),
      error: () => this.warehouseOptions.set([]),
    });
  }

  scrollTo(section: 'header' | 'items' | 'footer'): void {
    this.activeSection.set(section);
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  updateHeaderField(field: keyof ReceiptFromProductionHeader, value: string): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  getBranchDisplayName(branchId: string | undefined): string {
    const branch = this.branchOptions().find((option) => option.code === branchId);
    return branch?.name ?? branchId ?? '';
  }

  formatQuantity(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }

    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }

  addContentLine(): void {
    this.contentLines.update((rows) => [...rows, createEmptyReceiptFromProductionLine()]);
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  }

  updateContentLine(index: number, field: keyof ReceiptFromProductionLine, value: string): void {
    this.contentLines.update((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        if (
          [
            'quantity',
            'unitPrice',
            'itemCost',
            'plannedQty',
            'completedQty',
            'quantityPerJumboCtn',
            'jumboCartons',
          ].includes(field)
        ) {
          const numericValue = value === '' ? null : Number(value);
          return { ...row, [field]: Number.isNaN(numericValue) ? null : numericValue } as ReceiptFromProductionLine;
        }

        return { ...row, [field]: value } as ReceiptFromProductionLine;
      }),
    );
  }

  openProductionOrderDialog(): void {
    this.productionOrderDialogOpen.set(true);
    this.productionOrderSearchText.set('');
    this.productionOrdersLoading.set(true);
    this.productionOrdersError.set(null);

    this.receiptService.listProductionOrders().pipe(finalize(() => this.productionOrdersLoading.set(false))).subscribe({
      next: (orders) => {
        this.productionOrders.set(orders);
      },
      error: () => {
        this.productionOrders.set([]);
        this.productionOrdersError.set('Could not load production orders.');
      },
    });
  }

  closeProductionOrderDialog(): void {
    this.productionOrderDialogOpen.set(false);
  }

  chooseProductionOrder(order: ProductionOrderRecord): void {
    this.selectedProductionOrder.set(order);
    this.applyProductionOrder(order);
    this.closeProductionOrderDialog();
  }

  applyProductionOrder(order: ProductionOrderRecord): void {
    this.headerForm.update((state) => ({
      ...state,
      baseProductionOrderDocEntry: order.docEntry,
      baseProductionOrderDocNum: order.docNum,
      documentDate: order.postDate || state.documentDate,
      postingDate: order.postDate || state.postingDate,
      dueDate: order.dueDate || state.dueDate,
      branchId: order.branch || state.branchId,
      branchName: order.branch || state.branchName,
      warehouse: state.warehouse || '',
      remarks: state.remarks || 'Receipt from production',
    }));

    const nextLine = createEmptyReceiptFromProductionLine();
    const firstItem = order.items?.[0];
    const orderItemCode = (order as ProductionOrderRecord & { itemCode?: string }).itemCode?.trim() || '';
    const orderItemName = (order as ProductionOrderRecord & { itemDescription?: string }).itemDescription?.trim() || '';
    const defaultWarehouse = this.defaultWarehouseForBranch(order.branch || this.headerForm().branchId);

    nextLine.itemCode = orderItemCode || firstItem?.itemCode || '';
    nextLine.itemDescription = orderItemName || firstItem?.itemDescription || '';
    nextLine.warehouse = defaultWarehouse || order.warehouse || nextLine.warehouse;
    nextLine.batchNumber = order.batchNumber || nextLine.batchNumber;
    nextLine.quantity = order.receiptQty > 0 ? order.receiptQty : (firstItem?.quantity ?? null);
    nextLine.jumboCartons = firstItem?.jumboCartons ?? null;
    nextLine.manufacturingDate = firstItem?.manufacturingDate || '';
    nextLine.expiryDate = firstItem?.expiryDate || '';
    nextLine.baseEntry = order.docEntry;
    nextLine.baseLine = firstItem?.baseLine || '0';

    this.contentLines.set([nextLine]);
  }

  private defaultWarehouseForBranch(branchId: string | undefined): string {
    const normalized = (branchId ?? '').trim();
    if (normalized === '1') {
      return 'PSH-WH06';
    }
    if (normalized === '3') {
      return 'FSD-WH06';
    }
    return '';
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    const header = this.headerForm();
    const lines = this.contentLines().filter((line) => (line.itemCode ?? '').trim());

    if (!header.baseProductionOrderDocEntry?.trim()) {
      this.alertService.validation('Select a production order before saving.');
      return;
    }

    if (!header.documentDate?.trim()) {
      this.alertService.validation('Document Date is required.');
      return;
    }

    if (!header.postingDate?.trim()) {
      this.alertService.validation('Posting Date is required.');
      return;
    }

    if (!header.dueDate?.trim()) {
      this.alertService.validation('Due Date is required.');
      return;
    }

    if (lines.length === 0) {
      this.alertService.validation('At least one row item is required.');
      return;
    }

    if (lines.some((line) => !(line.warehouse ?? '').trim())) {
      this.alertService.validation('Warehouse is required for every row.');
      return;
    }

    if (lines.some((line) => line.quantity == null || line.quantity <= 0)) {
      this.alertService.validation('Quantity is required for every row.');
      return;
    }

    const payload = buildCreateReceiptFromProductionPayload(header, lines);

    this.saving.set(true);
    this.receiptService.create(payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (response) => {
        const successText = response?.message?.trim() || (response?.docEntry != null ? `Receipt from production created (Doc #${response.docEntry}).` : 'Receipt from production was created successfully.');
        void this.alertService.success('Success', successText);
        void this.router.navigate(['/miscellaneous/receipt-from-production']);
      },
      error: (err) => {
        void this.alertService.error('Save Failed', formatSapApiFailureMessage(err, formatApiErrorMessage(err, 'Could not save receipt from production. Make sure the backend is running.')));
      },
    });
  }
}
