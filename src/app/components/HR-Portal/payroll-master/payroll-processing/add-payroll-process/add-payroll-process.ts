import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../../../services/application-form.service';
import { AlertService } from '../../../../../services/alert.service';
import { AuthService } from '../../../../../services/auth.service';
import {
  LoanAdvanceRecord,
  LoanAdvanceService,
} from '../../../../../services/loan-advance.service';
import {
  PayrollProcessingService,
  PayrollProcessingSubmitPayload,
} from '../../../../../services/payroll-processing.service';
import {
  PayrollSetupService,
  computeBasicSalary,
  computeEobiEmployeeContribution,
  computeEobiEmployerContribution,
  computeFuelAllowance,
  computeGratuity,
  computeGrossSalary,
  computeMedicalAllowance,
  computeNetPayable,
  computeOvertimeAmount,
  computeOvertimeRate,
  computeProvidentFund,
  computeYearsOfService,
} from '../../payroll-setup/payroll-setup.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import {
  buildPaginationFooterItems,
  paginationItemTrack,
  PaginationFooterItem,
} from '../../../../../utils/pagination.util';
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
  overtimeApplicable: boolean;
  allowancesApplicable: boolean;
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
  providentFundEmployer: number;
  socialSecurityPunjab: number;
  socialSecurityKpk: number;
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
  | 'providentFund'
  | 'socialSecurity'
  | 'eobi'
  | 'other'
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

interface PayrollMonthOption {
  value: number;
  label: string;
}

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
  private readonly loanAdvanceService = inject(LoanAdvanceService);
  private readonly payrollSetupService = inject(PayrollSetupService);
  private readonly payrollProcessingService = inject(PayrollProcessingService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly employeeSummaries = signal<ApplicationFormRecord[]>([]);
  readonly rowCache = signal<Map<string, PayrollProcessRow>>(new Map());
  readonly loading = signal(true);
  readonly loadingPageDetails = signal(false);
  readonly saving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly remarks = signal('');
  readonly fuelPriceAdjust = signal(0);
  readonly searchText = signal('');
  readonly selectedMonth = signal(new Date().getMonth() + 1);
  readonly selectedYear = signal(new Date().getFullYear());
  readonly monthOptions: PayrollMonthOption[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  readonly yearOptions = this.buildYearOptions();
  readonly loggedInUserName = signal('—');
  readonly loggedInUserId = signal('—');
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly detailRecord = signal<ApplicationFormRecord | null>(null);

  private readonly fixedPane = viewChild<ElementRef<HTMLElement>>('fixedPane');
  private readonly scrollPane = viewChild<ElementRef<HTMLElement>>('scrollPane');
  private syncingScroll = false;
  private pageDetailsSub?: Subscription;
  private pageDetailsGeneration = 0;
  private readonly lastMonthGrossSalaryCache = new Map<string, number>();

  readonly minimumWage = this.payrollSetupService.minimumWage;
  readonly currencyCode = 'PKR';

  readonly columnGroups: PayrollColumnGroup[] = [
    { id: 'salary', label: 'Basic Salary', tone: 'salary' },
    { id: 'allowances', label: 'Allowances', tone: 'allowances' },
    { id: 'bonuses', label: 'Bonuses', tone: 'bonuses' },
    { id: 'providentFund', label: 'Provident Fund', tone: 'providentFund' },
    { id: 'socialSecurity', label: 'Social Security', tone: 'socialSecurity' },
    { id: 'eobi', label: 'EOBI', tone: 'eobi' },
    { id: 'other', label: 'Other', tone: 'other' },
    { id: 'loan', label: 'Loan Adjustment', tone: 'loan' },
    { id: 'final', label: 'Final Totals', tone: 'final' },
    { id: 'approval', label: 'Approval', tone: 'approval' },
  ];

  readonly payrollColumns: PayrollColumnDef[] = [
    { key: 'basicSalary', label: 'Basic Salary', groupId: 'salary', type: 'readonly', minWidth: 152 },
    { key: 'grossSalary', label: 'Gross Salary', groupId: 'salary', type: 'readonly', minWidth: 152 },
    { key: 'medicalAllowance', label: 'Medical', groupId: 'allowances', type: 'readonly', minWidth: 145 },
    { key: 'allowedLiters', label: 'Petrol Liters', groupId: 'allowances', type: 'readonly', minWidth: 120 },
    { key: 'fuelAllowance', label: 'Fuel', groupId: 'allowances', type: 'readonly', minWidth: 145 },
    { key: 'mobileAllowance', label: 'Mobile', groupId: 'allowances', type: 'currency', minWidth: 145 },
    { key: 'carAllowance', label: 'Car', groupId: 'allowances', type: 'currency', minWidth: 145 },
    { key: 'otherAllowances', label: 'Other', groupId: 'allowances', type: 'currency', minWidth: 145 },
    { key: 'bonus', label: 'Bonus', groupId: 'bonuses', type: 'currency', minWidth: 145 },
    { key: 'overtimeHours', label: 'OT Hours', groupId: 'bonuses', type: 'currency', minWidth: 96 },
    { key: 'overtime', label: 'Overtime', groupId: 'bonuses', type: 'readonly', minWidth: 145 },
    { key: 'providentFundEmployer', label: 'P.Fund (Employer)', groupId: 'providentFund', type: 'readonly', minWidth: 152 },
    { key: 'providentFund', label: 'P.Fund (Employee)', groupId: 'providentFund', type: 'readonly', minWidth: 152 },
    { key: 'socialSecurityPunjab', label: 'Punjab', groupId: 'socialSecurity', type: 'readonly', minWidth: 145 },
    { key: 'socialSecurityKpk', label: 'KPK', groupId: 'socialSecurity', type: 'readonly', minWidth: 145 },
    { key: 'eobiEmployer', label: 'EOBI (Employer)', groupId: 'eobi', type: 'readonly', minWidth: 152 },
    { key: 'eobiEmployee', label: 'EOBI (Employee)', groupId: 'eobi', type: 'readonly', minWidth: 152 },
    { key: 'arrears', label: 'Arrears', groupId: 'other', type: 'currency', minWidth: 145 },
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

  readonly filteredEmployeeSummaries = computed(() => {
    const list = this.employeeSummaries();
    const search = this.searchText().trim().toLowerCase();
    if (!search) {
      return list;
    }

    return list.filter((record) => {
      const haystack = [
        record.EmployeeName,
        record.EmployeeCode,
        record.apiId,
        record.Department,
        record.Designation,
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ');
      return haystack.includes(search);
    });
  });

  readonly paginatedRows = computed(() => {
    const cache = this.rowCache();
    return this.currentPageSummaries().map((summary) => {
      const id = this.resolveEmployeeKey(summary);
      return cache.get(id) ?? this.buildPlaceholderRowFromSummary(summary);
    });
  });

  readonly currentPageSummaries = computed(() => {
    const list = this.filteredEmployeeSummaries();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredEmployeeSummaries().length / this.pageSize())),
  );

  readonly paginationFooterItems = computed((): PaginationFooterItem[] =>
    buildPaginationFooterItems(this.totalPages(), this.currentPage()),
  );

  readonly paginationItemTrack = paginationItemTrack;
  Math = Math;

  readonly skeletonRows = computed(() =>
    Array.from({ length: this.pageSize() }, (_, index) => index),
  );

  readonly groupTotals = computed(() => {
    const totals = {
      basicSalary: 0,
      grossSalary: 0,
      medicalAllowance: 0,
      allowedLiters: 0,
      fuelAllowance: 0,
      mobileAllowance: 0,
      carAllowance: 0,
      otherAllowances: 0,
      bonus: 0,
      overtimeHours: 0,
      overtime: 0,
      providentFund: 0,
      providentFundEmployer: 0,
      socialSecurityPunjab: 0,
      socialSecurityKpk: 0,
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

    for (const row of this.paginatedRows()) {
      if (!this.isRowLoaded(row.apiId)) {
        continue;
      }
      totals.basicSalary += row.basicSalary;
      totals.grossSalary += row.grossSalary;
      totals.medicalAllowance += row.medicalAllowance;
      totals.allowedLiters += row.allowedLiters;
      totals.fuelAllowance += row.fuelAllowance;
      totals.mobileAllowance += row.mobileAllowance;
      totals.carAllowance += row.carAllowance;
      totals.otherAllowances += row.otherAllowances;
      totals.bonus += row.bonus;
      totals.overtimeHours += row.overtimeHours;
      totals.overtime += row.overtime;
      totals.providentFund += row.providentFund;
      totals.providentFundEmployer += row.providentFundEmployer;
      totals.socialSecurityPunjab += row.socialSecurityPunjab;
      totals.socialSecurityKpk += row.socialSecurityKpk;
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
    this.destroyRef.onDestroy(() => this.pageDetailsSub?.unsubscribe());
    this.loadLoanAdvances();
    this.loadEmployees();
  }

  isRowLoaded(apiId: string): boolean {
    return this.rowCache().has(apiId);
  }

  setPage(page: number): void {
    const total = this.totalPages();
    if (page < 1 || page > total) {
      return;
    }
    this.currentPage.set(page);
    this.scrollTablesToTop();
    this.loadCurrentPageDetails();
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
    this.scrollTablesToTop();
    this.loadCurrentPageDetails();
  }

  onSelectedMonthChange(value: string | number): void {
    this.selectedMonth.set(Number(value));
    this.refreshPayrollRows();
  }

  onSelectedYearChange(value: string | number): void {
    this.selectedYear.set(Number(value));
    this.refreshPayrollRows();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
    this.scrollTablesToTop();
    this.loadCurrentPageDetails();
  }

  onFuelPriceAdjustChange(value: string | number): void {
    this.fuelPriceAdjust.set(this.parseAmount(value));
    this.rowCache.update((cache) => {
      const next = new Map(cache);
      for (const [id, row] of next) {
        next.set(id, this.recalculateRow(row));
      }
      return next;
    });
  }

  isLastPageActive(): boolean {
    return this.currentPage() === this.totalPages();
  }

  private scrollTablesToTop(): void {
    const fixed = this.fixedPane()?.nativeElement;
    const scroll = this.scrollPane()?.nativeElement;
    if (fixed) {
      fixed.scrollTop = 0;
    }
    if (scroll) {
      scroll.scrollTop = 0;
    }
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

  isColumnReadonlyForRow(row: PayrollProcessRow, column: PayrollColumnDef): boolean {
    if (column.type !== 'currency') {
      return true;
    }

    if (!row.allowancesApplicable && this.isAllowanceColumn(column.key)) {
      return true;
    }

    if (!row.overtimeApplicable && column.key === 'overtimeHours') {
      return true;
    }

    return false;
  }

  formatColumnDisplay(row: PayrollProcessRow, column: PayrollColumnDef): string {
    const value = this.getColumnValue(row, column);
    if (column.key === 'overtimeHours' || column.key === 'allowedLiters') {
      return typeof value === 'number'
        ? value.toLocaleString('en-PK', { maximumFractionDigits: 2 })
        : String(value);
    }
    return this.formatMoney(typeof value === 'number' ? value : this.parseAmount(value));
  }

  private isAllowanceColumn(key: string): boolean {
    return (
      key === 'fuelAllowance' ||
      key === 'mobileAllowance' ||
      key === 'carAllowance' ||
      key === 'otherAllowances'
    );
  }

  readonlyReason(row: PayrollProcessRow, column: PayrollColumnDef): string {
    if (!row.allowancesApplicable && this.isAllowanceColumn(column.key)) {
      return 'Allowances not applicable for this employee';
    }
    if (!row.overtimeApplicable && (column.key === 'overtimeHours' || column.key === 'overtime')) {
      return 'Overtime not applicable for this employee';
    }
    if (!row.eobiApplicable && (column.key === 'eobiEmployee' || column.key === 'eobiEmployer')) {
      return 'EOBI not applicable for this employee';
    }
    return '';
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
    if (column.key === 'providentFundEmployer') {
      return this.groupTotals().providentFundEmployer;
    }
    const totals = this.groupTotals();
    return totals[column.key as keyof typeof totals] ?? 0;
  }

  formatGroupTotal(column: PayrollColumnDef): string {
    const total = this.getGroupTotal(column);
    if (total === null) {
      return '';
    }
    if (column.key === 'allowedLiters' || column.key === 'overtimeHours') {
      return total.toLocaleString('en-PK', { maximumFractionDigits: 2 });
    }
    return this.formatMoney(total);
  }

  onMinimumWageChange(value: string | number): void {
    this.payrollSetupService.setMinimumWage(this.parseAmount(value));
    this.rowCache.update((cache) => {
      const next = new Map(cache);
      for (const [id, row] of next) {
        next.set(id, this.recalculateRow(row));
      }
      return next;
    });
  }

  setApproval(apiId: string, approved: boolean): void {
    this.rowCache.update((cache) => {
      const row = cache.get(apiId);
      if (!row) {
        return cache;
      }
      const next = new Map(cache);
      next.set(apiId, { ...row, approved });
      return next;
    });
  }

  updateRowField(
    apiId: string,
    field: keyof PayrollProcessRow,
    value: string | number,
  ): void {
    const row = this.rowCache().get(apiId);
    if (!row) {
      return;
    }

    if (!row.allowancesApplicable && this.isAllowanceColumn(String(field))) {
      return;
    }
    if (!row.overtimeApplicable && field === 'overtimeHours') {
      return;
    }

    const numericFields: Array<keyof PayrollProcessRow> = [
      'mobileAllowance',
      'carAllowance',
      'otherAllowances',
      'bonus',
      'overtimeHours',
      'arrears',
      'loanAdjustment',
      'loanAdvForm',
    ];
    const parsed = numericFields.includes(field)
      ? this.parseAmount(value)
      : String(value);

    this.rowCache.update((cache) => {
      const current = cache.get(apiId);
      if (!current) {
        return cache;
      }
      const next = new Map(cache);
      next.set(apiId, this.recalculateRow({ ...current, [field]: parsed }));
      return next;
    });
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
    if (this.saving()) {
      return;
    }

    const rows = Array.from(this.rowCache().values());
    if (this.employeeSummaries().length === 0) {
      void this.alertService.validation('No employees available to save.');
      return;
    }

    const approvedRows = rows.filter((row) => row.approved);
    if (approvedRows.length === 0) {
      void this.alertService.validation('Select at least one approved employee before saving.');
      return;
    }

    this.saving.set(true);
    const payload = this.buildPayload(approvedRows);

    this.payrollProcessingService
      .addPayrollProcessing(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          void this.alertService.success(
            'Success',
            `Payroll process saved for ${approvedRows.length} approved employee(s).`,
          );
          this.back();
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Save Failed',
            formatApiErrorMessage(error, 'Failed to save payroll process.'),
          );
          this.cdr.markForCheck();
        },
      });
  }

  private buildPayload(rows: PayrollProcessRow[]): PayrollProcessingSubmitPayload {
    const monthLabel =
      this.monthOptions.find((option) => option.value === this.selectedMonth())?.label ??
      String(this.selectedMonth());
    const remarks = this.remarks().trim() || `${monthLabel} Payroll`;

    return {
      header: {
        month: this.selectedMonth(),
        year: this.selectedYear(),
        remarks,
        currency: this.currencyCode,
        status: 'Draft',
        processedBy: this.authService.getSessionUser()?.id ?? 1,
        processedDate: this.formatProcessedDate(new Date()),
        fuelPriceAdjust: this.fuelPriceAdjust(),
      },
      details: rows.map((row) => ({
        employeeId: row.apiId,
        employeeCode: row.employeeCode,
        personName: row.personName,
        basicSalary: row.basicSalary,
        grossSalary: row.grossSalary,
        medicalAllowance: row.medicalAllowance,
        allowedLiters: row.allowedLiters,
        monthlyFuelRate: row.monthlyFuelRate,
        fuelAllowance: row.fuelAllowance,
        mobileAllowance: row.mobileAllowance,
        carAllowance: row.carAllowance,
        otherAllowances: row.otherAllowances,
        bonus: row.bonus,
        lastMonthGrossSalary: row.lastMonthGrossSalary,
        overtimeHours: row.overtimeHours,
        overtime: row.overtime,
        providentFund: row.providentFund,
        gratuity: row.gratuity,
        eobiEmployee: row.eobiEmployee,
        eobiEmployer: row.eobiEmployer,
        arrears: row.arrears,
        loanAdjustment: row.loanAdjustment,
        loanAdvForm: row.loanAdvForm,
        totalEarnings: this.totalEarningsForRow(row),
        netPayable: this.netPayableForRow(row),
        approved: row.approved,
      })),
    };
  }

  private formatProcessedDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadEmployees(): void {
    this.loading.set(true);
    this.rowCache.set(new Map());
    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: (records) => {
        this.loadLoggedInUserProfile();

        const withApiId = records
          .filter((record) => !!record.apiId)
          .sort((left, right) =>
            (left.EmployeeName || '').localeCompare(right.EmployeeName || '', undefined, {
              sensitivity: 'base',
            }),
          );

        this.employeeSummaries.set(withApiId);
        this.currentPage.set(1);
        this.loading.set(false);

        if (withApiId.length === 0) {
          this.cdr.markForCheck();
          return;
        }

        this.loadCurrentPageDetails();
        this.cdr.markForCheck();
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

  private loadLoanAdvances(): void {
    this.loanAdvanceService.fetchLoanAdvances().subscribe({
      next: () => {
        this.refreshPayrollRows();
        this.cdr.markForCheck();
      },
      error: () => {
        // Keep payroll usable even if loan/advance records fail to load.
      },
    });
  }

  private refreshPayrollRows(): void {
    this.rowCache.set(new Map());
    if (this.employeeSummaries().length > 0) {
      this.loadCurrentPageDetails();
    }
  }

  private loadCurrentPageDetails(): void {
    this.pageDetailsSub?.unsubscribe();
    const generation = ++this.pageDetailsGeneration;

    const missing = this.currentPageSummaries().filter(
      (summary) => !this.rowCache().has(this.resolveEmployeeKey(summary)),
    );

    if (missing.length === 0) {
      this.loadingPageDetails.set(false);
      return;
    }

    this.loadingPageDetails.set(true);

    this.pageDetailsSub = this.applicationFormService
      .fetchEmployeeProfileDetailsInBatches(missing, missing.length)
      .pipe(
        finalize(() => {
          if (generation !== this.pageDetailsGeneration) {
            return;
          }
          this.loadingPageDetails.set(false);
        }),
      )
      .subscribe({
        next: (records) => {
          if (generation !== this.pageDetailsGeneration) {
            return;
          }

          const rows = records.map((record) =>
            record.detail
              ? this.mapRecordToRow(record)
              : this.buildPlaceholderRowFromSummary(record),
          );

          this.rowCache.update((cache) => {
            const next = new Map(cache);
            for (const row of rows) {
              next.set(row.apiId, row);
            }
            return next;
          });
        },
        error: (error: unknown) => {
          if (generation !== this.pageDetailsGeneration) {
            return;
          }
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load employee payroll details for this page.'),
          );
        },
      });
  }

  private resolveEmployeeKey(record: ApplicationFormRecord): string {
    return record.apiId ?? record.EmployeeCode;
  }

  private buildPlaceholderRowFromSummary(record: ApplicationFormRecord): PayrollProcessRow {
    return this.recalculateRow({
      apiId: this.resolveEmployeeKey(record),
      employeeCode: record.EmployeeCode,
      personName: record.EmployeeName,
      username: record.EmployeeCode,
      designation: record.Designation,
      department: record.Department,
      employeeCategory: record.EmploymentCategory,
      employmentNature: record.EmployeeNature,
      employmentType: record.EmploymentType,
      jobTitle: record.Designation,
      location: '',
      workGradeLevel: '',
      dateOfJoining: '',
      yearsOfService: 0,
      overtimeApplicable: false,
      allowancesApplicable: false,
      eobiApplicable: false,
      basicSalary: 0,
      grossSalary: 0,
      medicalAllowance: 0,
      allowedLiters: 0,
      monthlyFuelRate: 0,
      fuelAllowance: 0,
      mobileAllowance: 0,
      carAllowance: 0,
      otherAllowances: 0,
      bonus: 0,
      lastMonthGrossSalary: 0,
      overtimeHours: 0,
      overtime: 0,
      providentFund: 0,
      providentFundEmployer: 0,
      socialSecurityPunjab: 0,
      socialSecurityKpk: 0,
      gratuity: 0,
      eobiEmployee: 0,
      eobiEmployer: 0,
      arrears: 0,
      loanAdjustment: 0,
      loanAdvForm: 0,
      approved: false,
    });
  }

  private mapRecordToRow(record: ApplicationFormRecord): PayrollProcessRow {
    const detail = record.detail;
    const remuneration = detail?.remuneration;
    const employeeCode = record.EmployeeCode || detail?.loginDetails.employeeCode || '';
    const employeeName = detail?.personalInfo.personName || record.EmployeeName;
    // Application Form "Gross Salary" is stored in remuneration.basicSalary.
    const grossSalary = this.parseAmount(remuneration?.basicSalary ?? 0);
    const medicalAllowance = computeMedicalAllowance(grossSalary);
    const basicSalary = computeBasicSalary(grossSalary, medicalAllowance);
    const allowedLiters = this.parseFuelLiters(remuneration?.fuelLimit);
    const profileFuelAmount = this.parseAmount(remuneration?.fuelAllowances ?? 0);
    // Prefer a derived per-liter rate from profile fuel amount; otherwise Fuel Price Adjust is the rate.
    const monthlyFuelRate =
      allowedLiters > 0 && profileFuelAmount > 0
        ? profileFuelAmount / allowedLiters
        : 0;
    const lastMonthGrossSalary = this.resolveLastMonthGrossSalary(
      record.EmployeeCode,
      grossSalary,
    );

    return this.recalculateRow({
      apiId: record.apiId ?? record.EmployeeCode,
      employeeCode,
      personName: employeeName,
      username: detail?.loginDetails.userId || employeeCode,
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
      overtimeApplicable: this.isYesFlag(remuneration?.overTimeApplicable),
      allowancesApplicable: this.isYesFlag(remuneration?.allowancesApplicable),
      eobiApplicable: this.isYesFlag(remuneration?.eobiApplicable),
      basicSalary,
      grossSalary,
      medicalAllowance,
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
      providentFundEmployer: 0,
      socialSecurityPunjab: 0,
      socialSecurityKpk: 0,
      gratuity: 0,
      eobiEmployee: 0,
      eobiEmployer: 0,
      arrears: 0,
      loanAdjustment: this.resolvePayrollLoanAdjustment(employeeCode, employeeName),
      loanAdvForm: this.resolvePayrollAdvanceDeduction(employeeCode, employeeName),
      approved: false,
    });
  }

  private recalculateRow(row: PayrollProcessRow): PayrollProcessRow {
    // Gross comes from Application Form; medical and basic are derived from it.
    const grossSalary = row.grossSalary > 0 ? row.grossSalary : row.basicSalary;
    const medicalAllowance = computeMedicalAllowance(grossSalary);
    const basicSalary = computeBasicSalary(grossSalary, medicalAllowance);
    const providentFund = computeProvidentFund(basicSalary);

    const effectiveFuelRate = row.monthlyFuelRate + this.fuelPriceAdjust();
    const fuelAllowance = row.allowancesApplicable
      ? computeFuelAllowance(row.allowedLiters, effectiveFuelRate)
      : 0;
    const mobileAllowance = row.allowancesApplicable ? row.mobileAllowance : 0;
    const carAllowance = row.allowancesApplicable ? row.carAllowance : 0;
    const otherAllowances = row.allowancesApplicable ? row.otherAllowances : 0;

    const overtimeHours = row.overtimeApplicable ? row.overtimeHours : 0;
    const overtime = row.overtimeApplicable
      ? computeOvertimeAmount(computeOvertimeRate(row.lastMonthGrossSalary), overtimeHours)
      : 0;

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
      basicSalary,
      medicalAllowance,
      grossSalary,
      fuelAllowance,
      mobileAllowance,
      carAllowance,
      otherAllowances,
      overtimeHours,
      overtime,
      providentFund,
      providentFundEmployer: providentFund,
      socialSecurityPunjab: 0,
      socialSecurityKpk: 0,
      yearsOfService,
      gratuity,
      eobiEmployee,
      eobiEmployer,
    };
  }

  /** Reads application-form Fuel Limit (liters), tolerating formatted API values. */
  private parseFuelLiters(value: string | number | null | undefined): number {
    const formatted = this.applicationFormService.formatFuelLimitForForm(value);
    if (!formatted) {
      return 0;
    }
    return this.parseAmount(formatted.replace(/,/g, ''));
  }

  private isYesFlag(value: string | undefined): boolean {
    const normalized = (value ?? '').trim().toLowerCase();
    return normalized === 'yes' || normalized === 'y' || normalized === '1' || normalized === 'true';
  }

  private resolvePayrollLoanAdjustment(employeeCode: string, employeeName: string): number {
    const loanRecord = this.findLoanAdvanceRecord(employeeCode, employeeName, false);
    if (!loanRecord) {
      return 0;
    }

    return this.parseAmount(
      loanRecord.RepaymentSchedule.installmentAmount ||
        loanRecord.RepaymentSchedule.deductionAmount ||
        loanRecord.LoanDetail.newLoanRequest.installmentAmount ||
        '0',
    );
  }

  private resolvePayrollAdvanceDeduction(employeeCode: string, employeeName: string): number {
    const advanceRecord = this.findLoanAdvanceRecord(employeeCode, employeeName, true);
    if (!advanceRecord) {
      return 0;
    }

    return this.parseAmount(
      advanceRecord.AdvanceDetail.advanceAmountToBeDeductedThisMonth ||
        advanceRecord.RepaymentSchedule.deductionAmount ||
        advanceRecord.AdvanceDetail.newAdvanceRequest.advanceAmountRequested ||
        '0',
    );
  }

  private findLoanAdvanceRecord(
    employeeCode: string,
    employeeName: string,
    salaryAdvance: boolean,
  ): LoanAdvanceRecord | undefined {
    const normalizedCode = employeeCode.trim().toLowerCase();
    const normalizedName = employeeName.trim().toLowerCase();
    const selectedPayrollMonth = this.getSelectedPayrollMonth();

    return [...this.loanAdvanceService.loans()]
      .sort((left, right) => right.Id - left.Id)
      .find((record) => {
        const requestType = this.resolveLoanRequestType(record);
        const matchesRequestType = salaryAdvance
          ? requestType === 'salary advance' || requestType === 'salary_advance' || requestType === 'advance'
          : requestType === 'loan';

        if (!matchesRequestType) {
          return false;
        }

        const recordEmployeeCode = (record.EmployeeID || record.HeaderInfo.employeeID || '').trim().toLowerCase();
        const recordEmployeeName = (record.EmployeeName || record.HeaderInfo.employeeName || '').trim().toLowerCase();
        const matchesEmployee =
          (normalizedCode && recordEmployeeCode === normalizedCode) ||
          (!normalizedCode && normalizedName && recordEmployeeName === normalizedName) ||
          (normalizedCode && recordEmployeeName === normalizedName);

        if (!matchesEmployee) {
          return false;
        }

        const recordPayrollMonth = this.normalizePayrollMonth(
          record.PayrollMonth || record.HeaderInfo.payrollMonth || '',
        );

        return !recordPayrollMonth || recordPayrollMonth === selectedPayrollMonth;
      });
  }

  private resolveLoanRequestType(record: LoanAdvanceRecord): string {
    return (record.RequestType || record.HeaderInfo.requestType || '').trim().toLowerCase();
  }

  private getSelectedPayrollMonth(): string {
    return `${this.selectedYear()}-${String(this.selectedMonth()).padStart(2, '0')}`;
  }

  private normalizePayrollMonth(value: string): string {
    const trimmed = value.trim();
    const directMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
    if (directMatch) {
      return `${directMatch[1]}-${directMatch[2]}`;
    }

    const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-\d{2}$/);
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2]}`;
    }

    return '';
  }

  private resolveLastMonthGrossSalary(employeeCode: string, grossSalary: number): number {
    const cached = this.lastMonthGrossSalaryCache.get(employeeCode);
    if (cached !== undefined) {
      return cached;
    }

    const priorRecords = this.payrollSetupService
      .records()
      .filter((record) => record.employeeId === employeeCode)
      .sort((a, b) => b.id - a.id);

    const result =
      priorRecords.length > 0
        ? computeGrossSalary(priorRecords[0].basicSalary, priorRecords[0].medicalAllowance)
        : grossSalary;

    this.lastMonthGrossSalaryCache.set(employeeCode, result);
    return result;
  }

  private buildYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear - 5; year <= currentYear + 5; year += 1) {
      years.push(year);
    }
    return years;
  }

  private loadLoggedInUserProfile(): void {
    const sessionUserId = this.authService.getSessionUserId();
    const employeeRecord = this.applicationFormService.getSignedInUserRecord(sessionUserId);

    if (!employeeRecord) {
      this.refreshLoggedInUserFields();
      return;
    }

    const existingUserId = employeeRecord.detail?.loginDetails.userId?.trim();
    if (existingUserId) {
      this.loggedInUserId.set(existingUserId);
      this.loggedInUserName.set(this.resolveLoggedInUserName(employeeRecord));
      this.cdr.markForCheck();
      return;
    }

    const apiId = employeeRecord.apiId;
    if (!apiId) {
      this.refreshLoggedInUserFields();
      return;
    }

    this.applicationFormService.fetchEmployeeProfileDetail(apiId).subscribe({
      next: (record) => {
        const userId = record.detail?.loginDetails.userId?.trim();
        if (userId) {
          this.loggedInUserId.set(userId);
        } else {
          this.loggedInUserId.set(this.resolveLoggedInUserId(record));
        }

        const name =
          record.EmployeeName?.trim() ||
          record.detail?.loginDetails.employeeName?.trim() ||
          record.detail?.personalInfo.personName?.trim();
        if (name) {
          this.loggedInUserName.set(name);
        } else {
          this.loggedInUserName.set(this.resolveLoggedInUserName(record));
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.refreshLoggedInUserFields();
      },
    });
  }

  private refreshLoggedInUserFields(): void {
    this.loggedInUserId.set(this.resolveLoggedInUserId());
    this.loggedInUserName.set(this.resolveLoggedInUserName());
    this.cdr.markForCheck();
  }

  private resolveLoggedInUserId(record?: ApplicationFormRecord): string {
    const employeeRecord =
      record ??
      this.applicationFormService.getSignedInUserRecord(this.authService.getSessionUserId());
    const loginUserId = employeeRecord?.detail?.loginDetails.userId?.trim();
    if (loginUserId) {
      return loginUserId;
    }

    const sessionUser = this.authService.getSessionUser();
    if (sessionUser?.id) {
      return String(sessionUser.id);
    }

    return this.authService.getSessionUserId()?.trim() || '—';
  }

  private resolveLoggedInUserName(record?: ApplicationFormRecord): string {
    const employeeRecord =
      record ??
      this.applicationFormService.getSignedInUserRecord(this.authService.getSessionUserId());
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
