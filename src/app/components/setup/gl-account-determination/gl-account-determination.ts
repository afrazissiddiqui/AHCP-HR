import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import {
  GlAccountDeterminationAddPayload,
  GlAccountOption,
  GlAccountDeterminationRecord,
  GlAccountDeterminationService,
} from '../../../services/gl-account-determination.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import {
  GL_ACCOUNT_BRANCH_OPTIONS,
  glAccountBranchCode,
} from './gl-account-branch.options';

export type GlAccountDeterminationRow = {
  id: string;
  glItemType: string;
  salaryGlAccountCode: string;
  salaryGlAccountName: string;
  branch: string;
  debitCreditType: string;
};

export const GL_ACCOUNT_DEBIT_CREDIT_OPTIONS = ['Debit', 'Credit'] as const;

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyRow(): GlAccountDeterminationRow {
  return {
    id: newId(),
    glItemType: '',
    salaryGlAccountCode: '',
    salaryGlAccountName: '',
    branch: '',
    debitCreditType: '',
  };
}

function debitCreditLabel(value: string): string {
  return value.trim().toLowerCase() === 'credit' ? 'Credit' : 'Debit';
}

@Component({
  selector: 'app-gl-account-determination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gl-account-determination.html',
  styleUrl: './gl-account-determination.css',
})
export class GlAccountDeterminationComponent implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly glAccountService = inject(GlAccountDeterminationService);

  readonly branchOptions = GL_ACCOUNT_BRANCH_OPTIONS;
  readonly debitCreditOptions = GL_ACCOUNT_DEBIT_CREDIT_OPTIONS;
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly loadingList = signal(false);
  readonly loadingAccountOptions = signal(false);
  readonly accountOptions = signal<GlAccountOption[]>([]);
  readonly openAccountSearch = signal<{ rowId: string; field: 'code' | 'name' } | null>(null);
  readonly accountSearchPosition = signal({ top: 0, left: 0, width: 0 });
  readonly savedRecords = signal<GlAccountDeterminationRecord[]>([]);
  readonly editingId = signal<number | null>(null);

  rows: GlAccountDeterminationRow[] = [emptyRow()];

  ngOnInit(): void {
    this.loadAccountOptions();
    this.loadSavedRecords();
  }

  accountOptionsFor(row: GlAccountDeterminationRow, field: 'code' | 'name'): GlAccountOption[] {
    const query = (field === 'code' ? row.salaryGlAccountCode : row.salaryGlAccountName)
      .trim()
      .toLowerCase();
    const options = this.accountOptions();
    if (!query) {
      return options;
    }
    return options.filter((option) =>
      `${option.code} ${option.name}`.toLowerCase().includes(query),
    );
  }

  accountSearchIsOpen(rowId: string, field: 'code' | 'name'): boolean {
    const openSearch = this.openAccountSearch();
    return openSearch?.rowId === rowId && openSearch.field === field;
  }

  openAccountSearchAt(rowId: string, field: 'code' | 'name', event: FocusEvent): void {
    const input = event.currentTarget as HTMLInputElement;
    const bounds = input.getBoundingClientRect();
    this.accountSearchPosition.set({
      top: bounds.bottom + 4,
      left: bounds.left,
      width: bounds.width,
    });
    this.openAccountSearch.set({ rowId, field });
  }

  updateAccountSearch(row: GlAccountDeterminationRow, field: 'code' | 'name', value: string): void {
    if (field === 'code') {
      row.salaryGlAccountCode = value;
    } else {
      row.salaryGlAccountName = value;
    }

    const normalizedValue = value.trim().toLowerCase();
    const selected = this.accountOptions().find((option) =>
      (field === 'code' ? option.code : option.name).trim().toLowerCase() === normalizedValue,
    );
    if (selected) {
      row.salaryGlAccountCode = selected.code;
      row.salaryGlAccountName = selected.name;
    }
    this.openAccountSearch.set({ rowId: row.id, field });
  }

  selectAccount(row: GlAccountDeterminationRow, option: GlAccountOption): void {
    row.salaryGlAccountCode = option.code;
    row.salaryGlAccountName = option.name;
    this.openAccountSearch.set(null);
  }

  closeAccountSearchSoon(): void {
    setTimeout(() => this.openAccountSearch.set(null), 150);
  }

  addRow(): void {
    this.rows = [...this.rows, emptyRow()];
  }

  removeRow(rowId: string): void {
    if (this.rows.length <= 1) {
      this.alertService.validation('At least one row is required.');
      return;
    }
    this.rows = this.rows.filter((row) => row.id !== rowId);
  }

  submitForm(): void {
    if (this.saving()) {
      return;
    }

    for (let index = 0; index < this.rows.length; index++) {
      const validationError = this.validateRow(this.rows[index], this.savedRecords().length + index + 1);
      if (validationError) {
        this.alertService.validation(validationError);
        return;
      }
    }

    const editingId = this.editingId();
    if (editingId !== null) {
      this.updateRecord(editingId, this.rows[0]);
      return;
    }

    this.persistRowsSequentially([...this.rows], 0, () => {
      this.alertService.success(
        'Submitted',
        `GL Account Determination saved with ${this.rows.length} row(s).`,
      );
      this.rows = [emptyRow()];
      this.loadSavedRecords();
    });
  }

  formRowSrNo(index: number): number {
    return this.savedRecords().length + index + 1;
  }

  editRecord(record: GlAccountDeterminationRecord): void {
    if (this.saving() || this.deleting()) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Edit', 'Unable to edit this row: missing record id.');
      return;
    }

    this.editingId.set(record.Id);
    this.rows = [
      {
        id: newId(),
        glItemType: record.Type,
        salaryGlAccountCode: record.Code,
        salaryGlAccountName: record.Name,
        branch: record.Branch,
        debitCreditType: debitCreditLabel(record.DebitCreditType),
      },
    ];
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.rows = [emptyRow()];
  }

  async deleteRecord(record: GlAccountDeterminationRecord): Promise<void> {
    if (this.deleting() || this.saving()) {
      return;
    }

    if (!record.Id) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing record id.');
      return;
    }

    const result = await this.alertService.confirm(
      'Delete GL account determination?',
      `Remove ${record.Type} (${record.Code}) from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    this.deleting.set(true);
    this.glAccountService
      .deleteGlAccountDetermination(record.Id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => {
          this.alertService.success('Deleted', 'GL Account Determination removed successfully.');
          this.loadSavedRecords();
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Delete Failed',
            formatApiErrorMessage(error, 'Failed to delete GL Account Determination.'),
          );
        },
      });
  }

  private loadSavedRecords(): void {
    this.loadingList.set(true);
    this.glAccountService
      .fetchGlAccountDeterminations()
      .pipe(finalize(() => this.loadingList.set(false)))
      .subscribe({
        next: (records) => {
          this.savedRecords.set(records);
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load GL Account Determination list.'),
          );
        },
      });
  }

  private loadAccountOptions(): void {
    this.loadingAccountOptions.set(true);
    this.glAccountService
      .fetchGlAccountOptions()
      .pipe(finalize(() => this.loadingAccountOptions.set(false)))
      .subscribe({
        next: (options) => this.accountOptions.set(options),
        error: (error: unknown) => {
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load Salary G/L Account options.'),
          );
        },
      });
  }

  private validateRow(row: GlAccountDeterminationRow, srNo: number): string | null {
    if (!row.glItemType.trim()) {
      return `Row ${srNo}: enter G/L Item Types.`;
    }
    if (!row.salaryGlAccountCode.trim()) {
      return `Row ${srNo}: enter Salary G/L Account Codes.`;
    }
    if (!row.salaryGlAccountName.trim()) {
      return `Row ${srNo}: enter Salary G/L Account Names.`;
    }
    if (!row.branch) {
      return `Row ${srNo}: select Branches.`;
    }
    if (!row.debitCreditType) {
      return `Row ${srNo}: select Debit / Credit.`;
    }
    return null;
  }

  private toPayload(row: GlAccountDeterminationRow): GlAccountDeterminationAddPayload {
    return {
      type: row.glItemType.trim(),
      code: row.salaryGlAccountCode.trim(),
      name: row.salaryGlAccountName.trim(),
      branch: glAccountBranchCode(row.branch),
      debit_credit_type: row.debitCreditType.trim().toUpperCase(),
    };
  }

  private updateRecord(id: number, row: GlAccountDeterminationRow): void {
    this.saving.set(true);
    this.glAccountService
      .updateGlAccountDetermination(id, this.toPayload(row))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.alertService.success('Updated', 'GL Account Determination updated successfully.');
          this.editingId.set(null);
          this.rows = [emptyRow()];
          this.loadSavedRecords();
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Update Failed',
            formatApiErrorMessage(error, 'Failed to update GL Account Determination.'),
          );
        },
      });
  }

  private persistRowsSequentially(
    rows: GlAccountDeterminationRow[],
    index: number,
    onComplete: () => void,
  ): void {
    if (index >= rows.length) {
      this.saving.set(false);
      onComplete();
      return;
    }

    if (index === 0) {
      this.saving.set(true);
    }

    this.glAccountService.addGlAccountDetermination(this.toPayload(rows[index])).subscribe({
      next: () => {
        this.persistRowsSequentially(rows, index + 1, onComplete);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        void this.alertService.error(
          'Save Failed',
          formatApiErrorMessage(error, 'Failed to save GL Account Determination row.'),
        );
      },
    });
  }
}
