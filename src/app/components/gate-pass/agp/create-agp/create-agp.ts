import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AlertService } from '../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import {
  AgpAddPayload,
  AgpLineItem,
  AgpRecord,
  AgpService,
  createEmptyAgpLineItem,
} from '../agp.service';
import { GATE_PASS_LOCATION_OPTIONS, resolveGatePassLocation } from '../../gate-pass-location.options';
import { GatePassItemMaster, GatePassItemMasterService } from '../../gate-pass-item-master.service';
import { GatePassItemSearchInputComponent } from '../../item-search-input/item-search-input';
import {
  GatePassBusinessPartner,
  GatePassBusinessPartnerService,
} from '../../gate-pass-business-partner.service';
import { GatePassBusinessPartnerSearchInputComponent } from '../../business-partner-search-input/business-partner-search-input';
import { nextGatePassReferenceNo } from '../../gate-pass-reference.util';
import { GATE_PASS_WAREHOUSE_OPTIONS, resolveGatePassWarehouseCode } from '../../gate-pass-warehouse.options';
import { formatGatePassCnic, formatGatePassPhoneDigits } from '../../gate-pass-input-format.util';
import { GatePassDepartmentService } from '../../gate-pass-department.service';
import { BaseDocumentModalComponent } from '../../base-document-modal/base-document-modal';
import { OpenBaseDocument } from '../../open-base-documents.service';

const AGP_TYPE = 'Article Gate Pass';

function emptyIfDash(value: string): string {
  return value === '—' ? '' : value;
}

function numericFieldFromDoc(value: string | undefined): string {
  const parsed = parseFloat(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? String(parsed) : '';
}

@Component({
  selector: 'app-create-agp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseDocumentModalComponent,
    GatePassItemSearchInputComponent,
    GatePassBusinessPartnerSearchInputComponent,
  ],
  templateUrl: './create-agp.html',
  styleUrls: [
    '../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../../../HR-Portal/employee-action/probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css',
    '../../igp/create-igp/create-igp.css',
  ],
})
export class CreateAgpComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add AGP';
  submitButtonLabel = 'Save AGP';
  activeSection = 'agp-form-header-section';

  get pageSubtitle(): string {
    return this.editingId
      ? 'Update article gate pass details, movement lines, and document summary.'
      : 'Create a new article gate pass with movement, logistics, and line items.';
  }

  readonly agpType = AGP_TYPE;
  type = 'Purchase Order';
  documentDate = '';
  businessPartnerCode = '';
  baseDocNo = '';
  referenceNo = '';
  businessPartnerName = '';
  vehicleNo = '';

  reasonForMovement = '';
  requestingEmployee = '';
  requestingDepartment = '';
  requestedBy = '';
  issuedTo = '';

  articleOutDate = '';
  articleReturnedDate = '';
  location = '';
  store = '';
  kantaSlip = '';

  driverName = '';
  driverCnic = '';
  driverPhone = '';
  biltyNo = '';
  weight = '';

  attachmentFileName = '';
  headOfSupplyChainApproval = false;

  lines: AgpLineItem[] = [];
  remarks = '';
  loading = false;
  submitting = false;
  showBaseDocModal = false;

  departmentOptions: string[] = [];
  readonly typeOptions = [
    'Purchase Order',
    'Sales Return Request',
    'Stand Alone Documents',
    'Article Gate Pass',
  ] as const;
  readonly locationOptions = GATE_PASS_LOCATION_OPTIONS;
  readonly warehouseOptions = GATE_PASS_WAREHOUSE_OPTIONS;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly agpService: AgpService,
    private readonly alertService: AlertService,
    private readonly itemMasterService: GatePassItemMasterService,
    private readonly businessPartnerService: GatePassBusinessPartnerService,
    private readonly departmentService: GatePassDepartmentService,
  ) {
    const d = new Date();
    this.documentDate = d.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.itemMasterService.ensureLoaded().subscribe();
    this.businessPartnerService.ensureLoaded().subscribe();
    this.departmentService.ensureLoaded().subscribe({
      next: () => {
        this.departmentOptions = this.departmentService.departmentNames();
      },
    });

    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      this.assignNextReferenceNo();
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update AGP';
    this.submitButtonLabel = 'Update AGP';
    this.loading = true;

    this.agpService
      .fetchArticleGatePassDetail(editId)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (record) => {
          this.populateFromRecord(record);
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load AGP for edit.'),
          );
        },
      });
  }

  private assignNextReferenceNo(): void {
    const cached = this.agpService.records().map((r) => r.referenceNo);
    if (cached.length > 0) {
      this.referenceNo = nextGatePassReferenceNo('AGP', cached);
      return;
    }

    this.agpService.fetchArticleGatePasses().subscribe({
      next: (records) => {
        this.referenceNo = nextGatePassReferenceNo(
          'AGP',
          records.map((r) => r.referenceNo),
        );
      },
      error: () => {
        this.referenceNo = nextGatePassReferenceNo('AGP', []);
      },
    });
  }

  get totalQtySent(): number {
    return this.lines
      .filter((line) => !line.deleted)
      .reduce((s, l) => s + (Number(l.qtySent) || 0), 0);
  }

  get totalQtyReceived(): number {
    return this.lines
      .filter((line) => !line.deleted)
      .reduce((s, l) => s + (Number(l.qtyReceived) || 0), 0);
  }

  trackByIndex(index: number): number {
    return index;
  }

  addLine(): void {
    this.lines = [...this.lines, createEmptyAgpLineItem()];
  }

  removeLine(index: number): void {
    const line = this.lines[index];
    if (line && !line.deleted) {
      line.deleted = true;
    }
  }

  applyItemMaster(line: AgpLineItem, item: GatePassItemMaster): void {
    this.itemMasterService.applyToLine(line, item);
    line.oitmCode = item.itemCode;
  }

  applyBusinessPartner(partner: GatePassBusinessPartner): void {
    this.businessPartnerCode = partner.code;
    this.businessPartnerName = partner.name;
  }

  onDriverCnicChange(value: string): void {
    this.driverCnic = formatGatePassCnic(value);
  }

  onDriverPhoneChange(value: string): void {
    this.driverPhone = formatGatePassPhoneDigits(value);
  }

  onAttachmentChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.attachmentFileName = file?.name ?? '';
  }

  clearAttachment(): void {
    this.attachmentFileName = '';
  }

  get isBaseDocumentDisabled(): boolean {
    return !!this.editingId || this.type === 'Stand Alone Documents';
  }

  onBaseDocumentTypeChange(): void {
    if (this.editingId) {
      return;
    }
    this.baseDocNo = '';
  }

  clearBaseDocumentSelection(): void {
    if (this.editingId) {
      return;
    }
    this.baseDocNo = '';
  }

  openBaseDocumentModal(): void {
    if (this.isBaseDocumentDisabled) {
      return;
    }
    if (!this.type?.trim()) {
      void this.alertService.validation('Select a document type first.');
      return;
    }
    this.showBaseDocModal = true;
  }

  onBaseDocumentPicked(doc: OpenBaseDocument): void {
    this.applyBaseDocument(doc);
  }

  private applyBaseDocument(doc: OpenBaseDocument): void {
    this.baseDocNo = doc.number;
    if (doc.date?.trim()) {
      this.documentDate = doc.date.trim();
    }
    this.businessPartnerCode = doc.businessPartnerCode?.trim() ?? '';
    this.businessPartnerName = (doc.businessPartnerName || doc.partner || '').trim();
    this.vehicleNo = doc.vehicleNo?.trim() ?? '';
    this.kantaSlip = doc.kantaSlip?.trim() ?? '';
    this.requestingDepartment = this.departmentService.resolveDepartmentName(doc.department);
    this.biltyNo = doc.biltyNo?.trim() ?? '';
    this.store = resolveGatePassWarehouseCode(doc.store) || doc.store?.trim() || '';
    this.location = resolveGatePassLocation(doc.location) || doc.location?.trim() || '';
    this.reasonForMovement = doc.reasonForMovement?.trim() ?? '';
    this.requestingEmployee = doc.requestingEmployee?.trim() ?? '';
    this.requestedBy = doc.requestedBy?.trim() ?? '';
    this.issuedTo = doc.issuedTo?.trim() ?? '';
    this.articleOutDate = doc.articleOutDate?.trim() ?? '';
    this.articleReturnedDate = doc.articleReturnedDate?.trim() ?? '';
    this.driverName = (doc.driverName ?? doc.transporterName)?.trim() ?? '';
    this.driverCnic = formatGatePassCnic((doc.driverCnic ?? doc.transporterCnic)?.trim() ?? '');
    this.driverPhone = formatGatePassPhoneDigits((doc.driverPhone ?? doc.transporterPhone)?.trim() ?? '');
    this.weight = numericFieldFromDoc(doc.weight);
    this.remarks = doc.remarks?.trim() ?? '';
    this.lines =
      doc.lines?.map((l) => ({
        itemCode: l.itemCode,
        itemName: l.itemName,
        oitmCode: l.itemCode,
        serialNumbers: '',
        category: l.category,
        packingCondition: l.packingCondition,
        productQuality: l.productQuality,
        uom: l.uom,
        qtySent: Number(l.qty) || 0,
        qtyReceived: 0,
        info: l.info ?? '',
        remarks: l.remarks ?? '',
        deleted: false,
      })) ?? [];
  }

  back(): void {
    void this.router.navigateByUrl('/gate-pass/agp');
  }

  scrollToSection(sectionId: string): void {
    this.activeSection = sectionId;
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  submitForm(): void {
    if (this.submitting || this.loading) {
      return;
    }

    if (!this.documentDate?.trim() || !this.requestingDepartment?.trim() || !this.businessPartnerName?.trim()) {
      void this.alertService.validation(
        'Please ensure Date, Requesting department, and Business partner name are filled.',
      );
      return;
    }

    if (!this.lines.some((line) => !line.deleted)) {
      void this.alertService.validation('At least one line item is required.');
      return;
    }

    const payload = this.buildPayload();
    const request$ = this.editingId
      ? this.agpService.updateArticleGatePass(this.editingId, payload)
      : this.agpService.addArticleGatePass(payload);

    this.submitting = true;
    request$
      .pipe(finalize(() => {
        this.submitting = false;
      }))
      .subscribe({
        next: async (response) => {
          if (response?.status === false || response?.success === false) {
            const fallback = this.editingId ? 'Failed to update AGP.' : 'Failed to save AGP.';
            this.alertService.error('Error', response.message || fallback);
            return;
          }

          const title = this.editingId ? 'Updated' : 'Success';
          const message = this.editingId
            ? response?.message || 'AGP record updated successfully.'
            : response?.message || 'AGP record saved successfully.';
          await this.alertService.successAndWait(title, message);
          this.agpService.fetchArticleGatePasses().subscribe();
          this.back();
        },
        error: (error: unknown) => {
          const fallback = this.editingId ? 'Failed to update AGP.' : 'Failed to save AGP.';
          this.alertService.error('Error', formatApiErrorMessage(error, fallback));
        },
      });
  }

  private populateFromRecord(record: AgpRecord): void {
    this.type = emptyIfDash(record.type) || 'Purchase Order';
    this.documentDate = emptyIfDash(record.submittedDate) || this.documentDate;
    this.referenceNo = emptyIfDash(record.referenceNo);
    this.baseDocNo = emptyIfDash(record.baseDocNo);
    this.businessPartnerCode = emptyIfDash(record.businessPartnerCode);
    this.businessPartnerName = emptyIfDash(record.businessPartnerName);
    this.vehicleNo = emptyIfDash(record.vehicleNo);
    this.reasonForMovement = emptyIfDash(record.reasonForMovement);
    this.requestingEmployee = emptyIfDash(record.requestingEmployee);
    this.requestingDepartment = emptyIfDash(record.requestingDepartment);
    this.requestedBy = emptyIfDash(record.requestedBy);
    this.issuedTo = emptyIfDash(record.issuedTo);
    this.articleOutDate = emptyIfDash(record.articleOutDate);
    this.articleReturnedDate = emptyIfDash(record.articleReturnedDate);
    this.location = resolveGatePassLocation(emptyIfDash(record.location));
    this.store = resolveGatePassWarehouseCode(emptyIfDash(record.store));
    this.kantaSlip = emptyIfDash(record.kantaSlip);
    this.driverName = emptyIfDash(record.driverName);
    this.driverCnic = formatGatePassCnic(emptyIfDash(record.driverCnic));
    this.driverPhone = formatGatePassPhoneDigits(emptyIfDash(record.driverPhone));
    this.biltyNo = emptyIfDash(record.biltyNo);
    this.weight = numericFieldFromDoc(emptyIfDash(record.weight));
    this.attachmentFileName = emptyIfDash(record.attachmentFileName ?? '');
    this.headOfSupplyChainApproval = record.headOfSupplyChainApproval;
    this.remarks = emptyIfDash(record.remarks ?? '');
    this.lines = record.lines.length ? record.lines.map((line) => ({ ...line })) : [];
  }

  private buildPayload(): AgpAddPayload {
    return {
      type: this.type.trim() || AGP_TYPE,
      baseDocNo: this.baseDocNo.trim(),
      documentDate: this.documentDate.trim(),
      referenceNo: this.referenceNo.trim(),
      businessPartnerCode: this.businessPartnerCode.trim(),
      businessPartnerName: this.businessPartnerName.trim(),
      vehicleNo: this.vehicleNo.trim(),
      reasonForMovement: this.reasonForMovement.trim(),
      requestingEmployee: this.requestingEmployee.trim(),
      requestingDepartment: this.requestingDepartment.trim(),
      requestedBy: this.requestedBy.trim(),
      issuedTo: this.issuedTo.trim(),
      articleOutDate: this.articleOutDate.trim(),
      articleReturnedDate: this.articleReturnedDate.trim(),
      location: this.location.trim(),
      store: this.store.trim(),
      kantaSlip: this.kantaSlip.trim(),
      driverName: this.driverName.trim(),
      driverCnic: this.driverCnic.trim(),
      driverPhone: this.driverPhone.trim(),
      biltyNo: this.biltyNo.trim(),
      weight: String(this.weight ?? '').trim(),
      attachmentFileName: this.attachmentFileName.trim(),
      headOfSupplyChainApproval: this.headOfSupplyChainApproval,
      remarks: this.remarks.trim(),
      lines: this.lines
        .filter((line) => !line.deleted)
        .map((line) => ({
          oitmCode: line.oitmCode.trim() || line.itemCode.trim(),
          itemCode: line.itemCode.trim(),
          itemName: line.itemName.trim(),
          serialNumbers: line.serialNumbers.trim(),
          category: line.category.trim(),
          packingCondition: line.packingCondition.trim(),
          productQuality: line.productQuality.trim(),
          uom: line.uom.trim(),
          qtySent: Number(line.qtySent) || 0,
          qtyReceived: Number(line.qtyReceived) || 0,
          info: line.info.trim(),
          remarks: line.remarks.trim(),
        })),
      totalQtySent: this.totalQtySent,
      totalQtyReceived: this.totalQtyReceived,
    };
  }
}
