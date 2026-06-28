import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

export interface PayrollProcessRow {
  apiId: string;
  employeeCode: string;
  personName: string;
  username: string;
  designation: string;
  department: string;
  employeeCategory: string;
  employmentNature: string;
  employmentType: string;
  jobTitle: string;
  location: string;
  workGradeLevel: string;
  basicSalary: number;
  medicalAllowance: number;
  fuelAllowance: number;
  mobileAllowance: number;
  carAllowance: number;
  otherAllowances: number;
  bonus: number;
  overtime: number;
  arrears: number;
}

export type PayrollColumnTone = 'employee-meta' | 'salary' | 'allowances' | 'bonuses' | 'final';

export type PayrollColumnType = 'username' | 'currency' | 'readonly' | 'readonly-pill';

export interface PayrollColumnGroup {
  id: string;
  label: string;
  tone: PayrollColumnTone;
}

export interface PayrollColumnDef {
  key: string;
  label: string;
  groupId: string;
  type: PayrollColumnType;
  minWidth: number;
}

@Component({
  selector: 'app-add-payroll-process',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-payroll-process.html',
  styleUrl: './add-payroll-process.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPayrollProcessComponent implements OnInit {
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly alertService = inject(AlertService);
  private readonly payrollSetupService = inject(PayrollSetupService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly rows = signal<PayrollProcessRow[]>([]);
  readonly loading = signal(true);

  readonly columnGroups: PayrollColumnGroup[] = [
    { id: 'emp-meta', label: 'Employee Information', tone: 'employee-meta' },
    { id: 'salary', label: 'Basic Salary', tone: 'salary' },
    { id: 'allowances', label: 'Allowances', tone: 'allowances' },
    { id: 'bonuses', label: 'Bonuses', tone: 'bonuses' },
    { id: 'final', label: 'Final Totals', tone: 'final' },
  ];

  readonly payrollColumns: PayrollColumnDef[] = [
    { key: 'username', label: 'Username', groupId: 'emp-meta', type: 'username', minWidth: 130 },
    { key: 'basicSalary', label: 'Basic Salary', groupId: 'salary', type: 'currency', minWidth: 118 },
    { key: 'medicalAllowance', label: 'Medical', groupId: 'allowances', type: 'currency', minWidth: 108 },
    { key: 'fuelAllowance', label: 'Fuel', groupId: 'allowances', type: 'currency', minWidth: 108 },
    { key: 'mobileAllowance', label: 'Mobile', groupId: 'allowances', type: 'currency', minWidth: 108 },
    { key: 'carAllowance', label: 'Car', groupId: 'allowances', type: 'currency', minWidth: 108 },
    { key: 'otherAllowances', label: 'Other', groupId: 'allowances', type: 'currency', minWidth: 108 },
    { key: 'bonus', label: 'Bonus', groupId: 'bonuses', type: 'currency', minWidth: 108 },
    { key: 'overtime', label: 'Overtime', groupId: 'bonuses', type: 'currency', minWidth: 108 },
    { key: 'arrears', label: 'Arrears', groupId: 'bonuses', type: 'currency', minWidth: 108 },
    { key: 'netPayable', label: 'Net Payable', groupId: 'final', type: 'readonly', minWidth: 118 },
    { key: 'totalEarnings', label: 'Total Earnings', groupId: 'final', type: 'readonly-pill', minWidth: 138 },
  ];

  readonly scrollMinWidth = computed(() =>
    this.payrollColumns.reduce((sum, col) => sum + col.minWidth, 0),
  );

  readonly groupTotals = computed(() => {
    const totals = {
      basicSalary: 0,
      medicalAllowance: 0,
      fuelAllowance: 0,
      mobileAllowance: 0,
      carAllowance: 0,
      otherAllowances: 0,
      bonus: 0,
      overtime: 0,
      arrears: 0,
      netPayable: 0,
      totalEarnings: 0,
    };

    for (const row of this.rows()) {
      totals.basicSalary += row.basicSalary;
      totals.medicalAllowance += row.medicalAllowance;
      totals.fuelAllowance += row.fuelAllowance;
      totals.mobileAllowance += row.mobileAllowance;
      totals.carAllowance += row.carAllowance;
      totals.otherAllowances += row.otherAllowances;
      totals.bonus += row.bonus;
      totals.overtime += row.overtime;
      totals.arrears += row.arrears;
      totals.netPayable += this.netPayableForRow(row);
      totals.totalEarnings += this.totalEarningsForRow(row);
    }

    return totals;
  });

  ngOnInit(): void {
    this.loadEmployees();
  }

  groupColspan(groupId: string): number {
    return this.payrollColumns.filter((col) => col.groupId === groupId).length;
  }

  avatarInitials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      return '?';
    }
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }

  formatMoney(value: number): string {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  back(): void {
    void this.router.navigateByUrl('/payroll-master');
  }

  parseAmount(value: string | number): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  totalEarningsForRow(row: PayrollProcessRow): number {
    return (
      row.basicSalary +
      row.medicalAllowance +
      row.fuelAllowance +
      row.mobileAllowance +
      row.carAllowance +
      row.otherAllowances +
      row.bonus +
      row.overtime +
      row.arrears
    );
  }

  netPayableForRow(row: PayrollProcessRow): number {
    return computeNetPayable({
      basicSalary: row.basicSalary,
      medicalAllowance: row.medicalAllowance,
      fuelAllowance: row.fuelAllowance,
      mobileAllowance: row.mobileAllowance,
      carAllowance: row.carAllowance,
      otherAllowances: row.otherAllowances,
      overtime: row.overtime,
      bonus: row.bonus,
      arrears: row.arrears,
      providentFund: 0,
      gratuity: 0,
      eobi: 0,
      loanInstallment: 0,
      otherDeductions: 0,
    });
  }

  earningsRatioForRow(row: PayrollProcessRow): number {
    if (row.basicSalary <= 0) {
      return 0;
    }
    return Math.round((this.totalEarningsForRow(row) / row.basicSalary) * 100);
  }

  getColumnValue(row: PayrollProcessRow, column: PayrollColumnDef): number | string {
    if (column.key === 'netPayable') {
      return this.netPayableForRow(row);
    }
    if (column.key === 'totalEarnings') {
      return this.totalEarningsForRow(row);
    }
    if (column.key === 'username') {
      return row.username || '—';
    }
    const value = row[column.key as keyof PayrollProcessRow];
    return typeof value === 'number' ? value : String(value ?? '');
  }

  getGroupTotal(column: PayrollColumnDef): number | null {
    if (column.key === 'username') {
      return null;
    }
    if (column.key === 'netPayable') {
      return this.groupTotals().netPayable;
    }
    if (column.key === 'totalEarnings') {
      return this.groupTotals().totalEarnings;
    }
    const totals = this.groupTotals();
    return totals[column.key as keyof typeof totals] ?? 0;
  }

  updateRowField(
    apiId: string,
    field: keyof PayrollProcessRow,
    value: string | number,
  ): void {
    const numericFields: Array<keyof PayrollProcessRow> = [
      'basicSalary',
      'medicalAllowance',
      'fuelAllowance',
      'mobileAllowance',
      'carAllowance',
      'otherAllowances',
      'bonus',
      'overtime',
      'arrears',
    ];
    const parsed = numericFields.includes(field)
      ? this.parseAmount(value)
      : String(value);

    this.rows.update((list) =>
      list.map((row) =>
        row.apiId === apiId ? { ...row, [field]: parsed } : row,
      ),
    );
  }

  openEmployeeProfile(apiId: string): void {
    if (!apiId) {
      return;
    }
    void this.router.navigate(['/recruitment/edit', apiId]);
  }

  save(): void {
    const rows = this.rows();
    if (rows.length === 0) {
      void this.alertService.validation('No employees available to save.');
      return;
    }

    const batchId = this.generateFormNumber();
    rows.forEach((row, index) => {
      this.payrollSetupService.addRecord({
        formNumber: `${batchId}-${String(index + 1).padStart(3, '0')}`,
        employeeId: row.employeeCode,
        employeeName: row.personName,
        employeeCategory: row.employeeCategory,
        employmentNature: row.employmentNature,
        employmentType: row.employmentType,
        workGradeLevel: row.workGradeLevel,
        department: row.department,
        designation: row.designation,
        jobTitle: row.jobTitle,
        location: row.location,
        basicSalary: row.basicSalary,
        medicalAllowance: row.medicalAllowance,
        fuelAllowance: row.fuelAllowance,
        mobileAllowance: row.mobileAllowance,
        carAllowance: row.carAllowance,
        otherAllowances: row.otherAllowances,
        overtime: row.overtime,
        bonus: row.bonus,
        arrears: row.arrears,
        providentFund: 0,
        gratuity: 0,
        eobi: 0,
        loanInstallment: 0,
        otherDeductions: 0,
        netPayable: this.netPayableForRow(row),
      });
    });

    void this.alertService.success('Success', `Payroll process saved for ${rows.length} employee(s).`);
    this.back();
  }

  private loadEmployees(): void {
    this.loading.set(true);
    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: (records) => {
        const withApiId = records.filter((record) => !!record.apiId);
        if (withApiId.length === 0) {
          this.rows.set([]);
          this.loading.set(false);
          this.cdr.markForCheck();
          return;
        }

        forkJoin(
          withApiId.map((record) =>
            this.applicationFormService.fetchEmployeeProfileDetail(record.apiId!).pipe(
              catchError(() => of(record)),
            ),
          ),
        ).subscribe({
          next: (details) => {
            this.rows.set(
              details
                .map((record) => this.mapRecordToRow(record))
                .sort((a, b) =>
                  a.personName.localeCompare(b.personName, undefined, { sensitivity: 'base' }),
                ),
            );
            this.loading.set(false);
            this.cdr.markForCheck();
          },
          error: (error: unknown) => {
            this.loading.set(false);
            void this.alertService.error(
              'Load Failed',
              formatApiErrorMessage(error, 'Failed to load employee payroll details.'),
            );
            this.cdr.markForCheck();
          },
        });
      },
      error: (error: unknown) => {
        this.loading.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load employees.'),
        );
        this.cdr.markForCheck();
      },
    });
  }

  private mapRecordToRow(record: ApplicationFormRecord): PayrollProcessRow {
    const detail = record.detail;
    const remuneration = detail?.remuneration;

    return {
      apiId: record.apiId ?? record.EmployeeCode,
      employeeCode: record.EmployeeCode,
      personName: detail?.personalInfo.personName || record.EmployeeName,
      username: detail?.loginDetails.userId || record.EmployeeCode,
      designation: record.Designation || detail?.personalInfo.designation || '',
      department: record.Department,
      employeeCategory: record.EmploymentCategory,
      employmentNature: record.EmployeeNature,
      employmentType: record.EmploymentType,
      jobTitle: detail?.personalInfo.designation ?? record.Designation,
      location: detail?.personalInfo.branchLocation ?? '',
      workGradeLevel: detail?.personalInfo.workGradeLevel ?? '',
      basicSalary: this.parseAmount(remuneration?.basicSalary ?? 0),
      medicalAllowance: this.parseAmount(remuneration?.medicalAllowances ?? 0),
      fuelAllowance: this.parseAmount(remuneration?.fuelAllowances ?? 0),
      mobileAllowance: this.parseAmount(remuneration?.mobileAllowances ?? 0),
      carAllowance: this.parseAmount(remuneration?.carAllowances ?? 0),
      otherAllowances: this.parseAmount(remuneration?.otherAllowances ?? 0),
      bonus: 0,
      overtime: 0,
      arrears: 0,
    };
  }

  private generateFormNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(Date.now()).slice(-5);
    return `PP-${year}-${seq}`;
  }
}
