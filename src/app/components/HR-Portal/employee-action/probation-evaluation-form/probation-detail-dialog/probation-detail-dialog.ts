import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  ProbationEvaluationRecord,
  ProbationRatingItem,
} from '../../../../../services/probation-evaluation.service';
import { displayDateOnly } from '../../../../../utils/date-format.util';

type RatingKey =
  | 'communication_skills'
  | 'technical_skills'
  | 'attendance'
  | 'discipline'
  | 'teamwork'
  | 'productivity';

@Component({
  selector: 'app-probation-detail-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './probation-detail-dialog.html',
  styleUrl: '../../../Application-Form/Application-Form.css',
})
export class ProbationDetailDialogComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly record = input<ProbationEvaluationRecord | null>(null);

  readonly closed = output<void>();

  protected readonly ratingParameters: Array<{ key: RatingKey; label: string }> = [
    { key: 'communication_skills', label: 'Communication Skills' },
    { key: 'technical_skills', label: 'Technical Skills' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'teamwork', label: 'Teamwork' },
    { key: 'productivity', label: 'Productivity' },
  ];

  close(): void {
    this.closed.emit();
  }

  displayDash(value: string | number | undefined | null): string {
    if (value === undefined || value === null) {
      return '—';
    }
    const text = String(value).trim();
    return text === '' || text === '—' ? '—' : text;
  }

  displayDate(value: string | number | undefined | null): string {
    return displayDateOnly(value);
  }

  displayMoney(value: number | string | undefined | null): string {
    if (value === undefined || value === null || value === '') {
      return '—';
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return this.displayDash(value);
    }
    return numeric.toLocaleString('en-PK', { maximumFractionDigits: 0 });
  }

  displayRating(value: ProbationRatingItem | undefined): string {
    if (!value || !value.rating) {
      return '—';
    }
    return `${value.rating}%`;
  }

  hasExtension(record: ProbationEvaluationRecord): boolean {
    const extension = record.ExtensionOfProbation;
    return Boolean(
      extension?.is_extension_enabled ||
        extension?.extension_period_in_probation?.trim() ||
        extension?.new_probation_end_date?.trim(),
    );
  }

  hasSalaryAdjustment(record: ProbationEvaluationRecord): boolean {
    const salary = record.SalaryAdjustment;
    return Boolean(
      salary?.currentSalary ||
        salary?.adjustmentInSalary ||
        salary?.adjustmentAmountInSalary ||
        salary?.revisedSalary ||
        salary?.effectiveDateOfRevision?.trim(),
    );
  }

  hasAllowances(record: ProbationEvaluationRecord): boolean {
    return (record.Allowances ?? []).some((row) => row.allowance?.trim());
  }
}
