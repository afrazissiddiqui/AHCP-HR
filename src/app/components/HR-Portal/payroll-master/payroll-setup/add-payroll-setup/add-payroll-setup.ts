import { CommonModule, ViewportScroller } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../../services/alert.service';
import { ApplicationFormService } from '../../../../../services/application-form.service';
import { computeNetPayable, PayrollSetupService } from '../payroll-setup.service';

interface PayrollDataField {
  key: string;
  label: string;
  isDeduction?: boolean;
}

@Component({
  selector: 'app-add-payroll-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-payroll-setup.html',
  styleUrl: '../../../Application-Form/create-job-requisition/create-job-requisition.css',
})
export class AddPayrollSetupComponent {
  protected readonly activeSection = signal('header-info-section');

  formNumber = signal(this.generateFormNumber());
  employeeId = signal('');
  employeeName = signal('');
  employeeCategory = signal('');
  employmentNature = signal('');
  employmentType = signal('');
  workGradeLevel = signal('');
  department = signal('');
  designation = signal('');
  jobTitle = signal('');
  location = signal('');

  private readonly amounts = signal<Record<string, number>>({
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

  readonly dataFields: PayrollDataField[] = [
    { key: 'basicSalary', label: 'Basic Salary' },
    { key: 'medicalAllowance', label: 'Medical Allowance' },
    { key: 'fuelAllowance', label: 'Fuel Allowance' },
    { key: 'mobileAllowance', label: 'Mobile Allowance' },
    { key: 'carAllowance', label: 'Car Allowance' },
    { key: 'otherAllowances', label: 'Other Allowances' },
    { key: 'overtime', label: 'Overtime' },
    { key: 'bonus', label: 'Bonus' },
    { key: 'arrears', label: 'Arrears' },
    { key: 'providentFund', label: 'Provident Fund', isDeduction: true },
    { key: 'gratuity', label: 'Gratuity', isDeduction: true },
    { key: 'eobi', label: 'EOBI', isDeduction: true },
    { key: 'loanInstallment', label: 'Loan Installment', isDeduction: true },
    { key: 'otherDeductions', label: 'Other Deductions', isDeduction: true },
  ];

  readonly earningsFields = this.dataFields.filter((f) => !f.isDeduction);
  readonly deductionFields = this.dataFields.filter((f) => f.isDeduction);

  readonly netPayable = computed(() => {
    const a = this.amounts();
    return computeNetPayable({
      basicSalary: a['basicSalary'] ?? 0,
      medicalAllowance: a['medicalAllowance'] ?? 0,
      fuelAllowance: a['fuelAllowance'] ?? 0,
      mobileAllowance: a['mobileAllowance'] ?? 0,
      carAllowance: a['carAllowance'] ?? 0,
      otherAllowances: a['otherAllowances'] ?? 0,
      overtime: a['overtime'] ?? 0,
      bonus: a['bonus'] ?? 0,
      arrears: a['arrears'] ?? 0,
      providentFund: a['providentFund'] ?? 0,
      gratuity: a['gratuity'] ?? 0,
      eobi: a['eobi'] ?? 0,
      loanInstallment: a['loanInstallment'] ?? 0,
      otherDeductions: a['otherDeductions'] ?? 0,
    });
  });

  constructor(
    private readonly router: Router,
    private readonly alertService: AlertService,
    private readonly applicationFormService: ApplicationFormService,
    private readonly payrollSetupService: PayrollSetupService,
    private readonly viewportScroller: ViewportScroller,
  ) {}

  get employeeOptions(): Array<{
    code: string;
    name: string;
    category: string;
    nature: string;
    type: string;
    department: string;
    designation: string;
    location: string;
  }> {
    return this.applicationFormService.getApplicationRecords().map((r) => ({
      code: String(r.EmployeeCode),
      name: r.EmployeeName,
      category: r.EmploymentCategory,
      nature: r.EmployeeNature,
      type: r.EmploymentType,
      department: r.Department,
      designation: r.Designation,
      location: '',
    }));
  }

  protected scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    this.viewportScroller.scrollToPosition([0, 0]);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  getAmount(key: string): number {
    return this.amounts()[key] ?? 0;
  }

  setAmount(key: string, value: string | number): void {
    const num = Number(value);
    this.amounts.update((state) => ({
      ...state,
      [key]: Number.isFinite(num) ? num : 0,
    }));
  }

  onEmployeeIdChange(code: string): void {
    this.employeeId.set(code);
    const match = this.employeeOptions.find((e) => e.code === code);
    if (!match) {
      return;
    }
    this.employeeName.set(match.name);
    this.employeeCategory.set(match.category);
    this.employmentNature.set(match.nature);
    this.employmentType.set(match.type);
    this.department.set(match.department);
    this.designation.set(match.designation);
    this.jobTitle.set(match.designation);
    this.location.set(match.location);
  }

  back(): void {
    void this.router.navigateByUrl('/payroll-master/payroll-setup');
  }

  submitForm(): void {
    if (!this.employeeId().trim() || !this.employeeName().trim()) {
      void this.alertService.validation('Please select Employee ID and ensure Employee Name is filled.');
      return;
    }

    const a = this.amounts();
    this.payrollSetupService.addRecord({
      formNumber: this.formNumber(),
      employeeId: this.employeeId(),
      employeeName: this.employeeName(),
      employeeCategory: this.employeeCategory(),
      employmentNature: this.employmentNature(),
      employmentType: this.employmentType(),
      workGradeLevel: this.workGradeLevel(),
      department: this.department(),
      designation: this.designation(),
      jobTitle: this.jobTitle(),
      location: this.location(),
      basicSalary: a['basicSalary'] ?? 0,
      medicalAllowance: a['medicalAllowance'] ?? 0,
      fuelAllowance: a['fuelAllowance'] ?? 0,
      mobileAllowance: a['mobileAllowance'] ?? 0,
      carAllowance: a['carAllowance'] ?? 0,
      otherAllowances: a['otherAllowances'] ?? 0,
      overtime: a['overtime'] ?? 0,
      bonus: a['bonus'] ?? 0,
      arrears: a['arrears'] ?? 0,
      providentFund: a['providentFund'] ?? 0,
      gratuity: a['gratuity'] ?? 0,
      eobi: a['eobi'] ?? 0,
      loanInstallment: a['loanInstallment'] ?? 0,
      otherDeductions: a['otherDeductions'] ?? 0,
      netPayable: this.netPayable(),
    });

    void this.alertService.success('Success', 'Payroll setup saved successfully.');
    this.back();
  }

  private generateFormNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(Date.now()).slice(-5);
    return `PSF-${year}-${seq}`;
  }
}
