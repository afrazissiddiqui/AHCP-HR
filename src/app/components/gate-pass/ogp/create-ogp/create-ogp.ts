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

function emptyIfDash(value: string): string {
  return value === '—' ? '' : value;
}

@Component({
  selector: 'app-create-ogp',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseDocumentModalComponent],
  templateUrl: './create-ogp.html',
  styleUrl: '../../igp/create-igp/create-igp.css',
})
export class CreateOgpComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add OGP';
  submitButtonLabel = 'Save OGP';

  type = 'Delivery';
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
  freight = '';
  weightMachineName = '';
  weight = '';
  location = '';
  employee = '';
  lines: OgpLineItem[] = [];
  remarks = '';

  showBaseDocModal = false;

  readonly typeOptions = [
    'Delivery',
    'Purchase Order',
    'Sales Return Request',
    'Stand Alone Documents',
  ] as const;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly ogpService: OgpService,
    private readonly alertService: AlertService,
  ) {
    const d = new Date();
    this.documentDate = d.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
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

  get totalQty(): number {
    return this.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  }

  trackByIndex(index: number): number {
    return index;
  }

  addLine(): void {
    this.lines = [...this.lines, createEmptyOgpLineItem()];
  }

  removeLine(index: number): void {
    this.lines = this.lines.filter((_, i) => i !== index);
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

  private applyBaseDocument(doc: OpenBaseDocument): void {
    this.baseDocNo = doc.number;
    if (doc.date?.trim()) {
      this.documentDate = doc.date.trim();
    }
    this.referenceNo = doc.referenceNo?.trim() ?? '';
    this.businessPartnerCode = doc.businessPartnerCode?.trim() ?? '';
    this.businessPartnerName = (doc.businessPartnerName || doc.partner || '').trim();
    this.vehicleNo = doc.vehicleNo?.trim() ?? '';
    this.fromUnit = doc.fromUnit?.trim() ?? '';
    this.kantaSlip = doc.kantaSlip?.trim() ?? '';
    this.department = doc.department?.trim() ?? '';
    this.biltyNo = doc.biltyNo?.trim() ?? '';
    this.store = doc.store?.trim() ?? '';
    this.freight = doc.freight?.trim() ?? '';
    this.weightMachineName = doc.weightMachineName?.trim() ?? '';
    this.weight = doc.weight?.trim() ?? '';
    this.location = doc.location?.trim() ?? '';
    this.remarks = doc.remarks?.trim() ?? '';
    this.lines =
      doc.lines?.map((l) => ({
        itemCode: l.itemCode,
        itemName: l.itemName,
        category: l.category,
        packingCondition: l.packingCondition,
        productQuality: l.productQuality,
        uom: l.uom,
        qty: Number(l.qty) || 0,
        info: l.info ?? '',
        remarks: l.remarks ?? '',
      })) ?? [];
  }

  submitForm(): void {
    if (!this.type?.trim() || !this.documentDate?.trim() || !this.department?.trim() || !this.businessPartnerName?.trim()) {
      void this.alertService.validation('Please ensure Type, Date, Department, and Business partner name are filled.');
      return;
    }

    if (this.lines.length === 0) {
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
    this.type = emptyIfDash(record.type) || 'Delivery';
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
    this.freight = emptyIfDash(record.freight);
    this.department = emptyIfDash(record.department);
    this.weightMachineName = emptyIfDash(record.weightMachineName);
    this.weight = emptyIfDash(record.weight);
    this.location = emptyIfDash(record.location);
    this.employee = emptyIfDash(record.employee);
    this.remarks = emptyIfDash(record.remarks ?? '');
    this.lines = record.lines.length ? record.lines.map((line) => ({ ...line })) : [];
  }

  private buildPayload(): OgpAddPayload {
    const referenceNo =
      this.referenceNo.trim() ||
      `OGP-${new Date().getFullYear()}-${String(this.ogpService.records().length + 1).padStart(3, '0')}`;

    return {
      type: this.type.trim(),
      baseDocNo: this.baseDocNo.trim(),
      documentDate: this.documentDate.trim(),
      referenceNo,
      businessPartnerCode: this.businessPartnerCode.trim(),
      businessPartnerName: this.businessPartnerName.trim(),
      vehicleNo: this.vehicleNo.trim(),
      fromUnit: this.fromUnit.trim(),
      kantaSlip: this.kantaSlip.trim(),
      biltyNo: this.biltyNo.trim(),
      store: this.store.trim(),
      freight: this.freight.trim(),
      department: this.department.trim(),
      weightMachineName: this.weightMachineName.trim(),
      weight: this.weight.trim(),
      location: this.location,
      employee: this.employee.trim(),
      remarks: this.remarks.trim(),
      lines: this.lines.map((line) => ({
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
