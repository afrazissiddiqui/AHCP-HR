import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import {
  ApplicationFormAttachmentMeta,
  ApplicationFormRecord,
  ApplicationFormRemuneration,
  ApplicationFormService,
} from '../../../../services/application-form.service';
import { displayDateOnly } from '../../../../utils/date-format.util';

@Component({
  selector: 'app-application-detail-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './application-detail-dialog.html',
  styleUrl: '../Application-Form.css',
})
export class ApplicationDetailDialogComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly record = input<ApplicationFormRecord | null>(null);

  readonly closed = output<void>();

  private readonly applicationFormService = inject(ApplicationFormService);

  close(): void {
    this.closed.emit();
  }

  displayDash(value: string | number | undefined | null): string {
    if (value === undefined || value === null) {
      return '—';
    }
    const s = String(value).trim();
    return s === '' ? '—' : s;
  }

  resolveAttachmentFor(attachment: ApplicationFormAttachmentMeta): string {
    return this.applicationFormService.resolveAttachmentForLabel(attachment);
  }

  displayMaximumLoanCapacity(remuneration: ApplicationFormRemuneration): string {
    const value =
      remuneration.loanAmountAllowed?.trim() || remuneration.maximumLoanCapacity?.trim() || '';
    return this.displayDash(value);
  }

  displayDate(value: string | number | undefined | null): string {
    return displayDateOnly(value);
  }

  maskedPassword(password: string | undefined): string {
    if (!password || !String(password).trim()) {
      return '—';
    }
    return '••••••••';
  }
}
