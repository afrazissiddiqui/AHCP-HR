import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApplicationFormService } from '../../../../services/application-form.service';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import {
  computeNetPayable,
  PayrollSetupAmounts,
  PayrollSetupRecord,
  PayrollSetupService,
} from '../payroll-setup/payroll-setup.service';
import { PayrollMasterLayoutService } from '../payroll-master-layout.service';
import { TAX_ALLOWANCE_FIELD_DEFS, TaxAllowanceService } from '../tax-allowance.service';

export interface TaxComputationField {
  key: string;
  label: string;
  readonly?: boolean;
}

const TAX_COMPUTATION_FIELDS: TaxComputationField[] = TAX_ALLOWANCE_FIELD_DEFS.map((field) => ({
  ...field,
  readonly: field.key === 'netPayable',
}));

function amountsFromPayrollRecord(record: PayrollSetupRecord): PayrollSetupAmounts {
  return {
    basicSalary: record.basicSalary,
    medicalAllowance: record.medicalAllowance,
    fuelAllowance: record.fuelAllowance,
    mobileAllowance: record.mobileAllowance,
    carAllowance: record.carAllowance,
    otherAllowances: record.otherAllowances,
    overtime: record.overtime,
    bonus: record.bonus,
    arrears: record.arrears,
    providentFund: record.providentFund,
    gratuity: record.gratuity,
    eobi: record.eobi,
    loanInstallment: record.loanInstallment,
    otherDeductions: record.otherDeductions,
  };
}

export interface TaxComputationEmployeeOption {
  code: string;
  name: string;
  department: string;
  designation: string;
  category: string;
}

function amountsFromEmployeeCode(code: number): PayrollSetupAmounts {
  const basicSalary = 85000 + (code % 20) * 2500;
  const medicalAllowance = Math.round(basicSalary * 0.1);
  const fuelAllowance = 5000 + (code % 5) * 500;
  const mobileAllowance = 2000 + (code % 3) * 500;
  const carAllowance = code % 2 === 0 ? 15000 : 0;
  const otherAllowances = 1000 + (code % 4) * 250;
  const overtime = (code % 6) * 1200;
  const bonus = code % 3 === 0 ? 10000 : 0;
  const arrears = code % 5 === 0 ? 5000 : 0;
  const providentFund = Math.round(basicSalary * 0.08);
  const gratuity = Math.round(basicSalary * 0.05);
  const eobi = 500;
  const loanInstallment = code % 4 === 0 ? 3000 : 0;
  const otherDeductions = 500 + (code % 2) * 250;
  return {
    basicSalary,
    medicalAllowance,
    fuelAllowance,
    mobileAllowance,
    carAllowance,
    otherAllowances,
    overtime,
    bonus,
    arrears,
    providentFund,
    gratuity,
    eobi,
    loanInstallment,
    otherDeductions,
  };
}

@Component({
  selector: 'app-tax-computation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageToolbarComponent],
  templateUrl: './tax-computation.html',
  styleUrl: './tax-computation.css',
})
export class TaxComputationComponent {
  private readonly layout = inject(PayrollMasterLayoutService);
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly payrollSetupService = inject(PayrollSetupService);
  private readonly taxAllowanceService = inject(TaxAllowanceService);

  readonly bodyFields = computed(() => {
    const enabled = this.taxAllowanceService.enabledKeySet();
    return TAX_COMPUTATION_FIELDS.filter((field) => enabled.has(field.key));
  });

  formNumber = signal(this.generateFormNumber());
  employeeId = signal('');
  employeeName = signal('');
  department = signal('');
  designation = signal('');
  employeeCategory = signal('');
  taxPeriod = signal(this.currentTaxPeriod());
  idSuggestionsOpen = signal(false);
  nameSuggestionsOpen = signal(false);

  private readonly amounts = signal<PayrollSetupAmounts>({
    basicSalary: 0,
    medicalAllowance: 0,
    fuelAllowance: 0,
    mobileAllowance: 0,
    carAllowance: 0,
    otherAllowances: 0,
    overtime: 0,
    bonus: 0,
    arrears: 0,
    providentFund: 0,
    gratuity: 0,
    eobi: 0,
    loanInstallment: 0,
    otherDeductions: 0,
  });

  readonly netPayable = computed(() => {
    const enabled = this.taxAllowanceService.enabledKeySet();
    const a = this.amounts();
    return computeNetPayable({
      basicSalary: enabled.has('basicSalary') ? a.basicSalary : 0,
      medicalAllowance: enabled.has('medicalAllowance') ? a.medicalAllowance : 0,
      fuelAllowance: enabled.has('fuelAllowance') ? a.fuelAllowance : 0,
      mobileAllowance: enabled.has('mobileAllowance') ? a.mobileAllowance : 0,
      carAllowance: enabled.has('carAllowance') ? a.carAllowance : 0,
      otherAllowances: enabled.has('otherAllowances') ? a.otherAllowances : 0,
      overtime: enabled.has('overtime') ? a.overtime : 0,
      bonus: enabled.has('bonus') ? a.bonus : 0,
      arrears: enabled.has('arrears') ? a.arrears : 0,
      providentFund: enabled.has('providentFund') ? a.providentFund : 0,
      gratuity: enabled.has('gratuity') ? a.gratuity : 0,
      eobi: enabled.has('eobi') ? a.eobi : 0,
      loanInstallment: enabled.has('loanInstallment') ? a.loanInstallment : 0,
      otherDeductions: enabled.has('otherDeductions') ? a.otherDeductions : 0,
    });
  });

  readonly idSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeId()),
  );

  readonly nameSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeName()),
  );

  get employeeOptions(): TaxComputationEmployeeOption[] {
    return this.applicationFormService.getApplicationRecords().map((r) => ({
      code: String(r.EmployeeCode),
      name: r.EmployeeName,
      department: r.Department,
      designation: r.Designation,
      category: r.EmploymentCategory,
    }));
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  getAmount(key: string): number {
    if (key === 'netPayable') {
      return this.netPayable();
    }
    return this.amounts()[key as keyof PayrollSetupAmounts] ?? 0;
  }

  setAmount(key: string, value: string | number): void {
    if (key === 'netPayable') {
      return;
    }
    const num = Number(value);
    this.amounts.update((state) => ({
      ...state,
      [key]: Number.isFinite(num) ? num : 0,
    }));
  }

  onEmployeeIdInput(code: string): void {
    this.employeeId.set(code);
    this.idSuggestionsOpen.set(code.trim().length > 0);
    this.closeNameSuggestions();
  }

  onEmployeeNameInput(name: string): void {
    this.employeeName.set(name);
    this.nameSuggestionsOpen.set(name.trim().length > 0);
    this.closeIdSuggestions();
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

  onIdInputBlur(): void {
    setTimeout(() => this.closeIdSuggestions(), 150);
  }

  onNameInputBlur(): void {
    setTimeout(() => this.closeNameSuggestions(), 150);
  }

  selectEmployeeFromSuggestion(employee: TaxComputationEmployeeOption): void {
    this.closeIdSuggestions();
    this.closeNameSuggestions();
    this.employeeId.set(employee.code);
    this.populateFromEmployee(employee.code, employee);
  }

  private filterEmployeeSuggestions(query: string): TaxComputationEmployeeOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return this.employeeOptions
      .filter(
        (e) =>
          e.code.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }

  private populateFromEmployee(
    code: string,
    employee?: TaxComputationEmployeeOption,
  ): void {
    const emp =
      employee ??
      this.employeeOptions.find((e) => e.code === code);
    if (emp) {
      this.employeeName.set(emp.name);
      this.department.set(emp.department);
      this.designation.set(emp.designation);
      this.employeeCategory.set(emp.category);
    }

    const payroll = this.findPayrollByEmployeeId(code);
    if (payroll) {
      this.applyPayrollRecord(payroll);
      return;
    }

    const numericCode = Number(code);
    if (Number.isFinite(numericCode)) {
      this.applyAmounts(amountsFromEmployeeCode(numericCode));
    }
  }

  private findPayrollByEmployeeId(code: string): PayrollSetupRecord | undefined {
    const records = this.payrollSetupService.records();
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].employeeId === code) {
        return records[i];
      }
    }
    return undefined;
  }

  private applyPayrollRecord(record: PayrollSetupRecord): void {
    this.employeeId.set(record.employeeId);
    this.employeeName.set(record.employeeName);
    this.department.set(record.department);
    this.designation.set(record.designation);
    this.employeeCategory.set(record.employeeCategory);
    this.applyAmounts(amountsFromPayrollRecord(record));
  }

  private applyAmounts(amounts: PayrollSetupAmounts): void {
    this.amounts.set(amounts);
  }

  private generateFormNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(Date.now()).slice(-5);
    return `TCF-${year}-${seq}`;
  }

  private currentTaxPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
