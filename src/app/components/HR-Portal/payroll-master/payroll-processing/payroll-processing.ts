import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PayrollMasterLayoutService } from '../payroll-master-layout.service';
import { PayrollSetupService } from '../payroll-setup/payroll-setup.service';
import { AddPayrollProcessComponent } from './add-payroll-process/add-payroll-process';

type PayrollProcessingRow = {
  employeeCode: number;
  employeeName: string;
  employeeCategory: string;
  employementNature: string;
  employmentType: string;
  department: string;
  designation: string;
  jobTitle: string;
  payrollPeriod: string;
  basicSalary: number;
  medicalAllowance: number;
  fuelAllowance: number;
  mobileAllowance: number;
  carAllowance: number;
  otherAllowance: number;
  overtime: number;
  bonus: number;
  arrears: number;
  provientFund: number;
  gratuity: number;
  eobi: number;
  loanInstallment: number;
  otherDeduction: number;
  netPayable: number;
  tax: number;
  taxableSalary: number;
};

type PayrollProcessingColumnKey = keyof PayrollProcessingRow;

@Component({
  selector: 'app-payroll-processing',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent, AddPayrollProcessComponent],
  templateUrl: './payroll-processing.html',
  styleUrl: '../../Application-Form/Application-Form.css',
})
export class PayrollProcessingComponent {
  private readonly layout = inject(PayrollMasterLayoutService);

  constructor(private readonly payrollSetupService: PayrollSetupService) {}
  readonly showAddPayrollProcess = signal(false);
  searchText = '';
  /** Empty string means all departments. */
  selectedDepartment = '';
  showDialog = false;
  activeTab: 'filter' = 'filter';

  readonly columns: Array<{ key: PayrollProcessingColumnKey; label: string; visible: boolean }> = [
    { key: 'employeeCode', label: 'Employee Code', visible: true },
    { key: 'employeeName', label: 'Employee Name', visible: true },
    { key: 'employeeCategory', label: 'Employee Category', visible: true },
    { key: 'employementNature', label: 'Employement Nature', visible: true },
    { key: 'employmentType', label: 'Employment Type', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'designation', label: 'Designation', visible: true },
    { key: 'jobTitle', label: 'Job Title', visible: true },
    { key: 'payrollPeriod', label: 'Payroll Period', visible: true },
    { key: 'basicSalary', label: 'Basic Salary', visible: true },
    { key: 'medicalAllowance', label: 'Medical Allowance', visible: true },
    { key: 'fuelAllowance', label: 'Fuel Allowance', visible: true },
    { key: 'mobileAllowance', label: 'Mobile Allowance', visible: true },
    { key: 'carAllowance', label: 'Car Allowance', visible: true },
    { key: 'otherAllowance', label: 'Other Allowance', visible: true },
    { key: 'overtime', label: 'Overtime', visible: true },
    { key: 'bonus', label: 'Bonus', visible: true },
    { key: 'arrears', label: 'Arrears', visible: true },
    { key: 'provientFund', label: 'Provient Fund', visible: true },
    { key: 'gratuity', label: 'Gratuity', visible: true },
    { key: 'eobi', label: 'EOBI', visible: true },
    { key: 'loanInstallment', label: 'Loan Installment', visible: true },
    { key: 'otherDeduction', label: 'Other deduction', visible: true },
    { key: 'netPayable', label: 'Net Payable', visible: true },
    { key: 'tax', label: 'Tax', visible: true },
    { key: 'taxableSalary', label: 'Taxable Salary', visible: true }
  ];

  get payrollProcessingList(): PayrollProcessingRow[] {
    return this.payrollSetupService.records().map((record) => ({
      employeeCode: Number(record.employeeId) || 0,
      employeeName: record.employeeName,
      employeeCategory: record.employeeCategory,
      employementNature: record.employmentNature,
      employmentType: record.employmentType,
      department: record.department,
      designation: record.designation,
      jobTitle: record.jobTitle,
      payrollPeriod: record.formNumber,
      basicSalary: record.basicSalary,
      medicalAllowance: record.medicalAllowance,
      fuelAllowance: record.fuelAllowance,
      mobileAllowance: record.mobileAllowance,
      carAllowance: record.carAllowance,
      otherAllowance: record.otherAllowances,
      overtime: record.overtime,
      bonus: record.bonus,
      arrears: record.arrears,
      provientFund: record.providentFund,
      gratuity: record.gratuity,
      eobi: record.eobi,
      loanInstallment: record.loanInstallment,
      otherDeduction: record.otherDeductions,
      netPayable: record.netPayable,
      tax: 0,
      taxableSalary: 0,
    }));
  }

  /** Distinct department values from current payroll data, sorted. */
  get departmentOptions(): string[] {
    const seen = new Set<string>();
    for (const row of this.payrollProcessingList) {
      const d = row.department?.trim() ?? '';
      if (d) {
        seen.add(d);
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get filteredPayrollRows(): PayrollProcessingRow[] {
    let list = this.payrollProcessingList;

    if (this.selectedDepartment) {
      list = list.filter(
        (row) => (row.department?.trim() ?? '') === this.selectedDepartment
      );
    }

    if (!this.searchText.trim()) {
      return list;
    }

    const search = this.searchText.toLowerCase();
    return list.filter((row) =>
      String(row.employeeCode).toLowerCase().includes(search) ||
      row.employeeName.toLowerCase().includes(search) ||
      row.employeeCategory.toLowerCase().includes(search) ||
      row.employementNature.toLowerCase().includes(search) ||
      row.employmentType.toLowerCase().includes(search) ||
      row.department.toLowerCase().includes(search) ||
      row.designation.toLowerCase().includes(search) ||
      row.jobTitle.toLowerCase().includes(search)
    );
  }

  get visibleColumns(): Array<{ key: PayrollProcessingColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((column) => column.visible);
  }

  getCellValue(row: PayrollProcessingRow, key: PayrollProcessingColumnKey): string | number {
    return row[key];
  }

  onSearchChange(): void {
    // Keeping parity with Employee Action search behavior hook.
  }

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  openAddPayrollProcess(): void {
    this.showAddPayrollProcess.set(true);
  }

  closeAddPayrollProcess(): void {
    this.showAddPayrollProcess.set(false);
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
