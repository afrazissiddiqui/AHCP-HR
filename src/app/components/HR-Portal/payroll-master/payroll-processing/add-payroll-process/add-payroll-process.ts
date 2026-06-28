import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

export interface PayrollAmountField {
  key: string;
  label: string;
}

export interface PayrollProcessRow {
  apiId: string;
  employeeCode: string;
  personName: string;
  username: string;
  designation: string;
  record: ApplicationFormRecord;
  basicSalary: number;
  allowances: Record<string, number>;
  bonuses: Record<string, number>;
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
  readonly open = input(false);
  readonly closed = output<void>();
  readonly saved = output<void>();

  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly alertService = inject(AlertService);
  private readonly payrollSetupService = inject(PayrollSetupService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly rows = signal<PayrollProcessRow[]>([]);
  readonly loadingRows = signal(false);

  readonly allowanceFields: PayrollAmountField[] = [
    { key: 'medicalAllowance', label: 'Medical Allowance' },
    { key: 'fuelAllowance', label: 'Fuel Allowance' },
    { key: 'mobileAllowance', label: 'Mobile Allowance' },
    { key: 'carAllowance', label: 'Car Allowance' },
    { key: 'otherAllowances', label: 'Other Allowances' },
  ];

  readonly bonusFields: PayrollAmountField[] = [
    { key: 'bonus', label: 'Bonus' },
    { key: 'overtime', label: 'Overtime' },
    { key: 'arrears', label: 'Arrears' },
  ];

  readonly allowancesColspan = computed(() => this.allowanceFields.length);
  readonly bonusesColspan = computed(() => this.bonusFields.length);
  readonly totalColumns = computed(
    () => 2 + 1 + this.allowancesColspan() + this.bonusesColspan() + 2,
  );

  readonly groupTotals = computed(() => {
    const totals = {
      basicSalary: 0,
      allowances: {} as Record<string, number>,
      bonuses: {} as Record<string, number>,
      netPayable: 0,
      totalEarnings: 0,
    };

    for (const field of this.allowanceFields) {
      totals.allowances[field.key] = 0;
    }
    for (const field of this.bonusFields) {
      totals.bonuses[field.key] = 0;
    }

    for (const row of this.rows()) {
      totals.basicSalary += row.basicSalary;
      totals.netPayable += this.rowNetPayable(row);
      totals.totalEarnings += this.rowTotalEarnings(row);
      for (const field of this.allowanceFields) {
        totals.allowances[field.key] += row.allowances[field.key] ?? 0;
      }
      for (const field of this.bonusFields) {
        totals.bonuses[field.key] += row.bonuses[field.key] ?? 0;
      }
    }

    return totals;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.loadEmployeeRows();
      }
    });
  }

  ngOnInit(): void {
    if (this.open()) {
      this.loadEmployeeRows();
    }
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

  close(): void {
    this.closed.emit();
  }

  parseAmount(value: string | number): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  rowTotalEarnings(row: PayrollProcessRow): number {
    return (
      row.basicSalary +
      (row.allowances['medicalAllowance'] ?? 0) +
      (row.allowances['fuelAllowance'] ?? 0) +
      (row.allowances['mobileAllowance'] ?? 0) +
      (row.allowances['carAllowance'] ?? 0) +
      (row.allowances['otherAllowances'] ?? 0) +
      (row.bonuses['bonus'] ?? 0) +
      (row.bonuses['overtime'] ?? 0) +
      (row.bonuses['arrears'] ?? 0)
    );
  }

  rowNetPayable(row: PayrollProcessRow): number {
    return computeNetPayable({
      basicSalary: row.basicSalary,
      medicalAllowance: row.allowances['medicalAllowance'] ?? 0,
      fuelAllowance: row.allowances['fuelAllowance'] ?? 0,
      mobileAllowance: row.allowances['mobileAllowance'] ?? 0,
      carAllowance: row.allowances['carAllowance'] ?? 0,
      otherAllowances: row.allowances['otherAllowances'] ?? 0,
      overtime: row.bonuses['overtime'] ?? 0,
      bonus: row.bonuses['bonus'] ?? 0,
      arrears: row.bonuses['arrears'] ?? 0,
      providentFund: 0,
      gratuity: 0,
      eobi: 0,
      loanInstallment: 0,
      otherDeductions: 0,
    });
  }

  rowEarningsRatio(row: PayrollProcessRow): number {
    if (row.basicSalary <= 0) {
      return 0;
    }
    return Math.round((this.rowTotalEarnings(row) / row.basicSalary) * 100);
  }

  updateRowBasicSalary(apiId: string, value: string | number): void {
    this.updateRow(apiId, (row) => ({
      ...row,
      basicSalary: this.parseAmount(value),
    }));
  }

  updateRowAllowance(apiId: string, key: string, value: string | number): void {
    this.updateRow(apiId, (row) => ({
      ...row,
      allowances: {
        ...row.allowances,
        [key]: this.parseAmount(value),
      },
    }));
  }

  updateRowBonus(apiId: string, key: string, value: string | number): void {
    this.updateRow(apiId, (row) => ({
      ...row,
      bonuses: {
        ...row.bonuses,
        [key]: this.parseAmount(value),
      },
    }));
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

    const formNumber = this.generateFormNumber();
    for (const row of rows) {
      const detail = row.record.detail;
      this.payrollSetupService.addRecord({
        formNumber: `${formNumber}-${row.employeeCode}`,
        employeeId: row.record.EmployeeCode,
        employeeName: row.personName || row.record.EmployeeName,
        employeeCategory: row.record.EmploymentCategory,
        employmentNature: row.record.EmployeeNature,
        employmentType: row.record.EmploymentType,
        workGradeLevel: detail?.personalInfo.workGradeLevel ?? '',
        department: row.record.Department,
        designation: row.record.Designation,
        jobTitle: detail?.personalInfo.designation ?? row.record.Designation,
        location: detail?.personalInfo.branchLocation ?? '',
        basicSalary: row.basicSalary,
        medicalAllowance: row.allowances['medicalAllowance'] ?? 0,
        fuelAllowance: row.allowances['fuelAllowance'] ?? 0,
        mobileAllowance: row.allowances['mobileAllowance'] ?? 0,
        carAllowance: row.allowances['carAllowance'] ?? 0,
        otherAllowances: row.allowances['otherAllowances'] ?? 0,
        overtime: row.bonuses['overtime'] ?? 0,
        bonus: row.bonuses['bonus'] ?? 0,
        arrears: row.bonuses['arrears'] ?? 0,
        providentFund: 0,
        gratuity: 0,
        eobi: 0,
        loanInstallment: 0,
        otherDeductions: 0,
        netPayable: this.rowNetPayable(row),
      });
    }

    void this.alertService.success('Success', `Payroll process saved for ${rows.length} employee(s).`);
    this.saved.emit();
    this.closed.emit();
  }

  private updateRow(apiId: string, updater: (row: PayrollProcessRow) => PayrollProcessRow): void {
    this.rows.update((list) =>
      list.map((row) => (row.apiId === apiId ? updater(row) : row)),
    );
  }

  private loadEmployeeRows(): void {
    this.loadingRows.set(true);
    this.rows.set([]);

    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: () => {
        const summaries = this.applicationFormService
          .getApplicationRecords()
          .filter((record) => !!record.apiId);

        if (summaries.length === 0) {
          this.loadingRows.set(false);
          this.cdr.markForCheck();
          return;
        }

        forkJoin(
          summaries.map((summary) =>
            this.applicationFormService.fetchEmployeeProfileDetail(summary.apiId!).pipe(
              map((record) => this.buildRowFromRecord(record)),
              catchError(() =>
                of(this.buildRowFromSummary(summary)),
              ),
            ),
          ),
        ).subscribe({
          next: (loadedRows) => {
            this.rows.set(
              loadedRows.sort((a, b) =>
                a.personName.localeCompare(b.personName, undefined, { sensitivity: 'base' }),
              ),
            );
            this.loadingRows.set(false);
            this.cdr.markForCheck();
          },
          error: (error: unknown) => {
            this.loadingRows.set(false);
            void this.alertService.error(
              'Load Failed',
              formatApiErrorMessage(error, 'Failed to load employee payroll rows.'),
            );
            this.cdr.markForCheck();
          },
        });
      },
      error: (error: unknown) => {
        this.loadingRows.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load employees.'),
        );
        this.cdr.markForCheck();
      },
    });
  }

  private buildRowFromRecord(record: ApplicationFormRecord): PayrollProcessRow {
    const detail = record.detail;
    const remuneration = detail?.remuneration;
    const apiId = record.apiId ?? record.EmployeeCode;

    return {
      apiId,
      employeeCode: record.EmployeeCode,
      personName: detail?.personalInfo.personName || record.EmployeeName,
      username: detail?.loginDetails.userId || record.EmployeeCode,
      designation: record.Designation || detail?.personalInfo.designation || '',
      record,
      basicSalary: this.parseAmount(remuneration?.basicSalary ?? 0),
      allowances: {
        medicalAllowance: this.parseAmount(remuneration?.medicalAllowances ?? 0),
        fuelAllowance: this.parseAmount(remuneration?.fuelAllowances ?? 0),
        mobileAllowance: this.parseAmount(remuneration?.mobileAllowances ?? 0),
        carAllowance: this.parseAmount(remuneration?.carAllowances ?? 0),
        otherAllowances: this.parseAmount(remuneration?.otherAllowances ?? 0),
      },
      bonuses: {
        bonus: 0,
        overtime: 0,
        arrears: 0,
      },
    };
  }

  private buildRowFromSummary(summary: ApplicationFormRecord): PayrollProcessRow {
    const apiId = summary.apiId ?? summary.EmployeeCode;
    return {
      apiId,
      employeeCode: summary.EmployeeCode,
      personName: summary.EmployeeName,
      username: summary.EmployeeCode,
      designation: summary.Designation,
      record: summary,
      basicSalary: 0,
      allowances: {
        medicalAllowance: 0,
        fuelAllowance: 0,
        mobileAllowance: 0,
        carAllowance: 0,
        otherAllowances: 0,
      },
      bonuses: {
        bonus: 0,
        overtime: 0,
        arrears: 0,
      },
    };
  }

  private generateFormNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(Date.now()).slice(-5);
    return `PP-${year}-${seq}`;
  }
}
