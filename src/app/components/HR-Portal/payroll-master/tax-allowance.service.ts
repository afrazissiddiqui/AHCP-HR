import { computed, Injectable, signal } from '@angular/core';

export interface TaxAllowanceRow {
  key: string;
  label: string;
  enabled: boolean;
  glCode: string;
}

export const TAX_ALLOWANCE_FIELD_DEFS: Array<{ key: string; label: string }> = [
  { key: 'basicSalary', label: 'Basic Salary' },
  { key: 'medicalAllowance', label: 'Medical Allowance' },
  { key: 'fuelAllowance', label: 'Fuel Allowance' },
  { key: 'mobileAllowance', label: 'Mobile Allowance' },
  { key: 'carAllowance', label: 'Car Allowance' },
  { key: 'otherAllowances', label: 'Other Allowances' },
  { key: 'overtime', label: 'Overtime' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'arrears', label: 'Arrears' },
  { key: 'providentFund', label: 'Provident Fund' },
  { key: 'gratuity', label: 'Gratuity' },
  { key: 'eobi', label: 'EOBI' },
  { key: 'loanInstallment', label: 'Loan Installment' },
  { key: 'otherDeductions', label: 'Other Deductions' },
  { key: 'netPayable', label: 'Net Payable' },
];

@Injectable({ providedIn: 'root' })
export class TaxAllowanceService {
  private readonly rowsSignal = signal<TaxAllowanceRow[]>(
    TAX_ALLOWANCE_FIELD_DEFS.map((field) => ({
      ...field,
      enabled: false,
      glCode: '',
    })),
  );

  readonly rows = this.rowsSignal.asReadonly();

  readonly enabledKeySet = computed(
    () => new Set(this.rowsSignal().filter((r) => r.enabled).map((r) => r.key)),
  );

  setEnabled(key: string, enabled: boolean): void {
    this.rowsSignal.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, enabled } : row)),
    );
  }

  setGlCode(key: string, glCode: string): void {
    this.rowsSignal.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, glCode } : row)),
    );
  }

  isEnabled(key: string): boolean {
    return this.enabledKeySet().has(key);
  }
}
