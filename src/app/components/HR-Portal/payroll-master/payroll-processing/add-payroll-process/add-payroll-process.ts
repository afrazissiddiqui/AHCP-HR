import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
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
import { AuthService } from '../../../../../services/auth.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import {
  PayrollSetupService,
  computeEobiEmployeeContribution,
  computeEobiEmployerContribution,
  computeFuelAllowance,
  computeGratuity,
  computeGrossSalary,
  computeMedicalAllowance,
  computeNetPayable,
  computeOvertimeAmount,
  computeOvertimeRate,
  computeYearsOfService,
} from '../../payroll-setup/payroll-setup.service';
import { ApplicationDetailDialogComponent } from '../../../Application-Form/application-detail-dialog/application-detail-dialog';

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
  dateOfJoining: string;
  yearsOfService: number;
  eobiApplicable: boolean;
  basicSalary: number;
  grossSalary: number;
  medicalAllowance: number;
  allowedLiters: number;
  monthlyFuelRate: number;
  fuelAllowance: number;
  mobileAllowance: number;
  carAllowance: number;
  otherAllowances: number;
  bonus: number;
  lastMonthGrossSalary: number;
  overtimeHours: number;
  overtime: number;
  providentFund: number;
  gratuity: number;
  eobiEmployee: number;
  eobiEmployer: number;
  arrears: number;
  loanAdjustment: number;
  loanAdvForm: number;
  approved: boolean;
}

export type PayrollColumnTone =
  | 'salary'
  | 'allowances'
  | 'bonuses'
  | 'deductions'
  | 'loan'
  | 'final'
  | 'approval';

export type PayrollColumnType = 'currency' | 'readonly' | 'readonly-pill' | 'approval';

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

export type PayrollPeriodType = 'Month' | 'Year';

@Component({
  selector: 'app-add-payroll-process',
  standalone: true,
  imports: [CommonModule, FormsModule, ApplicationDetailDialogComponent],
  templateUrl: './add-payroll-process.html',
  styleUrl: './add-payroll-process.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPayrollProcessComponent implements OnInit {
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly payrollSetupService = inject(PayrollSetupService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly rows = signal<PayrollProcessRow[]>([]);
  readonly loading = signal(true);
  readonly remarks = signal('');
  readonly periodType = signal<PayrollPeriodType>('Month');
  readonly periodTypeOptions: PayrollPeriodType[] = ['Month', 'Year'];
  readonly loggedInUserName = signal('—');
  readonly loggedInUserId = signal('—');
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly detailRecord = signal<ApplicationFormRecord | null>(null);

  private readonly fixedPane = viewChild<ElementRef<HTMLElement>>('fixedPane');
  private readonly scrollPane = viewChild<ElementRef<HTMLElement>>('scrollPane');
  private syncingScroll = false;

  readonly minimumWage = this.payrollSetupService.minimumWage;
  readonly currencyCode = 'PKR';

  readonly columnGroups: PayrollColumnGroup[] = [
    { id: 'salary', label: 'Basic Salary', tone: 'salary' },
    { id: 'allowances', label: 'Allowances', tone: 'allowances' },
    { id: 'bonuses', label: 'Bonuses', tone: 'bonuses' },
    { id: 'deductions', label: 'Deduction', tone: 'deductions' },
    { id: 'loan', label: 'Loan Adjustment', tone: 'loan' },
    { id: 'final', label: 'Final Totals', tone: 'final' },
    { id: 'approval', label: 'Approval', tone: 'approval' },
  ];

  readonly payrollColumns: PayrollColumnDef[] = [
    { key: 'basicSalary', label: 'Basic Salary', groupId: 'salary', type: 'currency', minWidth: 152 },
    { key: 'grossSalary', label: 'Gross Salary', groupId: 'salary', type: 'readonly', minWidth: 152 },
    { key: 'medicalAllowance', label: 'Medical', groupId: 'allowances', type: 'readonly', minWidth: 145 },
    { key: 'fuelAllowance', label: 'Fuel', groupId: 'allowances', type: 'readonly', minWidth: 145 },
    { key: 'mobileAllowance', label: 'Mobile', groupId: 'allowances', type: 'currency', minWidth: 145 },
    { key: 'carAllowance', label: 'Car', groupId: 'allowances', type: 'currency', minWidth: 145 },
    { key: 'otherAllowances', label: 'Other', groupId: 'allowances', type: 'currency', minWidth: 145 },
    { key: 'bonus', label: 'Bonus', groupId: 'bonuses', type: 'currency', minWidth: 145 },
    { key: 'overtimeHours', label: 'OT Hours', groupId: 'bonuses', type: 'currency', minWidth: 96 },
    { key: 'overtime', label: 'Overtime', groupId: 'bonuses', type: 'readonly', minWidth: 145 },
    { key: 'providentFund', label: 'Provident Fund', groupId: 'deductions', type: 'currency', minWidth: 152 },
    { key: 'gratuity', label: 'Gratuity', groupId: 'deductions', type: 'readonly', minWidth: 172 },
    { key: 'eobiEmployee', label: 'EOBI (Employee)', groupId: 'deductions', type: 'readonly', minWidth: 152 },
    { key: 'eobiEmployer', label: 'EOBI (Employer)', groupId: 'deductions', type: 'readonly', minWidth: 152 },
    { key: 'arrears', label: 'Arrears', groupId: 'deductions', type: 'currency', minWidth: 145 },
    { key: 'loanAdjustment', label: 'Loan Adjustment', groupId: 'loan', type: 'currency', minWidth: 158 },
    { key: 'loanAdvForm', label: 'Loan Adv Form', groupId: 'loan', type: 'currency', minWidth: 152 },
    { key: 'netPayable', label: 'Net Payable', groupId: 'final', type: 'readonly', minWidth: 160 },
    { key: 'totalEarnings', label: 'Total Earnings', groupId: 'final', type: 'readonly-pill', minWidth: 168 },
    { key: 'finalGrossSalary', label: 'Gross Salary', groupId: 'final', type: 'readonly', minWidth: 152 },
    { key: 'approved', label: 'Approval', groupId: 'approval', type: 'approval', minWidth: 96 },
  ];

  readonly scrollMinWidth = computed(() =>
    this.payrollColumns.reduce((sum, col) => sum + col.minWidth, 0),
  );

  readonly skeletonRows = Array.from({ length: 8 }, (_, index) => index);

  readonly groupTotals = computed(() => {
    const totals = {
      basicSalary: 0,
      grossSalary: 0,
      medicalAllowance: 0,
      fuelAllowance: 0,
      mobileAllowance: 0,
      carAllowance: 0,
      otherAllowances: 0,
      bonus: 0,
      overtimeHours: 0,
      overtime: 0,
      providentFund: 0,
      gratuity: 0,
      eobiEmployee: 0,
      eobiEmployer: 0,
      arrears: 0,
      loanAdjustment: 0,
      loanAdvForm: 0,
      netPayable: 0,
      totalEarnings: 0,
      finalGrossSalary: 0,
    };

    for (const row of this.rows()) {
      totals.basicSalary += row.basicSalary;
      totals.grossSalary += row.grossSalary;
      totals.medicalAllowance += row.medicalAllowance;
      totals.fuelAllowance += row.fuelAllowance;
      totals.mobileAllowance += row.mobileAllowance;
      totals.carAllowance += row.carAllowance;
      totals.otherAllowances += row.otherAllowances;
      totals.bonus += row.bonus;
      totals.overtimeHours += row.overtimeHours;
      totals.overtime += row.overtime;
      totals.providentFund += row.providentFund;
      totals.gratuity += row.gratuity;
      totals.eobiEmployee += row.eobiEmployee;
      totals.eobiEmployer += row.eobiEmployer;
      totals.arrears += row.arrears;
      totals.loanAdjustment += row.loanAdjustment;
      totals.loanAdvForm += row.loanAdvForm;
      totals.netPayable += this.netPayableForRow(row);
      totals.totalEarnings += this.totalEarningsForRow(row);
      totals.finalGrossSalary += row.grossSalary;
    }

    return totals;
  });

  ngOnInit(): void {
    this.loggedInUserId.set(this.resolveLoggedInUserId());
    this.loggedInUserName.set(this.resolveLoggedInUserName());
    this.loadEmployees();
  }

  groupColspan(groupId: string): number {
    return this.payrollColumns.filter((col) => col.groupId === groupId).length;
  }

  groupHeaderClass(group: PayrollColumnGroup): string {
    const visibleGroups = this.columnGroups.filter((item) => this.groupColspan(item.id) > 0);
    const isLastGroup = visibleGroups[visibleGroups.length - 1]?.id === group.id;
    return [`tone-${group.tone}`, isLastGroup ? '' : 'comp-section-end'].filter(Boolean).join(' ');
  }

  columnSectionClass(col: PayrollColumnDef): string {
    const columnIndex = this.payrollColumns.findIndex((item) => item.key === col.key);
    if (columnIndex === -1) {
      return '';
    }

    const isLastInGroup =
      columnIndex === this.payrollColumns.length - 1 ||
      this.payrollColumns[columnIndex + 1].groupId !== col.groupId;

    if (!isLastInGroup || columnIndex === this.payrollColumns.length - 1) {
      return '';
    }

    return `comp-section-end comp-section-end--${col.groupId}`;
  }

  onScrollPaneScroll(event: Event): void {
    if (this.syncingScroll) {
      return;
    }
    const fixed = this.fixedPane()?.nativeElement;
    const scroll = event.target as HTMLElement;
    if (!fixed) {
      return;
    }
    this.syncingScroll = true;
    fixed.scrollTop = scroll.scrollTop;
    this.syncingScroll = false;
  }

  onFixedPaneScroll(event: Event): void {
    if (this.syncingScroll) {
      return;
    }
    const scroll = this.scrollPane()?.nativeElement;
    const fixed = event.target as HTMLElement;
    if (!scroll) {
      return;
    }
    this.syncingScroll = true;
    scroll.scrollTop = fixed.scrollTop;
    this.syncingScroll = false;
  }

  onTableWheel(event: WheelEvent): void {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    const scroll = this.scrollPane()?.nativeElement;
    const fixed = this.fixedPane()?.nativeElement;
    if (!scroll) {
      return;
    }

    const maxScrollTop = scroll.scrollHeight - scroll.clientHeight;
    if (maxScrollTop <= 0) {
      return;
    }

    const nextScrollTop = scroll.scrollTop + event.deltaY;
    const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, nextScrollTop));

    if (clampedScrollTop === scroll.scrollTop) {
      return;
    }

    event.preventDefault();
    scroll.scrollTop = clampedScrollTop;
    if (fixed) {
      fixed.scrollTop = clampedScrollTop;
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
    return `${this.currencyCode} ${value.toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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
      row.grossSalary +
      row.fuelAllowance +
      row.mobileAllowance +
      row.carAllowance +
      row.otherAllowances +
      row.bonus +
      row.overtime
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
      arrears: 0,
      providentFund: row.providentFund,
      gratuity: row.gratuity,
      eobi: row.eobiEmployee,
      loanInstallment: row.loanAdjustment,
      otherDeductions: row.loanAdvForm + row.arrears,
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
    if (column.key === 'grossSalary' || column.key === 'finalGrossSalary') {
      return row.grossSalary;
    }
    if (column.key === 'overtimeHours') {
      return row.overtimeHours;
    }
    const value = row[column.key as keyof PayrollProcessRow];
    return typeof value === 'number' ? value : String(value ?? '');
  }

  getGroupTotal(column: PayrollColumnDef): number | null {
    if (column.key === 'approved') {
      return null;
    }
    if (column.key === 'netPayable') {
      return this.groupTotals().netPayable;
    }
    if (column.key === 'totalEarnings') {
      return this.groupTotals().totalEarnings;
    }
    if (column.key === 'finalGrossSalary') {
      return this.groupTotals().finalGrossSalary;
    }
    const totals = this.groupTotals();
    return totals[column.key as keyof typeof totals] ?? 0;
  }

  onMinimumWageChange(value: string | number): void {
    this.payrollSetupService.setMinimumWage(this.parseAmount(value));
    this.rows.update((list) => list.map((row) => this.recalculateRow(row)));
  }

  setApproval(apiId: string, approved: boolean): void {
    this.rows.update((list) =>
      list.map((row) =>
        row.apiId === apiId ? { ...row, approved } : row,
      ),
    );
  }

  updateRowField(
    apiId: string,
    field: keyof PayrollProcessRow,
    value: string | number,
  ): void {
    const numericFields: Array<keyof PayrollProcessRow> = [
      'basicSalary',
      'mobileAllowance',
      'carAllowance',
      'otherAllowances',
      'bonus',
      'overtimeHours',
      'providentFund',
      'arrears',
      'loanAdjustment',
      'loanAdvForm',
    ];
    const parsed = numericFields.includes(field)
      ? this.parseAmount(value)
      : String(value);

    this.rows.update((list) =>
      list.map((row) =>
        row.apiId === apiId ? this.recalculateRow({ ...row, [field]: parsed }) : row,
      ),
    );
  }

  openEmployeeProfile(apiId: string): void {
    if (!apiId) {
      return;
    }

    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.detailRecord.set(null);
    this.cdr.markForCheck();

    this.applicationFormService.fetchEmployeeProfileDetail(apiId).subscribe({
      next: (record) => {
        this.detailRecord.set(record);
        this.detailLoading.set(false);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.detailOpen.set(false);
        this.detailLoading.set(false);
        this.detailRecord.set(null);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load employee details.'),
        );
        this.cdr.markForCheck();
      },
    });
  }

  closeEmployeeDetail(): void {
    this.detailOpen.set(false);
    this.detailLoading.set(false);
    this.detailRecord.set(null);
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
        providentFund: row.providentFund,
        gratuity: row.gratuity,
        eobi: row.eobiEmployee,
        loanInstallment: row.loanAdjustment,
        otherDeductions: row.loanAdvForm,
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
    const basicSalary = this.parseAmount(remuneration?.basicSalary ?? 0);
    const allowedLiters = this.parseAmount(remuneration?.fuelLimit ?? 0);
    const profileFuelAmount = this.parseAmount(remuneration?.fuelAllowances ?? 0);
    const monthlyFuelRate =
      allowedLiters > 0 && profileFuelAmount > 0
        ? profileFuelAmount / allowedLiters
        : 0;
    const lastMonthGrossSalary = this.resolveLastMonthGrossSalary(
      record.EmployeeCode,
      basicSalary,
    );

    return this.recalculateRow({
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
      dateOfJoining: remuneration?.dateOfJoining ?? '',
      yearsOfService: 0,
      eobiApplicable: this.isEobiApplicable(remuneration?.eobiApplicable),
      basicSalary,
      grossSalary: 0,
      medicalAllowance: 0,
      allowedLiters,
      monthlyFuelRate,
      fuelAllowance: 0,
      mobileAllowance: this.parseAmount(remuneration?.mobileAllowances ?? 0),
      carAllowance: this.parseAmount(remuneration?.carAllowances ?? 0),
      otherAllowances: this.parseAmount(remuneration?.otherAllowances ?? 0),
      bonus: 0,
      lastMonthGrossSalary,
      overtimeHours: 0,
      overtime: 0,
      providentFund: 0,
      gratuity: 0,
      eobiEmployee: 0,
      eobiEmployer: 0,
      arrears: 0,
      loanAdjustment: 0,
      loanAdvForm: 0,
      approved: false,
    });
  }

  private recalculateRow(row: PayrollProcessRow): PayrollProcessRow {
    const medicalAllowance = computeMedicalAllowance(row.basicSalary);
    const grossSalary = computeGrossSalary(row.basicSalary, medicalAllowance);
    const fuelAllowance = computeFuelAllowance(row.allowedLiters, row.monthlyFuelRate);
    const overtimeRate = computeOvertimeRate(row.lastMonthGrossSalary);
    const overtime = computeOvertimeAmount(overtimeRate, row.overtimeHours);
    const yearsOfService = computeYearsOfService(row.dateOfJoining);
    const gratuity = computeGratuity(grossSalary, yearsOfService);
    const minimumWage = this.payrollSetupService.minimumWage();
    const eobiEmployee = row.eobiApplicable
      ? computeEobiEmployeeContribution(minimumWage)
      : 0;
    const eobiEmployer = row.eobiApplicable
      ? computeEobiEmployerContribution(minimumWage)
      : 0;

    return {
      ...row,
      medicalAllowance,
      grossSalary,
      fuelAllowance,
      overtime,
      yearsOfService,
      gratuity,
      eobiEmployee,
      eobiEmployer,
    };
  }

  private isEobiApplicable(value: string | undefined): boolean {
    const normalized = (value ?? '').trim().toLowerCase();
    return normalized === 'yes' || normalized === 'y' || normalized === '1' || normalized === 'true';
  }

  private resolveLastMonthGrossSalary(employeeCode: string, basicSalary: number): number {
    const priorRecords = this.payrollSetupService
      .records()
      .filter((record) => record.employeeId === employeeCode)
      .sort((a, b) => b.id - a.id);

    if (priorRecords.length > 0) {
      const lastRecord = priorRecords[0];
      return computeGrossSalary(lastRecord.basicSalary, lastRecord.medicalAllowance);
    }

    return computeGrossSalary(basicSalary, computeMedicalAllowance(basicSalary));
  }

  private generateFormNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(Date.now()).slice(-5);
    return `PP-${year}-${seq}`;
  }

  private resolveLoggedInUserId(): string {
    const employeeRecord = this.applicationFormService.getSignedInUserRecord(
      this.authService.getSessionUserId(),
    );
    if (employeeRecord?.EmployeeCode) {
      return String(employeeRecord.EmployeeCode);
    }

    const sessionUser = this.authService.getSessionUser();
    if (sessionUser?.id) {
      return String(sessionUser.id);
    }

    return this.authService.getSessionUserId()?.trim() || '—';
  }

  private resolveLoggedInUserName(): string {
    const employeeRecord = this.applicationFormService.getSignedInUserRecord(
      this.authService.getSessionUserId(),
    );
    if (employeeRecord?.EmployeeName?.trim()) {
      return employeeRecord.EmployeeName.trim();
    }

    const sessionUser = this.authService.getSessionUser();
    if (sessionUser?.name?.trim()) {
      return sessionUser.name.trim();
    }

    return this.authService.getSessionUserId()?.trim() || '—';
  }
}
