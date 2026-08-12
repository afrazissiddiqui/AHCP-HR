import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../services/alert.service';
import { ApplicationFormService } from '../../../services/application-form.service';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';

interface WithholdingTaxEmployeeOption {
  code: string;
  name: string;
  department: string;
  branch: string;
}

interface TaxBracketRow {
  lowerLimit: number | null;
  upperLimit: number | null;
  rate: number | null;
  amount: number | null;
}

@Component({
  selector: 'app-withholding-tax',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './withholding-tax.html',
  styleUrls: ['./withholding-tax.css'],
})
export class WithholdingTaxComponent {
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly alertService = inject(AlertService);

  readonly employeeId = signal('');
  readonly employeeName = signal('');
  readonly department = signal('');
  readonly branch = signal('');
  readonly idSuggestionsOpen = signal(false);
  readonly nameSuggestionsOpen = signal(false);
  readonly employeeOptions = signal<WithholdingTaxEmployeeOption[]>([]);
  readonly taxBrackets = signal<TaxBracketRow[]>([]);

  readonly idSuggestions = computed(() => this.filterEmployeeSuggestions(this.employeeId()));
  readonly nameSuggestions = computed(() => this.filterEmployeeSuggestions(this.employeeName()));

  ngOnInit(): void {
    if (this.applicationFormService.getApplicationRecords().length > 0) {
      this.employeeOptions.set(this.buildEmployeeOptions());
      return;
    }

    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: () => {
        this.employeeOptions.set(this.buildEmployeeOptions());
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          String(error) || 'Unable to load employee data.',
        );
      },
    });
  }

  toggleSidebar(): void {
    // Sidebar toggle handled by parent layout if present.
  }

  addTaxBracket(): void {
    this.taxBrackets.update((rows) => [
      ...rows,
      { lowerLimit: null, upperLimit: null, rate: null, amount: null },
    ]);
  }

  removeTaxBracket(index: number): void {
    this.taxBrackets.update((rows) => rows.filter((_, idx) => idx !== index));
  }

  trackByTaxBracket(index: number): number {
    return index;
  }

  updateBracket(index: number, field: keyof TaxBracketRow, value: string): void {
    const numeric = value === '' ? null : Number(value);
    this.taxBrackets.update((rows) =>
      rows.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]: Number.isFinite(numeric) ? numeric : null,
            }
          : row,
      ),
    );
  }

  taxRateLabel(row: TaxBracketRow): string {
    if (row.lowerLimit === null && row.upperLimit === null) {
      return '—';
    }

    const lowerText = row.lowerLimit !== null ? row.lowerLimit.toLocaleString() : '0';
    const upperText = row.upperLimit !== null ? row.upperLimit.toLocaleString() : '—';
    const rateText = row.rate !== null ? `${row.rate}%` : '0%';
    const amountText = row.amount !== null ? row.amount.toLocaleString() : '0';

    return `amount ${amountText} & Rate ${rateText} on value > ${lowerText} & Less then < ${upperText}`;
  }

  onEmployeeIdInput(value: string): void {
    this.employeeId.set(value);
    this.idSuggestionsOpen.set(value.trim().length > 0);
    this.closeNameSuggestions();
  }

  onEmployeeNameInput(value: string): void {
    this.employeeName.set(value);
    this.nameSuggestionsOpen.set(value.trim().length > 0);
    this.closeIdSuggestions();
  }

  selectEmployee(employee: WithholdingTaxEmployeeOption): void {
    this.employeeId.set(employee.code);
    this.employeeName.set(employee.name);
    this.department.set(employee.department);
    this.branch.set(employee.branch);
    this.closeIdSuggestions();
    this.closeNameSuggestions();
  }

  openIdSuggestions(): void {
    if (this.employeeId().trim()) {
      this.idSuggestionsOpen.set(true);
      this.closeNameSuggestions();
    }
  }

  openNameSuggestions(): void {
    if (this.employeeName().trim()) {
      this.nameSuggestionsOpen.set(true);
      this.closeIdSuggestions();
    }
  }

  closeIdSuggestions(): void {
    this.idSuggestionsOpen.set(false);
  }

  closeNameSuggestions(): void {
    this.nameSuggestionsOpen.set(false);
  }

  onIdBlur(): void {
    setTimeout(() => this.closeIdSuggestions(), 150);
  }

  onNameBlur(): void {
    setTimeout(() => this.closeNameSuggestions(), 150);
  }

  private filterEmployeeSuggestions(query: string): WithholdingTaxEmployeeOption[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return this.employeeOptions()
      .filter(
        (employee) =>
          employee.code.toLowerCase().includes(normalized) ||
          employee.name.toLowerCase().includes(normalized) ||
          employee.department.toLowerCase().includes(normalized) ||
          employee.branch.toLowerCase().includes(normalized),
      )
      .slice(0, 10);
  }

  private buildEmployeeOptions(): WithholdingTaxEmployeeOption[] {
    return this.applicationFormService.getApplicationRecords().map((record) => ({
      code: String(record.EmployeeCode),
      name: record.EmployeeName,
      department: record.Department,
      branch: record.detail?.personalInfo?.branchLocation || record.detail?.requisition?.location || '',
    }));
  }
}
