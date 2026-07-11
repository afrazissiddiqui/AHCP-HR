import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
  DestroyRef,
  inject,
  signal,
  computed,
  HostListener,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MiscellaneousLayoutService } from '../../miscellaneous/miscellaneous-layout.service';
import { ColumnResizeDirective } from '../../../column-resize';
import { ui5SelectStringValue } from '../../../ui5-select-helpers';
import { AlertService } from '../../../services/alert.service';
import { AuthService } from '../../../services/auth.service';
import { PermissionService } from '../../../services/permission.service';
import { ShellbarSearchService } from '../../../services/shellbar-search.service';
import { connectShellbarSearch } from '../../../utils/shellbar-search-connect.util';
import { filterRowIndexes } from '../../../utils/search-text.util';
import {
  SampleInspectionRequestService,
  SampleInspectionRecord,
  formatSirNumber,
} from '../../../services/sample-inspection-request.service';
import { IgpRecord, IgpRecordService } from '../../../services/igp-record.service';
import { formatOudpDepartment, resolveOudpDepartmentCode, findOudpDepartment, OudpDepartment } from '../../../constants/oudp-departments';
import { OitmItem } from '../../../constants/oitm-items';
import { OitmItemsService } from '../../../services/oitm-items.service';

export interface SirLineItemRow {
  itemCode: string;
  item: string;
  qty: string;
  uom: string;
  remarks: string;
  fromIgp: boolean;
}

type IgpSortColumn = 'igpNo' | 'bpCode' | 'bpName' | 'receivingDate';
type ItemSortColumn = 'itemCode' | 'itemName' | 'uom' | 'availableQty';

@Component({
  selector: 'app-sample-inspection-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective],
  templateUrl: './sample-inspection-request-form.html',
  styleUrls: ['./sample-inspection-request-form.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SampleInspectionRequestForm implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sampleInspectionRequestService = inject(SampleInspectionRequestService);
  private readonly oitmItemsService = inject(OitmItemsService);
  private readonly igpRecordService = inject(IgpRecordService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);
  protected readonly perm = inject(PermissionService);
  protected readonly layout = inject(MiscellaneousLayoutService);
  private readonly shellbarSearch = inject(ShellbarSearchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly ui5SelectStringValue = ui5SelectStringValue;
  protected readonly oudpDepartments = signal<OudpDepartment[]>([]);
  protected readonly oudpDepartmentsLoading = signal(false);
  protected readonly oudpDepartmentsError = signal<string | null>(null);

  protected readonly saving = signal(false);
  protected readonly viewMode = signal(false);
  protected readonly editMode = signal(false);
  private editingSirNo: number | null = null;
  protected readonly loadingRecord = signal(false);
  protected readonly igpDialogOpen = signal(false);
  protected readonly igpLoading = signal(false);
  protected readonly igpLoadError = signal<string | null>(null);
  protected readonly igpRecords = signal<IgpRecord[]>([]);
  igpSearchTerm = '';
  readonly Math = Math;
  igpSortColumn: IgpSortColumn = 'igpNo';
  igpSortDirection: 'asc' | 'desc' = 'asc';
  igpCurrentPage = 1;
  igpPageSize = 10;
  readonly igpPageSizeOptions = [5, 10, 20, 50];

  igpNo = signal('');
  bpCode = signal('');
  bpName = signal('');
  receivingDate = signal('');
  receivingTime = signal('');
  documentNumber = signal('System Generated');
  revNo = signal('0');
  revDate = signal('');
  documentDate = signal(this.todayDateString());
  lotBatchNo = signal('');
  manufacturingDate = signal('');
  expiryDate = signal(this.addDaysDateString(10));
  sealIntact = signal('');
  najas = signal('');
  physicalCondition = signal('');
  department = signal('');
  pestInfection = signal('');
  remarks = signal('');
  activeSection = signal<'header' | 'items'>('header');

  rows = signal<SirLineItemRow[]>([
    { itemCode: '', item: '', qty: '', uom: '', remarks: '', fromIgp: false },
  ]);
  searchText = '';

  submittedBy = signal(this.authService.getSessionUser()?.name ?? '');

  itemDialogOpen = false;
  selectedRowIndex: number | null = null;
  protected readonly itemSearchTerm = signal('');
  protected readonly selectedCatalogCodes = signal<Set<string>>(new Set());
  protected readonly itemCatalog = signal<OitmItem[]>([]);
  protected readonly itemLoading = signal(false);
  protected readonly itemLoadError = signal<string | null>(null);
  protected readonly itemSortColumn = signal<ItemSortColumn>('itemCode');
  protected readonly itemSortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly itemCurrentPage = signal(1);
  protected readonly itemPageSize = signal(10);
  readonly itemPageSizeOptions = [5, 10, 20, 50];

  protected readonly filteredCatalogItems = computed(() => {
    const term = this.itemSearchTerm().trim().toLowerCase();
    const column = this.itemSortColumn();
    const direction = this.itemSortDirection();
    let list = this.itemCatalog();

    if (term) {
      list = list.filter(
        (item) =>
          item.itemName.toLowerCase().includes(term) || item.itemCode.toLowerCase().includes(term),
      );
    }

    if (column === 'itemCode' && direction === 'asc' && !term) {
      return list;
    }

    return [...list].sort((left, right) => {
      const valA = String(left[column] ?? '').toLowerCase();
      const valB = String(right[column] ?? '').toLowerCase();
      const comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return direction === 'asc' ? comparison : -comparison;
    });
  });

  protected readonly paginatedCatalogItems = computed(() => {
    const start = (this.itemCurrentPage() - 1) * this.itemPageSize();
    return this.filteredCatalogItems().slice(start, start + this.itemPageSize());
  });

  protected readonly itemTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCatalogItems().length / this.itemPageSize())),
  );

  protected readonly allCatalogSelected = computed(() => {
    const visible = this.paginatedCatalogItems();
    const selected = this.selectedCatalogCodes();
    return visible.length > 0 && visible.every((item) => selected.has(item.itemCode));
  });

  ngOnInit(): void {
    connectShellbarSearch(
      this.shellbarSearch,
      this.destroyRef,
      {
        getSearchText: () => this.searchText,
        setSearchText: (value: string) => {
          this.searchText = value;
        },
        onSearchChange: () => undefined,
      },
      this.cdr,
    );

    this.loadOudpDepartments();
    this.oitmItemsService.ensureLoaded().subscribe();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const mode = params.get('mode');
      this.viewMode.set(mode === 'view');
      this.editMode.set(mode === 'edit');

      if (mode === 'view' || mode === 'edit') {
        this.loadRecordForMode();
        return;
      }

      this.editingSirNo = null;
      this.applyNewDocumentDefaults();
    });
  }

  private applyNewDocumentDefaults(): void {
    this.documentDate.set(this.todayDateString());
    this.expiryDate.set(this.addDaysDateString(10));
    this.revNo.set('0');
  }

  private loadOitmItems(): void {
    if (this.oitmItemsService.isLoaded()) {
      this.itemCatalog.set([...this.oitmItemsService.getCatalog()]);
      this.itemLoading.set(false);
      this.itemLoadError.set(null);
      return;
    }

    this.itemLoading.set(true);
    this.itemLoadError.set(null);

    this.oitmItemsService.ensureLoaded().subscribe({
      next: (rows) => {
        this.itemCatalog.set(rows);
        this.itemLoading.set(false);
      },
      error: () => {
        this.itemCatalog.set([]);
        this.itemLoading.set(false);
        this.itemLoadError.set('Could not load items from AHCP.');
      },
    });
  }

  private loadOudpDepartments(): void {
    this.oudpDepartmentsLoading.set(true);
    this.oudpDepartmentsError.set(null);
    this.sampleInspectionRequestService.getOudpDepartments().subscribe({
      next: (rows) => {
        this.oudpDepartments.set(rows);
        this.oudpDepartmentsLoading.set(false);
        if (this.department()) {
          this.department.set(resolveOudpDepartmentCode(this.department(), rows));
        }
      },
      error: () => {
        this.oudpDepartments.set([]);
        this.oudpDepartmentsLoading.set(false);
        this.oudpDepartmentsError.set('Could not load departments from AHCP.');
      },
    });
  }

  get filteredRowIndexes(): number[] {
    return filterRowIndexes(this.rows(), this.searchText);
  }

  isViewOnly(): boolean {
    return this.viewMode();
  }

  /** IGP-linked header fields stay locked when viewing or editing an existing record. */
  isIgpLinkedReadonly(): boolean {
    return this.viewMode() || this.editMode();
  }

  isHeaderReadonly(): boolean {
    return this.viewMode();
  }

  isFieldReadonly(): boolean {
    return this.viewMode();
  }

  isRevDateEditable(): boolean {
    return !this.viewMode();
  }

  departmentDisplay(): string {
    return formatOudpDepartment(this.department(), this.oudpDepartments());
  }

  displayFieldValue(value: string): string {
    const trimmed = value?.trim();
    return trimmed || '—';
  }

  private loadRecordForMode(): void {
    const sirNoParam = this.route.snapshot.queryParamMap.get('sirNo');
    const sirNo = sirNoParam ? Number(sirNoParam) : NaN;

    if (!Number.isFinite(sirNo)) {
      this.alertService.validation('Invalid SIR number.');
      return;
    }

    this.editingSirNo = sirNo;
    this.loadingRecord.set(true);
    this.sampleInspectionRequestService.getBySirNo(sirNo).subscribe({
      next: (record) => {
        this.loadingRecord.set(false);
        this.editingSirNo = record.sirNo;
        this.loadFromRecord(record);
      },
      error: () => {
        this.loadingRecord.set(false);
        this.alertService.validation('Could not load sample inspection request.');
      },
    });
  }

  private loadFromRecord(record: SampleInspectionRecord): void {
    this.igpNo.set(record.igpNo ?? '');
    this.bpCode.set(record.bpCode ?? '');
    this.bpName.set(record.bpName ?? '');
    this.receivingDate.set(record.receivingDate ?? '');
    this.receivingTime.set(record.receivingTime ?? '');
    this.documentNumber.set(record.documentNumber ?? formatSirNumber(record.sirNo));
    this.documentDate.set(record.documentDate ?? '');
    this.revNo.set(record.revNo ?? '0');
    this.revDate.set(record.revDate ?? '');
    this.department.set(resolveOudpDepartmentCode(record.department ?? '', this.oudpDepartments()));
    this.lotBatchNo.set(record.lotBatchNo ?? '');
    this.manufacturingDate.set(record.manufacturingDate ?? '');
    this.expiryDate.set(record.expiryDate ?? '');
    this.najas.set(record.najas ?? '');
    this.physicalCondition.set(this.normalizePhysicalCondition(record.physicalCondition));
    this.remarks.set(record.remarks ?? '');
    this.submittedBy.set(record.submittedBy ?? '');
    this.sealIntact.set(this.booleanToYesNo(record.sealIntact));
    this.pestInfection.set(this.booleanToYesNo(record.pestInfection));

    const items = record.items ?? [];
    this.rows.set(
      items.length > 0
        ? items.map((item) => ({
            itemCode: item.itemCode ?? '',
            item: item.item ?? '',
            qty: item.qty ?? '',
            uom: item.uom ?? '',
            remarks: item.remarks ?? '',
            fromIgp: Boolean(item.fromIgp),
          }))
        : [{ itemCode: '', item: '', qty: '', uom: '', remarks: '', fromIgp: false }],
    );
    this.reconcileIgpRowFlags(record);
  }

  /** Marks rows as IGP-sourced when loading older records saved before fromIgp was persisted. */
  private reconcileIgpRowFlags(record: SampleInspectionRecord): void {
    const igpNo = record.igpNo?.trim();
    if (!igpNo) {
      return;
    }

    const alreadyFlagged = this.rows().some((row) => row.fromIgp);
    if (alreadyFlagged) {
      return;
    }

    this.igpRecordService.getList().subscribe({
      next: (records) => {
        const igp = records.find((row) => row.igpNo.toLowerCase() === igpNo.toLowerCase());
        const igpItems = igp?.items ?? [];
        if (!igpItems.length) {
          return;
        }

        const igpCodes = new Set(igpItems.map((item) => item.itemCode.trim().toLowerCase()).filter(Boolean));
        this.rows.update((rows) =>
          rows.map((row) => ({
            ...row,
            fromIgp: igpCodes.has(row.itemCode.trim().toLowerCase()),
          })),
        );
      },
    });
  }

  private booleanToYesNo(value: boolean | undefined): string {
    if (value === undefined || value === null) {
      return '';
    }
    return value ? 'Yes' : 'No';
  }

  private normalizePhysicalCondition(value: string | undefined): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return '';
    }
    const lower = normalized.toLowerCase();
    if (normalized === 'Yes' || lower === 'okay') {
      return 'Okay';
    }
    if (normalized === 'No' || lower === 'not okay') {
      return 'Not Okay';
    }
    return normalized;
  }

  onReceivingDateChange(value: string): void {
    this.applyReceivingDate(value);
  }

  maxTodayDate(): string {
    return this.todayDateString();
  }

  private applyReceivingDate(value: string): void {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      this.receivingDate.set('');
      return;
    }

    if (this.isFutureDate(trimmed)) {
      this.alertService.validation('Receiving Date cannot be a future date.');
      return;
    }

    this.receivingDate.set(trimmed);
  }

  private isFutureDate(value: string): boolean {
    return value > this.todayDateString();
  }

  onRevDateChange(value: string): void {
    this.applyRevDate(value);
  }

  private applyRevDate(value: string): void {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      this.revDate.set('');
      return;
    }

    if (this.isFutureDate(trimmed)) {
      this.alertService.validation('Revision Date cannot exceed the current date.');
      return;
    }

    this.revDate.set(trimmed);
  }

  addRow() {
    if (this.isFieldReadonly()) {
      return;
    }
    this.rows.update((r) => [
      ...r,
      { itemCode: '', item: '', qty: '', uom: '', remarks: '', fromIgp: false },
    ]);
  }

  deleteRow(index: number) {
    if (this.isFieldReadonly()) {
      return;
    }
    this.rows.update((r) => {
      if (r.length <= 1) {
        return r;
      }
      return r.filter((_, i) => i !== index);
    });
  }

  patchRow(index: number, field: keyof SirLineItemRow, value: string | boolean) {
    this.rows.update((r) => {
      const next = [...r];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  isIgpRow(index: number): boolean {
    return this.rows()[index]?.fromIgp === true;
  }

  isRowItemFieldReadonly(index: number): boolean {
    if (this.viewMode()) {
      return true;
    }
    return this.isIgpRow(index) || !!this.rows()[index]?.itemCode;
  }

  isRowRemarksReadonly(index: number): boolean {
    return this.viewMode();
  }

  isRowQtyReadonly(index: number): boolean {
    if (this.viewMode()) {
      return true;
    }
    const row = this.rows()[index];
    if (!row) {
      return true;
    }
    return !row.itemCode.trim();
  }

  onQtyInput(index: number, value: string): void {
    const sanitized = String(value ?? '').replace(/\D/g, '');
    this.patchRow(index, 'qty', sanitized);
  }

  canOpenItemPicker(index: number): boolean {
    return !this.isFieldReadonly() && !this.isIgpRow(index);
  }

  trackRowIndex(index: number): number {
    return index;
  }

  protected canSubmit(): boolean {
    return this.perm.canSubmitForm('sample-inspection-request', this.viewMode(), this.editMode());
  }

  submit() {
    if (!this.canSubmit() || this.saving()) return;

    if (this.editMode()) {
      this.submitEdit();
      return;
    }

    const igpNo = this.igpNo().trim();
    const bpCode = this.bpCode().trim();
    const bpName = this.bpName().trim();

    if (!igpNo || !bpCode || !bpName) {
      this.alertService.validation('IGP No, BP Code, and BP Name are required.');
      return;
    }

    if (this.receivingDate() && this.isFutureDate(this.receivingDate())) {
      this.alertService.validation('Receiving Date cannot be a future date.');
      return;
    }

    if (this.revDate() && this.isFutureDate(this.revDate())) {
      this.alertService.validation('Revision Date cannot exceed the current date.');
      return;
    }

    if (!this.department().trim()) {
      this.alertService.validation('Department is required.');
      return;
    }

    if (!findOudpDepartment(this.department(), this.oudpDepartments())) {
      this.alertService.validation('Please select a valid OUDP department.');
      return;
    }

    if (!this.remarks().trim()) {
      this.alertService.validation('Document remarks are required.');
      return;
    }

    if (!this.submittedBy().trim()) {
      this.alertService.validation('Submitted By is required.');
      return;
    }

    const lineItems = this.rows().filter((row) => row.itemCode.trim());
    if (lineItems.length === 0) {
      this.alertService.validation('At least one line item is required.');
      return;
    }

    const missingRowRemarks = lineItems.some((row) => !row.remarks.trim());
    if (missingRowRemarks) {
      this.alertService.validation('Remarks are required for every line item.');
      return;
    }

    const payload = {
      igpNo,
      bpCode,
      bpName,
      receivingDate: this.receivingDate(),
      receivingTime: this.receivingTime(),
      documentDate: this.todayDateString(),
      revDate: this.revDate(),
      documentNumber: this.documentNumber(),
      lotBatchNo: this.lotBatchNo(),
      manufacturingDate: this.manufacturingDate(),
      expiryDate: this.expiryDate(),
      najas: this.najas(),
      physicalCondition: this.physicalCondition(),
      department: this.department(),
      sealIntact: this.sealIntact(),
      pestInfection: this.pestInfection(),
      remarks: this.remarks(),
      items: lineItems,
      submittedBy: this.submittedBy(),
    };

    this.saving.set(true);
    this.sampleInspectionRequestService.create(payload).subscribe({
      next: (saved) => this.onSaveSuccess(saved, false),
      error: (err) => this.onSaveError(err),
    });
  }

  private submitEdit(): void {
    const revDate = this.revDate().trim();
    if (!revDate) {
      this.alertService.validation('Revision Date is required.');
      return;
    }

    if (this.isFutureDate(revDate)) {
      this.alertService.validation('Revision Date cannot exceed the current date.');
      return;
    }

    if (this.receivingDate() && this.isFutureDate(this.receivingDate())) {
      this.alertService.validation('Receiving Date cannot be a future date.');
      return;
    }

    if (!this.department().trim()) {
      this.alertService.validation('Department is required.');
      return;
    }

    if (!findOudpDepartment(this.department(), this.oudpDepartments())) {
      this.alertService.validation('Please select a valid OUDP department.');
      return;
    }

    if (!this.remarks().trim()) {
      this.alertService.validation('Document remarks are required.');
      return;
    }

    const lineItems = this.rows().filter((row) => row.itemCode.trim());
    if (lineItems.length === 0) {
      this.alertService.validation('At least one line item is required.');
      return;
    }

    const missingRowRemarks = lineItems.some((row) => !row.remarks.trim());
    if (missingRowRemarks) {
      this.alertService.validation('Remarks are required for every line item.');
      return;
    }

    const sirNo = this.editingSirNo;
    if (sirNo == null || !Number.isFinite(sirNo)) {
      this.alertService.validation('Cannot update: record id is missing. Open the record again from the list.');
      return;
    }

    const payload = {
      igpNo: this.igpNo(),
      bpCode: this.bpCode(),
      bpName: this.bpName(),
      receivingDate: this.receivingDate(),
      receivingTime: this.receivingTime(),
      documentDate: this.documentDate(),
      revDate,
      documentNumber: this.documentNumber(),
      lotBatchNo: this.lotBatchNo(),
      manufacturingDate: this.manufacturingDate(),
      expiryDate: this.expiryDate(),
      najas: this.najas(),
      physicalCondition: this.physicalCondition(),
      department: this.department(),
      sealIntact: this.sealIntact(),
      pestInfection: this.pestInfection(),
      remarks: this.remarks(),
      items: lineItems,
      submittedBy: this.submittedBy(),
    };

    this.saving.set(true);
    this.sampleInspectionRequestService.update(sirNo, payload).subscribe({
      next: (saved) => this.onEditSaveSuccess(saved),
      error: (err) => this.onSaveError(err),
    });
  }

  private onSaveSuccess(saved: SampleInspectionRecord, isEdit: boolean): void {
    this.saving.set(false);
    if (isEdit) {
      this.loadFromRecord(saved);
    }
    const action = isEdit ? 'updated' : 'created';
    void this.alertService
      .successAndWait(
        'Success',
        `Sample inspection request ${saved.documentNumber} was ${action} successfully.`,
      )
      .then(() => void this.router.navigateByUrl('/miscellaneous/sample-inspection-request'));
  }

  private onEditSaveSuccess(saved: SampleInspectionRecord): void {
    this.sampleInspectionRequestService.getBySirNo(saved.sirNo).subscribe({
      next: (freshRecord) => {
        this.saving.set(false);
        this.loadFromRecord(freshRecord);
        void this.alertService
          .successAndWait(
            'Success',
            `Sample inspection request ${freshRecord.documentNumber} was updated successfully.`,
          )
          .then(() =>
            void this.router.navigate(['/miscellaneous/sample-inspection-request/form'], {
              queryParams: { sirNo: freshRecord.sirNo, mode: 'view' },
            }),
          );
      },
      error: () => {
        this.saving.set(false);
        void this.alertService
          .successAndWait(
            'Success',
            `Sample inspection request ${saved.documentNumber} was updated successfully.`,
          )
          .then(() =>
            void this.router.navigate(['/miscellaneous/sample-inspection-request/form'], {
              queryParams: { sirNo: saved.sirNo, mode: 'view' },
            }),
          );
      },
    });
  }

  private onSaveError(err: { error?: { message?: string }; status?: number }): void {
    this.saving.set(false);
    let message =
      err?.error?.message ??
      'Could not save sample inspection request. Make sure the backend is running.';
    if (err?.status === 404) {
      message =
        err?.error?.message ??
        'Update failed (404). Restart the Backend server, then try again.';
    }
    this.alertService.validation(message);
  }

  back() {
    if (this.viewMode() || this.editMode()) {
      void this.router.navigateByUrl('/miscellaneous/sample-inspection-request');
      return;
    }
    window.history.back();
  }

  scrollTo(id: string) {
    if (id === 'header' || id === 'items') {
      this.activeSection.set(id);
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const headerEl = document.getElementById('header');
    const itemsEl = document.getElementById('items');
    const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const offset = 150;

    if (itemsEl && scrollPos >= itemsEl.offsetTop - offset) {
      this.activeSection.set('items');
    } else if (headerEl) {
      this.activeSection.set('header');
    }
  }

  openIgpDialog(): void {
    if (this.isIgpLinkedReadonly()) {
      return;
    }
    this.igpSearchTerm = '';
    this.igpCurrentPage = 1;
    this.igpSortColumn = 'igpNo';
    this.igpSortDirection = 'asc';
    this.igpDialogOpen.set(true);
    this.loadIgpRecords();
  }

  closeIgpDialog(): void {
    this.igpDialogOpen.set(false);
  }

  private loadIgpRecords(): void {
    this.igpLoading.set(true);
    this.igpLoadError.set(null);

    this.igpRecordService.getList().subscribe({
      next: (records) => {
        this.igpRecords.set(records);
        this.igpLoading.set(false);
      },
      error: () => {
        this.igpLoading.set(false);
        this.igpLoadError.set('Could not load IGP records from AHCP.');
      },
    });
  }

  filteredIgpRecords(): IgpRecord[] {
    const term = this.igpSearchTerm.trim().toLowerCase();
    let list = [...this.igpRecords()];

    if (term) {
      list = list.filter(
        (record) =>
          record.igpNo.toLowerCase().includes(term) ||
          record.bpCode.toLowerCase().includes(term) ||
          record.bpName.toLowerCase().includes(term),
      );
    }

    list.sort((left, right) => {
      const valA = left[this.igpSortColumn] ?? '';
      const valB = right[this.igpSortColumn] ?? '';

      let comparison = 0;
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }

      return this.igpSortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }

  paginatedIgpRecords(): IgpRecord[] {
    const start = (this.igpCurrentPage - 1) * this.igpPageSize;
    return this.filteredIgpRecords().slice(start, start + this.igpPageSize);
  }

  get igpTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredIgpRecords().length / this.igpPageSize));
  }

  onIgpSearchChange(): void {
    this.igpCurrentPage = 1;
  }

  sortIgpData(column: IgpSortColumn): void {
    if (this.igpSortColumn === column) {
      this.igpSortDirection = this.igpSortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.igpSortColumn = column;
    this.igpSortDirection = 'asc';
  }

  setIgpPage(page: number): void {
    if (page >= 1 && page <= this.igpTotalPages) {
      this.igpCurrentPage = page;
    }
  }

  onIgpPageSizeChange(): void {
    this.igpCurrentPage = 1;
  }

  onIgpPageSizeUi5Change(ev: Event): void {
    const pageSize = Number(ui5SelectStringValue(ev));
    if (Number.isNaN(pageSize) || pageSize <= 0) {
      return;
    }

    this.igpPageSize = pageSize;
    this.onIgpPageSizeChange();
  }

  onIgpNoChange(value: string): void {
    if (this.isIgpLinkedReadonly()) {
      return;
    }
    this.igpNo.set(value);
  }

  selectIgpRecord(record: IgpRecord): void {
    this.igpNo.set(record.igpNo);
    this.bpCode.set(record.bpCode);
    this.bpName.set(record.bpName);

    if (record.receivingDate) {
      this.applyReceivingDate(record.receivingDate);
    }
    if (record.receivingTime) {
      this.receivingTime.set(record.receivingTime);
    }

    this.applyIgpLineItems(record);
    this.closeIgpDialog();
  }

  private applyIgpLineItems(record: IgpRecord): void {
    const igpItems = record.items ?? [];
    if (!igpItems.length) {
      return;
    }

    this.rows.set(
      igpItems.map((item) => ({
        itemCode: item.itemCode ?? '',
        item: item.item ?? '',
        qty: item.qty ?? '',
        uom: item.uom ?? '',
        remarks: '',
        fromIgp: true,
      })),
    );
  }

  openItemDialog(index: number): void {
    if (!this.canOpenItemPicker(index)) {
      return;
    }
    this.selectedRowIndex = index;
    this.itemSearchTerm.set('');
    this.itemCurrentPage.set(1);
    this.itemSortColumn.set('itemCode');
    this.itemSortDirection.set('asc');
    this.selectedCatalogCodes.set(new Set());
    this.itemDialogOpen = true;
    this.loadOitmItems();
  }

  closeItemDialog(): void {
    this.itemDialogOpen = false;
    this.selectedRowIndex = null;
    this.selectedCatalogCodes.set(new Set());
  }

  onItemSearchInput(value: string): void {
    this.itemSearchTerm.set(value);
    this.itemCurrentPage.set(1);
  }

  sortItemData(column: ItemSortColumn): void {
    if (this.itemSortColumn() === column) {
      this.itemSortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.itemSortColumn.set(column);
    this.itemSortDirection.set('asc');
  }

  setItemPage(page: number): void {
    if (page >= 1 && page <= this.itemTotalPages()) {
      this.itemCurrentPage.set(page);
    }
  }

  onItemPageSizeUi5Change(ev: Event): void {
    const pageSize = Number(ui5SelectStringValue(ev));
    if (Number.isNaN(pageSize) || pageSize <= 0) {
      return;
    }

    this.itemPageSize.set(pageSize);
    this.itemCurrentPage.set(1);
  }

  isCatalogSelected(item: OitmItem): boolean {
    return this.selectedCatalogCodes().has(item.itemCode);
  }

  toggleCatalogSelection(item: OitmItem, event?: Event): void {
    event?.stopPropagation();
    this.selectedCatalogCodes.update((codes) => {
      const next = new Set(codes);
      if (next.has(item.itemCode)) {
        next.delete(item.itemCode);
      } else {
        next.add(item.itemCode);
      }
      return next;
    });
  }

  toggleSelectAllCatalog(event: Event): void {
    event.stopPropagation();
    const visible = this.paginatedCatalogItems();
    const allSelected = this.allCatalogSelected();

    this.selectedCatalogCodes.update((codes) => {
      const next = new Set(codes);
      if (allSelected) {
        visible.forEach((item) => next.delete(item.itemCode));
      } else {
        visible.forEach((item) => next.add(item.itemCode));
      }
      return next;
    });
  }

  selectedCatalogCount(): number {
    return this.selectedCatalogCodes().size;
  }

  confirmItemSelection(): void {
    if (this.selectedRowIndex === null) {
      this.closeItemDialog();
      return;
    }

    const selected = this.itemCatalog().filter((item) =>
      this.selectedCatalogCodes().has(item.itemCode),
    );
    if (selected.length === 0) {
      return;
    }

    const targetIndex = this.selectedRowIndex;

    this.rows.update((currentRows) => {
      const updatedRows = [...currentRows];
      const firstItem = selected[0];
      updatedRows[targetIndex] = {
        ...updatedRows[targetIndex],
        itemCode: firstItem.itemCode,
        item: firstItem.itemName,
        uom: firstItem.uom,
        qty: '',
        fromIgp: false,
      };

      const additionalRows = selected.slice(1).map((item) => ({
        itemCode: item.itemCode,
        item: item.itemName,
        qty: '',
        uom: item.uom,
        remarks: '',
        fromIgp: false,
      }));

      return [...updatedRows, ...additionalRows];
    });

    this.closeItemDialog();
  }

  private todayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDaysDateString(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
