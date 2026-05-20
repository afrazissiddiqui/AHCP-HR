import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { BaseDocumentModalComponent } from '../../base-document-modal/base-document-modal';
import { BaseDocLinePayload, OpenBaseDocument } from '../../open-base-documents.service';
import { AgpLineItem, AgpService, createEmptyAgpLineItem } from '../agp.service';

@Component({
  selector: 'app-create-agp',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseDocumentModalComponent],
  templateUrl: './create-agp.html',
  styleUrl: '../../igp/create-igp/create-igp.css',
})
export class CreateAgpComponent {
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

  readonly typeOptions = ['Purchase Order', 'Sales Return Request', 'Stand Alone Documents'] as const;

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

  constructor(
    private readonly router: Router,
    private readonly agpService: AgpService,
    private readonly alertService: AlertService
  ) {
    const d = new Date();
    this.documentDate = d.toISOString().slice(0, 10);
  }

  get totalQtySent(): number {
    return this.lines.reduce((s, l) => s + (Number(l.qtySent) || 0), 0);
  }

  get totalQtyReceived(): number {
    return this.lines.reduce((s, l) => s + (Number(l.qtyReceived) || 0), 0);
  }

  trackByIndex(index: number): number {
    return index;
  }

  addLine(): void {
    this.lines = [...this.lines, createEmptyAgpLineItem()];
  }

  removeLine(index: number): void {
    this.lines = this.lines.filter((_, i) => i !== index);
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
    this.resetAfterTypeOrClearBaseDoc();
  }

  clearBaseDocumentSelection(): void {
    this.resetAfterTypeOrClearBaseDoc();
  }

  private resetAfterTypeOrClearBaseDoc(): void {
    this.headerLocked = false;
    this.baseDocNo = '';
    this.referenceNo = '';
    this.businessPartnerCode = '';
    this.businessPartnerName = '';
    this.vehicleNo = '';
    this.remarks = '';
    this.lines = [];
    const d = new Date();
    this.documentDate = d.toISOString().slice(0, 10);
  }

  openBaseDocumentModal(): void {
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
    };
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
    this.requestingDepartment = doc.department?.trim() ?? '';
    this.biltyNo = doc.biltyNo?.trim() ?? '';
    const freightParsed = parseFloat(String(doc.freight ?? '').replace(/[^\d.]/g, ''));
    this.freightAmount = Number.isFinite(freightParsed) ? freightParsed : null;
    this.remarks = doc.remarks?.trim() ?? '';
    this.lines = doc.lines?.map(l => this.mapBaseDocLine(l)) ?? [];
  }

  submitForm(): void {
    if (
      !this.type?.trim() ||
      !this.documentDate?.trim() ||
      !this.requestingDepartment?.trim() ||
      !this.businessPartnerName?.trim()
    ) {
      void this.alertService.validation(
        'Please select Type, choose a base document, and ensure required header data is present.'
      );
      return;
    }

    if (!this.baseDocNo?.trim()) {
      void this.alertService.validation('Please choose a base document using the Base document button.');
      return;
    }

    if (this.lines.length === 0) {
      void this.alertService.validation('The base document must include at least one line item.');
      return;
    }

    const ref =
      this.referenceNo.trim() ||
      `AGP-${new Date().getFullYear()}-${String(this.agpService.records().length + 1).padStart(3, '0')}`;

    this.agpService.addAgp({
      referenceNo: ref,
      title: this.businessPartnerName.trim(),
      requestingDepartment: this.requestingDepartment.trim(),
      status: this.headOfSupplyChainApproval ? 'Approved' : 'Pending',
      submittedDate: this.documentDate,
      remarks: this.remarks.trim() || undefined,
      type: this.type,
      businessPartnerCode: this.businessPartnerCode.trim(),
      baseDocNo: this.baseDocNo.trim(),
      businessPartnerName: this.businessPartnerName.trim(),
      vehicleNo: this.vehicleNo.trim(),
      reasonForMovement: this.reasonForMovement.trim(),
      requestingEmployee: this.requestingEmployee.trim(),
      requestedBy: this.requestedBy.trim(),
      issuedTo: this.issuedTo.trim(),
      articleOutDate: this.articleOutDate.trim(),
      articleReturnedDate: this.articleReturnedDate.trim(),
      transporterName: this.transporterName.trim(),
      transporterCnic: this.transporterCnic.trim(),
      transporterPhone: this.transporterPhone.trim(),
      biltyNo: this.biltyNo.trim(),
      freightAmount: Number(this.freightAmount) || 0,
      attachmentFileName: this.attachmentFileName.trim() || undefined,
      headOfSupplyChainApproval: this.headOfSupplyChainApproval,
      lines: this.lines.map(l => ({
        ...l,
        qtySent: Number(l.qtySent) || 0,
        qtyReceived: Number(l.qtyReceived) || 0,
      })),
      totalQtySent: this.totalQtySent,
      totalQtyReceived: this.totalQtyReceived,
    });

    void this.alertService.success('Success', 'AGP record saved successfully.');
    this.back();
  }
}
