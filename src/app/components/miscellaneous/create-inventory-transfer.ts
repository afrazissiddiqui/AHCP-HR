import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  createEmptyMiscellaneousHeader,
  createEmptyMiscellaneousLine,
  MiscellaneousHeaderForm,
  MiscellaneousLineRow,
  updateMiscellaneousLine,
} from './miscellaneous-document.model';

@Component({
  selector: 'app-create-inventory-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-inventory-transfer.html',
  styleUrls: ['./miscellaneous-form.css'],
})
export class CreateInventoryTransferComponent {
  private readonly router = inject(Router);

  readonly headerForm = signal<MiscellaneousHeaderForm>(createEmptyMiscellaneousHeader());
  readonly contentLines = signal<MiscellaneousLineRow[]>([createEmptyMiscellaneousLine()]);
  readonly attachmentLines = signal<MiscellaneousLineRow[]>([createEmptyMiscellaneousLine()]);

  back(): void {
    void this.router.navigate(['/miscellaneous/inventory-transfer']);
  }

  updateHeaderField(field: keyof MiscellaneousHeaderForm, value: string): void {
    this.headerForm.update((state) => ({ ...state, [field]: value }));
  }

  addContentLine(): void {
    this.contentLines.update((rows) => [...rows, createEmptyMiscellaneousLine()]);
  }

  addAttachmentLine(): void {
    this.attachmentLines.update((rows) => [...rows, createEmptyMiscellaneousLine()]);
  }

  updateContentLine(index: number, field: keyof MiscellaneousLineRow, value: string): void {
    this.contentLines.update((rows) => updateMiscellaneousLine(rows, index, field, value));
  }

  updateAttachmentLine(index: number, field: keyof MiscellaneousLineRow, value: string): void {
    this.attachmentLines.update((rows) => updateMiscellaneousLine(rows, index, field, value));
  }

  save(): void {
    void this.router.navigate(['/miscellaneous/inventory-transfer']);
  }
}
