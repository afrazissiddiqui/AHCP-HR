import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { BaseDocumentModalComponent } from '../../base-document-modal/base-document-modal';
import { OpenBaseDocument } from '../../open-base-documents.service';
import { createEmptyOgpLineItem, OgpLineItem, OgpService } from '../ogp.service';

@Component({
  selector: 'app-create-ogp',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseDocumentModalComponent],
  templateUrl: './create-ogp.html',
  styleUrl: '../../igp/create-igp/create-igp.css',
})
export class CreateOgpComponent {
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
  lines: OgpLineItem[] = [];
  remarks = '';

  /** After a base document is chosen, header fields (except employee) are read-only. */
  headerLocked = false;

  showBaseDocModal = false;

  readonly typeOptions = ['Purchase Order', 'Sales Return Request', 'Stand Alone Documents'] as const;

  constructor(
    private readonly router: Router,
    private readonly ogpService: OgpService,
    private readonly alertService: AlertService
  ) {
    const d = new Date();
    this.documentDate = d.toISOString().slice(0, 10);
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
      doc.lines?.map(l => ({
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
      void this.alertService.validation('Please select Type, choose a base document, and ensure required header data is present.');
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
      `OGP-${new Date().getFullYear()}-${String(this.ogpService.records().length + 1).padStart(3, '0')}`;

    this.ogpService.addOgp({
      referenceNo: ref,
      title: this.businessPartnerName.trim(),
      department: this.department.trim(),
      status: 'Pending',
      submittedDate: this.documentDate,
      remarks: this.remarks.trim() || undefined,
      type: this.type,
      businessPartnerCode: this.businessPartnerCode.trim(),
      baseDocNo: this.baseDocNo.trim(),
      businessPartnerName: this.businessPartnerName.trim(),
      vehicleNo: this.vehicleNo.trim(),
      fromUnit: this.fromUnit.trim(),
      kantaSlip: this.kantaSlip.trim(),
      biltyNo: this.biltyNo.trim(),
      store: this.store.trim(),
      freight: this.freight.trim(),
      weightMachineName: this.weightMachineName.trim(),
      weight: this.weight.trim(),
      location: this.location,
      employee: this.employee.trim(),
      lines: this.lines.map(l => ({
        ...l,
        qty: Number(l.qty) || 0,
      })),
      totalQty: this.totalQty,
    });

    void this.alertService.success('Success', 'OGP record saved successfully.');
    this.back();
  }
}
