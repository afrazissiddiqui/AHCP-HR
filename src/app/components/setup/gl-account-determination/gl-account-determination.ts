import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import {
  GlAccountDeterminationAddPayload,
  GlAccountDeterminationRecord,
  GlAccountDeterminationService,
} from '../../../services/gl-account-determination.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';

export type GlAccountDeterminationRow = {
  id: string;
  glItemType: string;
  salaryGlAccountCode: string;
  salaryGlAccountName: string;
  branch: string;
};

export const GL_ACCOUNT_BRANCH_OPTIONS = [
  'AHCP_Peshawar',
  'AHCP_HO',
  'AHCP_Faisalabad',
] as const;

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
  };
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
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly loadingList = signal(false);
  readonly savedRecords = signal<GlAccountDeterminationRecord[]>([]);

  rows: GlAccountDeterminationRow[] = [emptyRow()];

  ngOnInit(): void {
    this.loadSavedRecords();
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
    return null;
  }

  private toPayload(row: GlAccountDeterminationRow): GlAccountDeterminationAddPayload {
    return {
      type: row.glItemType.trim(),
      code: row.salaryGlAccountCode.trim(),
      name: row.salaryGlAccountName.trim(),
      branch: row.branch,
    };
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
