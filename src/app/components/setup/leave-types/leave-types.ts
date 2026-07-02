import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { LeaveTypePayload, LeaveTypeRecord, LeaveTypeService } from '../../../services/leave-type.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';

type LeaveTypeFormMode = 'add' | 'edit';

@Component({
  selector: 'app-leave-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-types.html',
  styleUrl: './leave-types.css',
})
export class LeaveTypesComponent implements OnInit {
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly leaveTypes = signal<LeaveTypeRecord[]>([]);
  readonly formMode = signal<LeaveTypeFormMode>('add');
  readonly editingId = signal<string | number | null>(null);
  readonly formName = signal('');
  readonly formDescription = signal('');
  readonly totalLeaveTypes = computed(() => this.leaveTypes().length);

  ngOnInit(): void {
    this.loadLeaveTypes();
  }

  loadLeaveTypes(): void {
    this.loading.set(true);
    this.leaveTypeService
      .fetchLeaveTypes()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (records) => {
          this.leaveTypes.set(records);
          if (this.formMode() !== 'edit') {
            this.resetForm();
          }
        },
        error: (error: unknown) => {
          this.leaveTypes.set([]);
          this.resetForm();
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load leave types.'),
          );
        },
      });
  }

  formTitle(): string {
    return this.formMode() === 'edit' ? 'Update Leave Type' : 'Add Leave Type';
  }

  submitLeaveType(): void {
    if (this.saving()) {
      return;
    }

    const payload = this.buildPayload();
    if (!payload.name.trim()) {
      this.alertService.validation('Name is required.');
      return;
    }
    if (!payload.description.trim()) {
      this.alertService.validation('Description is required.');
      return;
    }

    this.saving.set(true);
    const request =
      this.formMode() === 'edit'
        ? this.leaveTypeService.updateLeaveType(payload)
        : this.leaveTypeService.addLeaveType(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.alertService.success(
          'Saved',
          this.formMode() === 'edit' ? 'Leave type updated successfully.' : 'Leave type added successfully.',
        );
        this.loadLeaveTypes();
        this.resetForm();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Save Failed',
          formatApiErrorMessage(
            error,
            `Failed to ${this.formMode() === 'edit' ? 'update' : 'add'} leave type.`,
          ),
        );
      },
    });
  }

  startEdit(record: LeaveTypeRecord): void {
    const id = this.resolveId(record);
    if (id === null) {
      this.alertService.warning('Edit', 'Unable to edit this row: missing leave type id.');
      return;
    }

    this.loading.set(true);
    this.leaveTypeService
      .fetchLeaveTypeDetail(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => {
          this.formMode.set('edit');
          this.editingId.set(id);
          this.formName.set(detail.name || this.valueToText(record.name));
          this.formDescription.set(detail.description || this.valueToText(record.description));
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load leave type detail.'),
          );
        },
      });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async deleteLeaveType(record: LeaveTypeRecord): Promise<void> {
    if (this.deleting() || this.saving()) {
      return;
    }

    const id = this.resolveId(record);
    if (id === null) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing leave type id.');
      return;
    }

    const label = this.valueToText(record.name) || this.valueToText(record.code) || `ID ${id}`;
    const result = await this.alertService.confirm('Delete leave type?', `Remove ${label} from the list?`);
    if (!result.isConfirmed) {
      return;
    }

    this.deleting.set(true);
    this.leaveTypeService
      .deleteLeaveType(id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => {
          this.alertService.success('Deleted', 'Leave type removed successfully.');
          if (this.editingId() === id) {
            this.resetForm();
          }
          this.loadLeaveTypes();
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Delete Failed',
            formatApiErrorMessage(error, 'Failed to delete leave type.'),
          );
        },
      });
  }

  cellValue(record: LeaveTypeRecord, field: 'name' | 'code' | 'description' | 'status'): string {
    const value = record[field];
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (field === 'status') {
      return String(value) === '1' ? 'Active' : String(value) === '3' ? 'Inactive' : String(value);
    }
    return String(value);
  }

  private buildPayload(): LeaveTypePayload {
    const name = this.formName().trim();
    const description = this.formDescription().trim();
    const payload: LeaveTypePayload = {
      name,
      code: name,
      description,
      status: 1,
    };

    if (this.formMode() === 'edit' && this.editingId() !== null) {
      payload.id = this.editingId() as string | number;
    }

    return payload;
  }

  private resolveId(record: LeaveTypeRecord): string | number | null {
    const value = record.id;
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }
    return typeof value === 'number' ? value : String(value).trim();
  }

  private resetForm(): void {
    this.formMode.set('add');
    this.editingId.set(null);
    this.formName.set('');
    this.formDescription.set('');
  }

  private valueToText(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }
}
