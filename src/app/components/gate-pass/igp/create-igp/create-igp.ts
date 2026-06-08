import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { BaseDocumentModalComponent } from '../../base-document-modal/base-document-modal';
import { OpenBaseDocument } from '../../open-base-documents.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import {
  createEmptyIgpLineItem,
  IgpAddPayload,
  IgpLineItem,
  IgpRecord,
  IgpService,
} from '../igp.service';

function emptyIfDash(value: string): string {
  return value === '—' ? '' : value;
}

@Component({
  selector: 'app-create-igp',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseDocumentModalComponent],
  templateUrl: './create-igp.html',
  styleUrl: './create-igp.css',
})
export class CreateIgpComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add IGP';
  submitButtonLabel = 'Save IGP';

  type = 'Purchase Order';
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
  lines: IgpLineItem[] = [];
  remarks = '';

  /** After a base document is chosen, header fields (except employee) are read-only. */
  headerLocked = false;

  showBaseDocModal = false;

  readonly typeOptions = ['Purchase Order', 'Sales Return Request', 'Stand Alone Documents'] as const;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly igpService: IgpService,
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
    this.pageTitle = 'Update IGP';
    this.submitButtonLabel = 'Update IGP';

    this.igpService.fetchInwardGatePassDetail(editId).subscribe({
      next: (record) => {
        this.populateFromRecord(record);
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load IGP for edit.'),
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
    this.lines = [...this.lines, createEmptyIgpLineItem()];
  }

  removeLine(index: number): void {
    this.lines = this.lines.filter((_, i) => i !== index);
  }

  back(): void {
    void this.router.navigateByUrl('/gate-pass/igp');
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
    this.referenceNo = '';
    this.businessPartnerCode = '';
    this.businessPartnerName = '';
    this.vehicleNo = '';
    this.fromUnit = '';
    this.kantaSlip = '';
    this.department = '';
    this.biltyNo = '';
    this.store = '';
    this.freight = '';
    this.weightMachineName = '';
    this.weight = '';
    this.location = '';
    this.remarks = '';
    this.lines = [];
    this.employee = '';
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

  private applyBaseDocument(doc: OpenBaseDocument): void {
    this.headerLocked = true;
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

    if (!this.editingId && !this.baseDocNo?.trim()) {
      void this.alertService.validation('Please choose a base document using the Base document button.');
      return;
    }

    if (this.lines.length === 0) {
      void this.alertService.validation('At least one line item is required.');
      return;
    }

    const payload = this.buildPayload();
    const request$ = this.editingId
      ? this.igpService.updateInwardGatePass(this.editingId, payload)
      : this.igpService.addInwardGatePass(payload);

    request$.subscribe({
      next: async (response) => {
        if (response?.status === false || response?.success === false) {
          const fallback = this.editingId ? 'Failed to update IGP.' : 'Failed to save IGP.';
          this.alertService.error('Error', response.message || fallback);
          return;
        }

        const title = this.editingId ? 'Updated' : 'Success';
        const message = this.editingId
          ? response?.message || 'IGP record updated successfully.'
          : response?.message || 'IGP record saved successfully.';
        await this.alertService.successAndWait(title, message);
        this.igpService.fetchInwardGatePasses().subscribe();
        this.back();
      },
      error: (error: unknown) => {
        const fallback = this.editingId ? 'Failed to update IGP.' : 'Failed to save IGP.';
        this.alertService.error('Error', formatApiErrorMessage(error, fallback));
      },
    });
  }

  private populateFromRecord(record: IgpRecord): void {
    this.type = emptyIfDash(record.type) || 'Purchase Order';
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

  private buildPayload(): IgpAddPayload {
    const referenceNo =
      this.referenceNo.trim() ||
      `IGP-${new Date().getFullYear()}-${String(this.igpService.records().length + 1).padStart(3, '0')}`;

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
