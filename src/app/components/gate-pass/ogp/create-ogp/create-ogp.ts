import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { BaseDocumentModalComponent } from '../../base-document-modal/base-document-modal';
import { OpenBaseDocument } from '../../open-base-documents.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import {
  createEmptyOgpLineItem,
  OgpAddPayload,
  OgpLineItem,
  OgpRecord,
  OgpService,
} from '../ogp.service';
import { GATE_PASS_LOCATION_OPTIONS } from '../../gate-pass-location.options';
import { GatePassItemMaster, GatePassItemMasterService } from '../../gate-pass-item-master.service';
import { GatePassItemSearchInputComponent } from '../../item-search-input/item-search-input';
import { nextGatePassReferenceNo } from '../../gate-pass-reference.util';
import { GATE_PASS_WAREHOUSE_OPTIONS } from '../../gate-pass-warehouse.options';
import {
  GatePassBusinessPartner,
  GatePassBusinessPartnerService,
} from '../../gate-pass-business-partner.service';
import { GatePassBusinessPartnerSearchInputComponent } from '../../business-partner-search-input/business-partner-search-input';
import {
  formatGatePassCnic,
  formatGatePassPhoneDigits,
} from '../../gate-pass-input-format.util';

function emptyIfDash(value: string): string {
  return value === '—' ? '' : value;
}

function numericFieldFromDoc(value: string | undefined): string {
  const parsed = parseFloat(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? String(parsed) : '';
}

@Component({
  selector: 'app-create-ogp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseDocumentModalComponent,
    GatePassItemSearchInputComponent,
    GatePassBusinessPartnerSearchInputComponent,
  ],
  templateUrl: './create-ogp.html',
  styleUrls: [
    '../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../../../Plant-Maintenance/setup-form/plant-maintenance-setup-form.css',
    '../../../Plant-Maintenance/main-form/husky-form/add-husky-form/add-husky-form.css',
    '../../igp/create-igp/create-igp.css',
  ],
})
export class CreateOgpComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add OGP';
  submitButtonLabel = 'Save OGP';

  type = 'Standalone';
  documentDate = '';
  businessPartnerCode = '';
  baseDocNo = '';
  referenceNo = '';
  businessPartnerName = '';
  vehicleNo = '';
  fromUnit = '';
  kantaSlip = '';
  department = '';
  biltyNo = '';
  store = '';
  driverName = '';
  driverCnic = '';
  driverPhone = '';
  weight = '';
  location = '';
  employee = '';
  lines: OgpLineItem[] = [];
  remarks = '';

  showBaseDocModal = false;

  readonly typeOptions = ['Delivery', 'Standalone'] as const;
  readonly locationOptions = GATE_PASS_LOCATION_OPTIONS;
  readonly warehouseOptions = GATE_PASS_WAREHOUSE_OPTIONS;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly ogpService: OgpService,
    private readonly alertService: AlertService,
    private readonly itemMasterService: GatePassItemMasterService,
    private readonly businessPartnerService: GatePassBusinessPartnerService,
  ) {
    const d = new Date();
    this.documentDate = d.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.itemMasterService.ensureLoaded().subscribe();
    this.businessPartnerService.ensureLoaded().subscribe();

    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      this.assignNextReferenceNo();
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update OGP';
    this.submitButtonLabel = 'Update OGP';

    this.ogpService.fetchOutwardGatePassDetail(editId).subscribe({
      next: (record) => {
        this.populateFromRecord(record);
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load OGP for edit.'),
        );
      },
    });
  }

  private assignNextReferenceNo(): void {
    const cached = this.ogpService.records().map((r) => r.referenceNo);
    if (cached.length > 0) {
      this.referenceNo = nextGatePassReferenceNo('OGP', cached);
      return;
    }

    this.ogpService.fetchOutwardGatePasses().subscribe({
      next: (records) => {
        this.referenceNo = nextGatePassReferenceNo(
          'OGP',
          records.map((r) => r.referenceNo),
        );
      },
      error: () => {
        this.referenceNo = nextGatePassReferenceNo('OGP', []);
      },
    });
  }

  get totalQty(): number {
    return this.lines
      .filter((line) => !line.deleted)
      .reduce((s, l) => s + (Number(l.qty) || 0), 0);
  }

  get isBaseDocumentDisabled(): boolean {
    return !!this.editingId || this.type === 'Standalone';
  }

  trackByIndex(index: number): number {
    return index;
  }

  addLine(): void {
    this.lines = [...this.lines, createEmptyOgpLineItem()];
  }

  removeLine(index: number): void {
    const line = this.lines[index];
    if (line && !line.deleted) {
      line.deleted = true;
    }
  }

  applyItemMaster(line: OgpLineItem, item: GatePassItemMaster): void {
    this.itemMasterService.applyToLine(line, item);
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

  back(): void {
    void this.router.navigateByUrl('/gate-pass/ogp');
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
    this.fromUnit = doc.fromUnit?.trim() ?? '';
    this.kantaSlip = doc.kantaSlip?.trim() ?? '';
    this.department = doc.department?.trim() ?? '';
    this.biltyNo = doc.biltyNo?.trim() ?? '';
    this.store = doc.store?.trim() ?? '';
    this.driverName = (doc.driverName ?? doc.transporterName)?.trim() ?? '';
    this.driverCnic = formatGatePassCnic((doc.driverCnic ?? doc.transporterCnic)?.trim() ?? '');
    this.driverPhone = formatGatePassPhoneDigits((doc.driverPhone ?? doc.transporterPhone)?.trim() ?? '');
    this.weight = numericFieldFromDoc(doc.weight);
    this.location = doc.location?.trim() ?? '';
    this.remarks = doc.remarks?.trim() ?? '';
    this.lines =
      doc.lines?.map((l) => ({
        itemCode: l.itemCode,
        itemName: l.itemName,
        serialNumbers: '',
        category: l.category,
        packingCondition: l.packingCondition,
        productQuality: l.productQuality,
        uom: l.uom,
        qty: Number(l.qty) || 0,
        info: l.info ?? '',
        remarks: l.remarks ?? '',
        deleted: false,
      })) ?? [];
  }

  submitForm(): void {
    if (!this.type?.trim() || !this.documentDate?.trim() || !this.department?.trim() || !this.businessPartnerName?.trim()) {
      void this.alertService.validation('Please ensure Type, Date, Department, and Business partner name are filled.');
      return;
    }

    if (!this.lines.some((line) => !line.deleted)) {
      void this.alertService.validation('At least one line item is required.');
      return;
    }

    const payload = this.buildPayload();
    const request$ = this.editingId
      ? this.ogpService.updateOutwardGatePass(this.editingId, payload)
      : this.ogpService.addOutwardGatePass(payload);

    request$.subscribe({
      next: async (response) => {
        if (response?.status === false || response?.success === false) {
          const fallback = this.editingId ? 'Failed to update OGP.' : 'Failed to save OGP.';
          this.alertService.error('Error', response.message || fallback);
          return;
        }

        const title = this.editingId ? 'Updated' : 'Success';
        const message = this.editingId
          ? response?.message || 'OGP record updated successfully.'
          : response?.message || 'OGP record saved successfully.';
        await this.alertService.successAndWait(title, message);
        this.ogpService.fetchOutwardGatePasses().subscribe();
        this.back();
      },
      error: (error: unknown) => {
        const fallback = this.editingId ? 'Failed to update OGP.' : 'Failed to save OGP.';
        this.alertService.error('Error', formatApiErrorMessage(error, fallback));
      },
    });
  }

  private populateFromRecord(record: OgpRecord): void {
    this.type = emptyIfDash(record.type) || 'Standalone';
    this.documentDate = emptyIfDash(record.submittedDate) || this.documentDate;
    this.referenceNo = emptyIfDash(record.referenceNo);
    this.businessPartnerCode = emptyIfDash(record.businessPartnerCode);
    this.baseDocNo = emptyIfDash(record.baseDocNo);
    this.businessPartnerName = emptyIfDash(record.businessPartnerName);
    this.vehicleNo = emptyIfDash(record.vehicleNo);
    this.fromUnit = emptyIfDash(record.fromUnit);
    this.kantaSlip = emptyIfDash(record.kantaSlip);
    this.biltyNo = emptyIfDash(record.biltyNo);
    this.store = emptyIfDash(record.store);
    this.driverName = emptyIfDash(record.driverName);
    this.driverCnic = formatGatePassCnic(emptyIfDash(record.driverCnic));
    this.driverPhone = formatGatePassPhoneDigits(emptyIfDash(record.driverPhone));
    this.department = emptyIfDash(record.department);
    this.weight = numericFieldFromDoc(emptyIfDash(record.weight));
    this.location = emptyIfDash(record.location);
    this.employee = emptyIfDash(record.employee);
    this.remarks = emptyIfDash(record.remarks ?? '');
    this.lines = record.lines.length ? record.lines.map((line) => ({ ...line })) : [];
  }

  private buildPayload(): OgpAddPayload {
    return {
      type: this.type.trim(),
      baseDocNo: this.baseDocNo.trim(),
      documentDate: this.documentDate.trim(),
      referenceNo: this.referenceNo.trim(),
      businessPartnerCode: this.businessPartnerCode.trim(),
      businessPartnerName: this.businessPartnerName.trim(),
      vehicleNo: this.vehicleNo.trim(),
      fromUnit: this.fromUnit.trim(),
      kantaSlip: this.kantaSlip.trim(),
      biltyNo: this.biltyNo.trim(),
      store: this.store.trim(),
      driverName: this.driverName.trim(),
      driverCnic: this.driverCnic.trim(),
      driverPhone: this.driverPhone.trim(),
      department: this.department.trim(),
      weight: String(this.weight ?? '').trim(),
      location: this.location,
      employee: this.employee.trim(),
      remarks: this.remarks.trim(),
      lines: this.lines
        .filter((line) => !line.deleted)
        .map((line) => ({
          itemCode: line.itemCode.trim(),
          itemName: line.itemName.trim(),
          category: line.category.trim(),
          packingCondition: line.packingCondition.trim(),
          productQuality: line.productQuality.trim(),
          uom: line.uom.trim(),
          qty: Number(line.qty) || 0,
          info: line.info.trim(),
          remarks: line.remarks.trim(),
        })),
      totalQty: this.totalQty,
    };
  }
}
