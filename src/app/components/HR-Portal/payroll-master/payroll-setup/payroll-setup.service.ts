import { Injectable, signal } from '@angular/core';

export interface PayrollSetupRecord {
  id: number;
  formNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCategory: string;
  employmentNature: string;
  employmentType: string;
  workGradeLevel: string;
  department: string;
  designation: string;
  jobTitle: string;
  location: string;
  basicSalary: number;
  medicalAllowance: number;
  fuelAllowance: number;
  mobileAllowance: number;
  carAllowance: number;
  otherAllowances: number;
  overtime: number;
  bonus: number;
  arrears: number;
  providentFund: number;
  gratuity: number;
  eobi: number;
  loanInstallment: number;
  otherDeductions: number;
  netPayable: number;
  selected?: boolean;
}

export type PayrollSetupColumnKey = Exclude<keyof PayrollSetupRecord, 'id' | 'selected'>;

export const PAYROLL_SETUP_TABLE_COLUMNS: Array<{ key: PayrollSetupColumnKey; label: string }> = [
  { key: 'formNumber', label: 'Form Number' },
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'employeeName', label: 'Employee Name' },
  { key: 'employeeCategory', label: 'Employee Category' },
  { key: 'employmentNature', label: 'Employment Nature' },
  { key: 'employmentType', label: 'Employment Type' },
  { key: 'workGradeLevel', label: 'Work / Grade Level' },
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Designation' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'location', label: 'Location' },
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

export type PayrollSetupAmounts = Pick<
  PayrollSetupRecord,
  | 'basicSalary'
  | 'medicalAllowance'
  | 'fuelAllowance'
  | 'mobileAllowance'
  | 'carAllowance'
  | 'otherAllowances'
  | 'overtime'
  | 'bonus'
  | 'arrears'
  | 'providentFund'
  | 'gratuity'
  | 'eobi'
  | 'loanInstallment'
  | 'otherDeductions'
>;

export function computeNetPayable(amounts: PayrollSetupAmounts): number {
  const earnings =
    amounts.basicSalary +
    amounts.medicalAllowance +
    amounts.fuelAllowance +
    amounts.mobileAllowance +
    amounts.carAllowance +
    amounts.otherAllowances +
    amounts.overtime +
    amounts.bonus +
    amounts.arrears;
  const deductions =
    amounts.providentFund +
    amounts.gratuity +
    amounts.eobi +
    amounts.loanInstallment +
    amounts.otherDeductions;
  return Math.max(0, earnings - deductions);
}

export type PayrollSetupInput = Omit<PayrollSetupRecord, 'id' | 'selected' | 'netPayable'> & {
  netPayable?: number;
};

@Injectable({ providedIn: 'root' })
export class PayrollSetupService {
  private readonly recordsSignal = signal<PayrollSetupRecord[]>([]);

  readonly records = this.recordsSignal.asReadonly();

  addRecord(input: PayrollSetupInput): void {
    const amounts: PayrollSetupAmounts = {
      basicSalary: input.basicSalary,
      medicalAllowance: input.medicalAllowance,
      fuelAllowance: input.fuelAllowance,
      mobileAllowance: input.mobileAllowance,
      carAllowance: input.carAllowance,
      otherAllowances: input.otherAllowances,
      overtime: input.overtime,
      bonus: input.bonus,
      arrears: input.arrears,
      providentFund: input.providentFund,
      gratuity: input.gratuity,
      eobi: input.eobi,
      loanInstallment: input.loanInstallment,
      otherDeductions: input.otherDeductions,
    };
    const nextId = Math.max(0, ...this.recordsSignal().map((r) => r.id)) + 1;
    const record: PayrollSetupRecord = {
      ...input,
      id: nextId,
      netPayable: input.netPayable ?? computeNetPayable(amounts),
      selected: false,
    };
    this.recordsSignal.update((list) => [...list, record]);
  }
}
