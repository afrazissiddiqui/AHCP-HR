import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { MiscellaneousLayoutService } from '../../miscellaneous/miscellaneous-layout.service';

interface PurchaseRequestHeader {
  requestDate: string;
  postingDate: string;
  dueDate: string;
  branch: string;
  remarks: string;
  selectedBaseOrder: string;
}

interface PurchaseRequestLine {
  itemCode: string;
  itemDescription: string;
  vendor: string;
  requiredDate: string;
  requiredQuantity: number | null;
  infoPrice: number | null;
  discount: number | null;
  taxCode: string;
  department: string;
  uomCode: string;
  warehouse: string;
  quantity: number | null;
  manufacturingDate: string;
  expiryDate: string;
  batchNumber: string;
}

@Component({
  selector: 'app-purchase-request',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './purchase-request.html',
  styleUrls: ['../../sample-inspection-request/sample-inspection-request.css', '../../miscellaneous/miscellaneous-form.css', './purchase-request.css'],
})
export class PurchaseRequestComponent {
  private readonly router = inject(Router);
  protected readonly layout = inject(MiscellaneousLayoutService);

  readonly headerForm = signal<PurchaseRequestHeader>({
    requestDate: '',
    postingDate: '',
    dueDate: '',
    branch: '',
    remarks: '',
    selectedBaseOrder: '',
  });

  readonly contentLines = signal<PurchaseRequestLine[]>([this.createEmptyLine()]);
  readonly saving = signal(false);

  get hasValidLine(): boolean {
    return this.contentLines().some((line) => line.itemCode.trim().length > 0);
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  updateHeaderField<K extends keyof PurchaseRequestHeader>(field: K, value: string): void {
    this.headerForm.update((form) => ({ ...form, [field]: value }));
  }

  updateContentLine(index: number, field: keyof PurchaseRequestLine, value: string | number | null): void {
    this.contentLines.update((lines) =>
      lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  addContentLine(): void {
    this.contentLines.update((lines) => [...lines, this.createEmptyLine()]);
  }

  deleteContentLine(index: number): void {
    this.contentLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  submitPurchaseRequest(): void {
    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
    }, 600);
  }

  createEmptyLine(): PurchaseRequestLine {
    return {
      itemCode: '',
      itemDescription: '',
      vendor: '',
      requiredDate: '',
      requiredQuantity: null,
      infoPrice: null,
      discount: null,
      taxCode: '',
      department: '',
      uomCode: '',
      warehouse: '',
      quantity: null,
      manufacturingDate: '',
      expiryDate: '',
      batchNumber: '',
    };
  }
}
