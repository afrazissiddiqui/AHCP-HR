import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../sidebar/sidebar';
import { PAYROLL_MASTER_SIDEBAR_ITEMS, PAYROLL_MASTER_SIDEBAR_SECTIONS } from './payroll-master-sidebar';
import { ApplicationFormService } from '../../../services/application-form.service';

type PayrollMasterRow = {
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

type PayrollMasterColumnKey = keyof PayrollMasterRow;

@Component({
  selector: 'app-payroll-master',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './payroll-master.html',
  styleUrl: '../Application-Form/Application-Form.css',
})
export class PayrollMasterComponent {
  constructor(private readonly applicationFormService: ApplicationFormService) { }

  sidebarItems: SidebarItem[] = PAYROLL_MASTER_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = PAYROLL_MASTER_SIDEBAR_SECTIONS;
  activeSidebarItemId = 'payroll-master-list';
  sidebarCollapsed = signal(false);
  searchText = '';
  /** Empty string means all departments. */
  selectedDepartment = '';
  showDialog = false;
  activeTab: 'filter' = 'filter';

  readonly columns: Array<{ key: PayrollMasterColumnKey; label: string; visible: boolean }> = [
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

  get payrollMasterList(): PayrollMasterRow[] {
    return this.applicationFormService.getApplicationRecords().map((record) => ({
      employeeCode: record.EmployeeCode,
      employeeName: record.EmployeeName,
      employeeCategory: record.EmploymentCategory,
      employementNature: record.EmployeeNature,
      employmentType: record.EmploymentType,
      department: record.Department,
      designation: record.Designation,
      jobTitle: record.Designation,
      payrollPeriod: '-',
      basicSalary: 0,
      medicalAllowance: 0,
      fuelAllowance: 0,
      mobileAllowance: 0,
      carAllowance: 0,
      otherAllowance: 0,
      overtime: 0,
      bonus: 0,
      arrears: 0,
      provientFund: 0,
      gratuity: 0,
      eobi: 0,
      loanInstallment: 0,
      otherDeduction: 0,
      netPayable: 0,
      tax: 0,
      taxableSalary: 0
    }));
  }

  /** Distinct department values from current payroll data, sorted. */
  get departmentOptions(): string[] {
    const seen = new Set<string>();
    for (const row of this.payrollMasterList) {
      const d = row.department?.trim() ?? '';
      if (d) {
        seen.add(d);
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get filteredPayrollRows(): PayrollMasterRow[] {
    let list = this.payrollMasterList;

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

  get visibleColumns(): Array<{ key: PayrollMasterColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((column) => column.visible);
  }

  getCellValue(row: PayrollMasterRow, key: PayrollMasterColumnKey): string | number {
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

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId = folderId;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((state) => !state);
  }
}
