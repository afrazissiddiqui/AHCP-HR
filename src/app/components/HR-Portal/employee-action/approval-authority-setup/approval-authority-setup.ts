import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../../services/alert.service';

export type ApproverChip = {
  id: string;
  code: string;
  name: string;
  role: string;
};

export type ApprovalLevelRow = {
  id: string;
  approvers: ApproverChip[];
  canApprove: boolean;
  canReject: boolean;
  draftCode: string;
  draftName: string;
  draftRole: string;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

@Component({
  selector: 'app-approval-authority-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-authority-setup.html',
  styleUrl: './approval-authority-setup.css',
})
export class ApprovalAuthoritySetupComponent {
  constructor(private alertService: AlertService) {}

  formTypes: string[] = [
    'Probation Evaluation Form',
    'Training & Development Form',
    'Performance Appraisal Form',
    'Expense Reimbursement Form',
    'Loan / Advance Form',
    'Leave Application Form',
  ];

  /** Maps to "Document Name" in the reference UI. */
  documentName = '';

  /** Each row = one approval level (Sr. #). Multiple approvers per level via chips. */
  levels: ApprovalLevelRow[] = [];

  addApproverLevel(): void {
    this.levels = [
      ...this.levels,
      {
        id: newId(),
        approvers: [],
        canApprove: true,
        canReject: true,
        draftCode: '',
        draftName: '',
        draftRole: '',
      },
    ];
  }

  removeLevel(levelId: string): void {
    this.levels = this.levels.filter((l) => l.id !== levelId);
  }

  addChip(level: ApprovalLevelRow): void {
    const code = level.draftCode.trim();
    const name = level.draftName.trim();
    const role = level.draftRole.trim();

    if (!code || !name) {
      this.alertService.validation('Enter approver code and name before adding.');
      return;
    }

    level.approvers = [
      ...level.approvers,
      {
        id: newId(),
        code,
        name,
        role,
      },
    ];
    level.draftCode = '';
    level.draftName = '';
    level.draftRole = '';
  }

  removeChip(level: ApprovalLevelRow, chipId: string): void {
    level.approvers = level.approvers.filter((c) => c.id !== chipId);
  }

  chipLabel(chip: ApproverChip): string {
    return chip.role ? `${chip.code} - ${chip.name} (${chip.role})` : `${chip.code} - ${chip.name}`;
  }

  submitSetup(): void {
    if (!this.documentName) {
      this.alertService.validation('Please select a document name.');
      return;
    }

    if (this.levels.length === 0) {
      this.alertService.validation('Add at least one approval step using "Add approval step".');
      return;
    }

    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];
      if (level.approvers.length === 0) {
        this.alertService.validation(`Level ${i + 1}: add at least one approver (code + name).`);
        return;
      }
      if (!level.canApprove && !level.canReject) {
        this.alertService.validation(`Level ${i + 1}: enable approve or reject for this level.`);
        return;
      }
    }

    this.alertService.success(
      'Submitted',
      `Approval workflow saved for "${this.documentName}" with ${this.levels.length} level(s).`,
    );
  }
}