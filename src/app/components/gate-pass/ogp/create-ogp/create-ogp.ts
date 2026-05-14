import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { createEmptyOgpLineItem, OgpLineItem, OgpService } from '../ogp.service';

@Component({
  selector: 'app-create-ogp',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  status = 'Draft';
  lines: OgpLineItem[] = [];
  remarks = '';

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

  submitForm(): void {
    if (!this.type?.trim() || !this.documentDate?.trim() || !this.department?.trim() || !this.businessPartnerName?.trim()) {
      void this.alertService.validation('Please enter Type, Date, Department, and Business Partner Name at minimum.');
      return;
    }

    const ref =
      this.referenceNo.trim() ||
      `OGP-${new Date().getFullYear()}-${String(this.ogpService.records().length + 1).padStart(3, '0')}`;

    this.ogpService.addOgp({
      referenceNo: ref,
      title: this.businessPartnerName.trim(),
      department: this.department.trim(),
      status: this.status || 'Draft',
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
