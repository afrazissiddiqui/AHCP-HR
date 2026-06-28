import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../../../services/application-form.service';
import { AlertService } from '../../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import {
  PayrollSetupService,
  computeNetPayable,
} from '../../payroll-setup/payroll-setup.service';

type PayrollProcessTab = 'employee' | 'allowances' | 'bonuses';

interface PayrollProcessEmployeeOption {
  apiId: string;
  employeeCode: string;
  personName: string;
}

interface AmountField {
  key: string;
  label: string;
}

@Component({
  selector: 'app-add-payroll-process-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-payroll-process-panel.html',
  styleUrl: './add-payroll-process-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPayrollProcessPanelComponent implements OnInit {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly saved = output<void>();

  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly alertService = inject(AlertService);
  private readonly payrollSetupService = inject(PayrollSetupService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly activeTab = signal<PayrollProcessTab>('employee');
  readonly employeeOptions = signal<PayrollProcessEmployeeOption[]>([]);
  readonly selectedEmployeeId = signal('');
  readonly loadingEmployee = signal(false);
  readonly username = signal('');
  readonly personName = signal('');
  readonly basicSalary = signal(0);

  private readonly allowances = signal<Record<string, number>>({
    medicalAllowance: 0,
    fuelAllowance: 0,
    mobileAllowance: 0,
    carAllowance: 0,
    otherAllowances: 0,
  });

  private readonly bonuses = signal<Record<string, number>>({
    bonus: 0,
    overtime: 0,
    arrears: 0,
  });

  private selectedRecord: ApplicationFormRecord | null = null;

  readonly allowanceFields: AmountField[] = [
    { key: 'medicalAllowance', label: 'Medical Allowance' },
    { key: 'fuelAllowance', label: 'Fuel Allowance' },
    { key: 'mobileAllowance', label: 'Mobile Allowance' },
    { key: 'carAllowance', label: 'Car Allowance' },
    { key: 'otherAllowances', label: 'Other Allowances' },
  ];

  readonly bonusFields: AmountField[] = [
    { key: 'bonus', label: 'Bonus' },
    { key: 'overtime', label: 'Overtime' },
    { key: 'arrears', label: 'Arrears' },
  ];

  ngOnInit(): void {
    this.loadEmployees();
  }

  setActiveTab(tab: PayrollProcessTab): void {
    this.activeTab.set(tab);
  }

  close(): void {
    this.closed.emit();
  }

  parseAmount(value: string | number): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  getAllowance(key: string): number {
    return this.allowances()[key] ?? 0;
  }

  setAllowance(key: string, value: string | number): void {
    this.allowances.update((state) => ({
      ...state,
      [key]: this.parseAmount(value),
    }));
  }

  getBonus(key: string): number {
    return this.bonuses()[key] ?? 0;
  }

  setBonus(key: string, value: string | number): void {
    this.bonuses.update((state) => ({
      ...state,
      [key]: this.parseAmount(value),
    }));
  }

  onEmployeeChange(apiId: string): void {
    this.selectedEmployeeId.set(apiId);
    this.selectedRecord = null;
    this.username.set('');
    this.personName.set('');
    this.basicSalary.set(0);
    this.resetAmounts();

    if (!apiId) {
      this.cdr.markForCheck();
      return;
    }

    this.loadingEmployee.set(true);
    this.applicationFormService.fetchEmployeeProfileDetail(apiId).subscribe({
      next: (record) => {
        this.selectedRecord = record;
        this.populateFromRecord(record);
        this.loadingEmployee.set(false);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.loadingEmployee.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load employee profile.'),
        );
        this.cdr.markForCheck();
      },
    });
  }

  openEmployeeProfile(): void {
    const apiId = this.selectedEmployeeId();
    if (!apiId) {
      return;
    }
    void this.router.navigate(['/recruitment/edit', apiId]);
  }

  save(): void {
    const record = this.selectedRecord;
    if (!record || !this.selectedEmployeeId()) {
      void this.alertService.validation('Please select an employee before saving.');
      this.activeTab.set('employee');
      this.cdr.markForCheck();
      return;
    }

    const allowances = this.allowances();
    const bonuses = this.bonuses();
    const detail = record.detail;
    const basic = this.basicSalary();

    this.payrollSetupService.addRecord({
      formNumber: this.generateFormNumber(),
      employeeId: record.EmployeeCode,
      employeeName: this.personName() || record.EmployeeName,
      employeeCategory: record.EmploymentCategory,
      employmentNature: record.EmployeeNature,
      employmentType: record.EmploymentType,
      workGradeLevel: detail?.personalInfo.workGradeLevel ?? '',
      department: record.Department,
      designation: record.Designation,
      jobTitle: detail?.personalInfo.designation ?? record.Designation,
      location: detail?.personalInfo.branchLocation ?? '',
      basicSalary: basic,
      medicalAllowance: allowances['medicalAllowance'] ?? 0,
      fuelAllowance: allowances['fuelAllowance'] ?? 0,
      mobileAllowance: allowances['mobileAllowance'] ?? 0,
      carAllowance: allowances['carAllowance'] ?? 0,
      otherAllowances: allowances['otherAllowances'] ?? 0,
      overtime: bonuses['overtime'] ?? 0,
      bonus: bonuses['bonus'] ?? 0,
      arrears: bonuses['arrears'] ?? 0,
      providentFund: 0,
      gratuity: 0,
      eobi: 0,
      loanInstallment: 0,
      otherDeductions: 0,
      netPayable: computeNetPayable({
        basicSalary: basic,
        medicalAllowance: allowances['medicalAllowance'] ?? 0,
        fuelAllowance: allowances['fuelAllowance'] ?? 0,
        mobileAllowance: allowances['mobileAllowance'] ?? 0,
        carAllowance: allowances['carAllowance'] ?? 0,
        otherAllowances: allowances['otherAllowances'] ?? 0,
        overtime: bonuses['overtime'] ?? 0,
        bonus: bonuses['bonus'] ?? 0,
        arrears: bonuses['arrears'] ?? 0,
        providentFund: 0,
        gratuity: 0,
        eobi: 0,
        loanInstallment: 0,
        otherDeductions: 0,
      }),
    });

    void this.alertService.success('Success', 'Payroll process saved successfully.');
    this.resetForm();
    this.saved.emit();
    this.closed.emit();
  }

  private loadEmployees(): void {
    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: () => {
        this.employeeOptions.set(this.buildEmployeeOptions());
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load employees.'),
        );
      },
    });
  }

  private buildEmployeeOptions(): PayrollProcessEmployeeOption[] {
    return this.applicationFormService
      .getApplicationRecords()
      .filter((record) => !!record.apiId)
      .map((record) => ({
        apiId: record.apiId!,
        employeeCode: record.EmployeeCode,
        personName: record.EmployeeName,
      }))
      .sort((a, b) => a.personName.localeCompare(b.personName, undefined, { sensitivity: 'base' }));
  }

  private populateFromRecord(record: ApplicationFormRecord): void {
    const detail = record.detail;
    const remuneration = detail?.remuneration;

    this.personName.set(
      detail?.personalInfo.personName || record.EmployeeName,
    );
    this.username.set(detail?.loginDetails.userId || record.EmployeeCode);
    this.basicSalary.set(this.parseAmount(remuneration?.basicSalary ?? 0));

    this.allowances.set({
      medicalAllowance: this.parseAmount(remuneration?.medicalAllowances ?? 0),
      fuelAllowance: this.parseAmount(remuneration?.fuelAllowances ?? 0),
      mobileAllowance: this.parseAmount(remuneration?.mobileAllowances ?? 0),
      carAllowance: this.parseAmount(remuneration?.carAllowances ?? 0,
      ),
      otherAllowances: this.parseAmount(remuneration?.otherAllowances ?? 0),
    });
  }

  private resetAmounts(): void {
    this.allowances.set({
      medicalAllowance: 0,
      fuelAllowance: 0,
      mobileAllowance: 0,
      carAllowance: 0,
      otherAllowances: 0,
    });
    this.bonuses.set({
      bonus: 0,
      overtime: 0,
      arrears: 0,
    });
  }

  private resetForm(): void {
    this.activeTab.set('employee');
    this.selectedEmployeeId.set('');
    this.selectedRecord = null;
    this.username.set('');
    this.personName.set('');
    this.basicSalary.set(0);
    this.resetAmounts();
  }

  private generateFormNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(Date.now()).slice(-5);
    return `PP-${year}-${seq}`;
  }
}
