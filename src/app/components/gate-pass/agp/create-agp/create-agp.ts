import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { BaseDocumentModalComponent } from '../../base-document-modal/base-document-modal';
import { BaseDocLinePayload, OpenBaseDocument } from '../../open-base-documents.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import {
  AgpAddPayload,
  AgpLineItem,
  AgpRecord,
  AgpService,
  createEmptyAgpLineItem,
} from '../agp.service';
import { GATE_PASS_LOCATION_OPTIONS } from '../../gate-pass-location.options';
import { GatePassItemMaster, GatePassItemMasterService } from '../../gate-pass-item-master.service';
import { GatePassItemSearchInputComponent } from '../../item-search-input/item-search-input';
import { nextGatePassReferenceNo } from '../../gate-pass-reference.util';
import { GATE_PASS_WAREHOUSE_OPTIONS } from '../../gate-pass-warehouse.options';

function emptyIfDash(value: string): string {
  return value === '—' ? '' : value;
}

@Component({
  selector: 'app-create-agp',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseDocumentModalComponent, GatePassItemSearchInputComponent],
  templateUrl: './create-agp.html',
  styleUrl: '../../igp/create-igp/create-igp.css',
})
export class CreateAgpComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add AGP';
  submitButtonLabel = 'Save AGP';

  type = 'Article Gate Pass';
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

  transporterName = '';
  transporterCnic = '';
  transporterPhone = '';
  biltyNo = '';
  freightAmount: number | null = null;

  attachmentFileName = '';
  headOfSupplyChainApproval = false;

  lines: AgpLineItem[] = [];
  remarks = '';

  /** After a base document is chosen, header fields (except movement/transporter/approval) are read-only. */
  headerLocked = false;

  showBaseDocModal = false;

  readonly typeOptions = [
    'Article Gate Pass',
    'Purchase Order',
    'Sales Return Request',
    'Stand Alone Documents',
  ] as const;

  readonly departmentOptions = [
    'Engineering',
    'Marketing',
    'Finance',
    'Human Resources',
    'Operations',
    'Procurement',
    'Logistics',
    'Sales',
    'Supply Chain',
  ] as const;
  readonly locationOptions = GATE_PASS_LOCATION_OPTIONS;
  readonly warehouseOptions = GATE_PASS_WAREHOUSE_OPTIONS;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly agpService: AgpService,
    private readonly alertService: AlertService,
    private readonly itemMasterService: GatePassItemMasterService,
  ) {
    const d = new Date();
    this.documentDate = d.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      this.assignNextReferenceNo();
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update AGP';
    this.submitButtonLabel = 'Update AGP';

    this.agpService.fetchArticleGatePassDetail(editId).subscribe({
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
  }

  onAttachmentChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.attachmentFileName = file?.name ?? '';
  }

  clearAttachment(): void {
    this.attachmentFileName = '';
  }

  back(): void {
    void this.router.navigateByUrl('/gate-pass/agp');
  }

  onBaseDocumentTypeChange(): void {
    if (this.editingId) {
      return;
    }
    this.resetAfterTypeOrClearBaseDoc();
  }

  clearBaseDocumentSelection(): void {
    if (this.editingId) {
      return;
    }
    this.resetAfterTypeOrClearBaseDoc();
  }

  private resetAfterTypeOrClearBaseDoc(): void {
    this.headerLocked = false;
    this.baseDocNo = '';
    this.businessPartnerCode = '';
    this.businessPartnerName = '';
    this.vehicleNo = '';
    this.location = '';
    this.store = '';
    this.remarks = '';
    this.lines = [];
    const d = new Date();
    this.documentDate = d.toISOString().slice(0, 10);
  }

  openBaseDocumentModal(): void {
    if (this.editingId) {
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

  private mapBaseDocLine(l: BaseDocLinePayload): AgpLineItem {
    const qty = Number(l.qty) || 0;
    return {
      itemCode: l.itemCode,
      itemName: l.itemName,
      oitmCode: l.itemCode,
      serialNumbers: '',
      category: l.category,
      packingCondition: l.packingCondition,
      productQuality: l.productQuality,
      uom: l.uom,
      qtySent: qty,
      qtyReceived: qty,
      info: l.info ?? '',
      remarks: l.remarks ?? '',
      deleted: false,
    };
  }

  private applyBaseDocument(doc: OpenBaseDocument): void {
    this.headerLocked = true;
    this.baseDocNo = doc.number;
    if (doc.date?.trim()) {
      this.documentDate = doc.date.trim();
    }
    this.businessPartnerCode = doc.businessPartnerCode?.trim() ?? '';
    this.businessPartnerName = (doc.businessPartnerName || doc.partner || '').trim();
    this.vehicleNo = doc.vehicleNo?.trim() ?? '';
    this.requestingDepartment = doc.department?.trim() ?? '';
    this.location = doc.location?.trim() ?? '';
    this.store = doc.store?.trim() ?? '';
    this.biltyNo = doc.biltyNo?.trim() ?? '';
    const freightParsed = parseFloat(String(doc.freight ?? '').replace(/[^\d.]/g, ''));
    this.freightAmount = Number.isFinite(freightParsed) ? freightParsed : null;
    this.reasonForMovement = doc.reasonForMovement?.trim() ?? '';
    this.requestingEmployee = doc.requestingEmployee?.trim() ?? '';
    this.requestedBy = doc.requestedBy?.trim() ?? '';
    this.issuedTo = doc.issuedTo?.trim() ?? '';
    this.articleOutDate = doc.articleOutDate?.trim() ?? '';
    this.articleReturnedDate = doc.articleReturnedDate?.trim() ?? '';
    this.transporterName = doc.transporterName?.trim() ?? '';
    this.transporterCnic = doc.transporterCnic?.trim() ?? '';
    this.transporterPhone = doc.transporterPhone?.trim() ?? '';
    this.remarks = doc.remarks?.trim() ?? '';
    this.lines = doc.lines?.map((l) => this.mapBaseDocLine(l)) ?? [];
  }

  submitForm(): void {
    if (
      !this.type?.trim() ||
      !this.documentDate?.trim() ||
      !this.requestingDepartment?.trim() ||
      !this.businessPartnerName?.trim()
    ) {
      void this.alertService.validation(
        'Please ensure Type, Date, Requesting department, and Business partner name are filled.',
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

    request$.subscribe({
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
    this.type = emptyIfDash(record.type) || 'Article Gate Pass';
    this.documentDate = emptyIfDash(record.submittedDate) || this.documentDate;
    this.referenceNo = emptyIfDash(record.referenceNo);
    this.businessPartnerCode = emptyIfDash(record.businessPartnerCode);
    this.baseDocNo = emptyIfDash(record.baseDocNo);
    this.businessPartnerName = emptyIfDash(record.businessPartnerName);
    this.vehicleNo = emptyIfDash(record.vehicleNo);
    this.reasonForMovement = emptyIfDash(record.reasonForMovement);
    this.requestingEmployee = emptyIfDash(record.requestingEmployee);
    this.requestingDepartment = emptyIfDash(record.requestingDepartment);
    this.requestedBy = emptyIfDash(record.requestedBy);
    this.issuedTo = emptyIfDash(record.issuedTo);
    this.articleOutDate = emptyIfDash(record.articleOutDate);
    this.articleReturnedDate = emptyIfDash(record.articleReturnedDate);
    this.location = emptyIfDash(record.location);
    this.store = emptyIfDash(record.store);
    this.transporterName = emptyIfDash(record.transporterName);
    this.transporterCnic = emptyIfDash(record.transporterCnic);
    this.transporterPhone = emptyIfDash(record.transporterPhone);
    this.biltyNo = emptyIfDash(record.biltyNo);
    this.freightAmount = record.freightAmount || null;
    this.attachmentFileName = emptyIfDash(record.attachmentFileName ?? '');
    this.headOfSupplyChainApproval = record.headOfSupplyChainApproval;
    this.remarks = emptyIfDash(record.remarks ?? '');
    this.lines = record.lines.length ? record.lines.map((line) => ({ ...line })) : [];
  }

  private buildPayload(): AgpAddPayload {
    return {
      type: this.type.trim(),
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
      transporterName: this.transporterName.trim(),
      transporterCnic: this.transporterCnic.trim(),
      transporterPhone: this.transporterPhone.trim(),
      biltyNo: this.biltyNo.trim(),
      freightAmount: Number(this.freightAmount) || 0,
      attachmentFileName: this.attachmentFileName.trim(),
      headOfSupplyChainApproval: this.headOfSupplyChainApproval,
      remarks: this.remarks.trim(),
      lines: this.lines
        .filter((line) => !line.deleted)
        .map((line) => ({
        oitmCode: line.itemCode.trim(),
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
        deleted: false,
      })),
      totalQtySent: this.totalQtySent,
      totalQtyReceived: this.totalQtyReceived,
    };
  }
}
