import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
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
import {
  GatePassBusinessPartner,
  GatePassBusinessPartnerService,
} from '../../gate-pass-business-partner.service';
import { GatePassBusinessPartnerSearchInputComponent } from '../../business-partner-search-input/business-partner-search-input';
import { nextGatePassReferenceNo } from '../../gate-pass-reference.util';
import { GATE_PASS_WAREHOUSE_OPTIONS } from '../../gate-pass-warehouse.options';
import { formatGatePassCnic, formatGatePassPhoneDigits } from '../../gate-pass-input-format.util';
import { GatePassDepartmentService } from '../../gate-pass-department.service';

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
    GatePassItemSearchInputComponent,
    GatePassBusinessPartnerSearchInputComponent,
  ],
  templateUrl: './create-agp.html',
  styleUrls: [
    '../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../../../Plant-Maintenance/setup-form/plant-maintenance-setup-form.css',
    '../../../Plant-Maintenance/main-form/husky-form/add-husky-form/add-husky-form.css',
    '../../igp/create-igp/create-igp.css',
  ],
})
export class CreateAgpComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add AGP';
  submitButtonLabel = 'Save AGP';

  readonly agpType = AGP_TYPE;
  documentDate = '';
  businessPartnerCode = '';
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

  departmentOptions: string[] = [];
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

  back(): void {
    void this.router.navigateByUrl('/gate-pass/agp');
  }

  submitForm(): void {
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
    this.documentDate = emptyIfDash(record.submittedDate) || this.documentDate;
    this.referenceNo = emptyIfDash(record.referenceNo);
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
    this.location = emptyIfDash(record.location);
    this.store = emptyIfDash(record.store);
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
      type: AGP_TYPE,
      baseDocNo: '',
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
