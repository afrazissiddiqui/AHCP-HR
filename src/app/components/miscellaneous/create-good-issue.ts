import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  createEmptyMiscellaneousHeader,
  createEmptyMiscellaneousLine,
  MiscellaneousHeaderForm,
  MiscellaneousLineRow,
  updateMiscellaneousLine,
} from './miscellaneous-document.model';

@Component({
  selector: 'app-create-good-issue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-good-issue.html',
  styleUrls: ['./miscellaneous-form.css'],
})
export class CreateGoodIssueComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editingId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  readonly pageTitle = computed(() =>
    this.editingId() ? 'Edit Good Issue' : 'Add Good Issue'
  );

  readonly headerForm = signal<MiscellaneousHeaderForm>(createEmptyMiscellaneousHeader());
  readonly contentLines = signal<MiscellaneousLineRow[]>([createEmptyMiscellaneousLine()]);
  readonly attachmentLines = signal<MiscellaneousLineRow[]>([createEmptyMiscellaneousLine()]);

  constructor() {
    const id = this.editingId();
    if (id) {
      this.headerForm.update((state) => ({ ...state, refNumber: id }));
    }
  }

  back(): void {
    void this.router.navigate(['/miscellaneous/good-issue']);
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
    void this.router.navigate(['/miscellaneous/good-issue']);
  }
}
