import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AlertService } from '../../../../../services/alert.service';
import { LoanAdvanceRecord, LoanAdvanceService } from '../../../../../services/loan-advance.service';
import { ApplicationFormService, ApplicationFormRecord } from '../../../../../services/application-form.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import { formatApiToDateSlash, formatDateForInput, formatDateSlashToApi } from '../../../../../utils/date-format.util';
import {
  GL_ACCOUNT_BRANCH_OPTIONS,
  glAccountBranchLabel,
} from '../../../../setup/gl-account-determination/gl-account-branch.options';

interface LoanEmployeeOption {
  code: string;
  name: string;
  department: string;
  designation: string;
  branch: string;
  dateOfJoining: string;
  employeeNature: string;
  employmentType: string;
  workGradeLevel: string;
  jobTitle: string;
  employeeCategory: string;
  reportingManager: string;
}

@Component({
  selector: 'app-add-loan-advance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-loan-advance.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css',
    './add-loan-advance.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddLoanAdvanceComponent implements OnInit {
  pageTitle = 'Add Loan/Advance';
  submitButtonLabel = 'Save Loan/Advance';

  get pageSubtitle(): string {
    return 'Submit employee loan or salary advance requests with repayment details.';
  }

  constructor(
    private readonly router: Router,
    private readonly alertService: AlertService,
    private readonly loanAdvanceService: LoanAdvanceService,
    private readonly applicationFormService: ApplicationFormService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  private readonly employeeOptions = signal<LoanEmployeeOption[]>([]);

  protected readonly activeSection = signal('header-info-section');
  protected readonly documentNo = signal(this.generateDocumentNo());
  protected readonly headerEmployeeID = signal('');
  protected readonly headerEmployeeName = signal('');
  protected readonly codeSuggestionsOpen = signal(false);
  protected readonly nameSuggestionsOpen = signal(false);
  protected readonly codeSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.headerEmployeeID()),
  );
  protected readonly nameSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.headerEmployeeName()),
  );
  protected readonly designation = signal('');
  protected readonly branchOptions = GL_ACCOUNT_BRANCH_OPTIONS;
  protected readonly branch = signal('');
  protected readonly employeeNature = signal('');
  protected readonly employmentType = signal('');
  protected readonly workGradeLevel = signal('');
  protected readonly jobTitle = signal('');
  protected readonly employeeCategory = signal('');
  protected readonly reportingManager = signal('');
  protected readonly requestType = signal('');
  protected readonly requestDate = signal(this.getTodayDateDisplay());
  protected readonly status = signal('');
  protected readonly joiningDate = signal('');
  protected readonly department = signal('');
  protected readonly payrollMonth = signal(this.getCurrentPayrollMonth());
  protected readonly yearsOfService = computed(() =>
    this.calculateYearsOfService(this.joiningDate()),
  );
  protected readonly existingLoan = signal<'Yes' | 'No' | ''>('');
  protected readonly loanAcquiredDate = signal('');
  protected readonly installmentNumber = signal('');
  protected readonly loanEndingDate = signal('');
  protected readonly previousInstallmentAmount = signal('');
  protected readonly previousLoanPurpose = signal('');
  protected readonly loanAmount = signal('');
  protected readonly loanAmountDeductedTillNow = signal('');
  protected readonly loanBalance = computed(() =>
    this.calculateBalance(this.loanAmount(), this.loanAmountDeductedTillNow()),
  );
  protected readonly newLoanPurpose = signal('');
  protected readonly loanAmountRequested = signal('');
  protected readonly installmentAmount = signal('');
  protected readonly noOfInstallments = signal('');
  protected readonly loanEndMonth = signal('');
  protected readonly loanStartMonth = signal('');
  protected readonly loanTenure = signal('');
  protected readonly eligibleAmount = signal('');
  protected readonly remarks = signal('');
  protected readonly existingAdvance = signal<'Yes' | 'No' | ''>('');
  protected readonly advanceAcquiredDate = signal('');
  protected readonly previousAdvancePurpose = signal('');
  protected readonly advanceAmount = signal('');
  protected readonly advanceAmountToBeDeductedThisMonth = signal('');
  protected readonly advanceBalance = signal('');
  protected readonly advanceEligibleAmount = signal('');
  protected readonly advanceRemarks = signal('');
  protected readonly newAdvancePurpose = signal('');
  protected readonly newAdvanceAmountEligible = signal('');
  protected readonly newAdvanceAmountRequested = signal('');
  protected readonly repaymentStartDate = signal('');
  protected readonly repaymentFrequency = signal('');
  protected readonly deductionAmount = signal('');
  protected readonly repaymentRemarks = signal('');

  protected readonly isLoanRequest = computed(() => this.requestType() === 'Loan');
  protected readonly isAdvanceRequest = computed(() => this.requestType() === 'Salary Advance');
  protected readonly hasExistingLoanDetails = signal(false);
  protected readonly saving = signal(false);

  ngOnInit(): void {
    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: () => {
        this.employeeOptions.set(this.buildEmployeeOptions());
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load employees for search.'),
        );
      },
    });

    this.loanAdvanceService.fetchLoanAdvances().subscribe({
      error: () => {
        // Keep the form usable even if prior loan history cannot be loaded.
      },
    });
  }

  protected back(): void {
    void this.router.navigateByUrl('/employee-action/loan-advance-form');
  }

  protected selectEmployee(employee: LoanEmployeeOption): void {
    this.closeCodeSuggestions();
    this.closeNameSuggestions();
    this.populateFromEmployeeOption(employee);
    this.cdr.markForCheck();
  }

  protected onEmployeeCodeChange(code: string): void {
    this.headerEmployeeID.set(code);
    this.codeSuggestionsOpen.set(code.trim().length > 0);
    this.closeNameSuggestions();
  }

  protected onEmployeeNameChange(name: string): void {
    this.headerEmployeeName.set(name);
    this.nameSuggestionsOpen.set(name.trim().length > 0);
    this.closeCodeSuggestions();
  }

  protected openCodeSuggestions(): void {
    if (!this.headerEmployeeID().trim()) {
      return;
    }
    this.codeSuggestionsOpen.set(true);
    this.closeNameSuggestions();
  }

  protected openNameSuggestions(): void {
    if (!this.headerEmployeeName().trim()) {
      return;
    }
    this.nameSuggestionsOpen.set(true);
    this.closeCodeSuggestions();
  }

  protected closeCodeSuggestions(): void {
    this.codeSuggestionsOpen.set(false);
  }

  protected closeNameSuggestions(): void {
    this.nameSuggestionsOpen.set(false);
  }

  protected onCodeInputBlur(): void {
    setTimeout(() => this.closeCodeSuggestions(), 150);
  }

  protected onNameInputBlur(): void {
    setTimeout(() => this.closeNameSuggestions(), 150);
  }

  private buildEmployeeOptions(): LoanEmployeeOption[] {
    return this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toEmployeeOption(record))
      .filter((option) => option.code || option.name);
  }

  private toEmployeeOption(record: ApplicationFormRecord): LoanEmployeeOption {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);

    return {
      code: this.resolveEmployeeCode(record),
      name: emptyIfDash(record.EmployeeName),
      department: emptyIfDash(record.Department),
      designation: emptyIfDash(record.Designation),
      branch: glAccountBranchLabel(
        emptyIfDash(record.detail?.personalInfo.branchLocation ?? '') ||
          emptyIfDash(record.detail?.requisition.location ?? ''),
      ),
      dateOfJoining: formatDateForInput(
        emptyIfDash(record.detail?.remuneration?.dateOfJoining ?? ''),
      ),
      employeeNature: emptyIfDash(record.EmployeeNature),
      employmentType: emptyIfDash(record.EmploymentType),
      workGradeLevel: emptyIfDash(record.detail?.requisition.costCenter ?? ''),
      jobTitle:
        emptyIfDash(record.detail?.requisition.internalJobTitle ?? '') ||
        emptyIfDash(record.Designation),
      employeeCategory: emptyIfDash(record.EmploymentCategory),
      reportingManager: emptyIfDash(record.ReportingManager),
    };
  }

  private resolveEmployeeCode(record: ApplicationFormRecord): string {
    const fromLogin = record.detail?.loginDetails.employeeCode?.trim();
    if (fromLogin) {
      return fromLogin;
    }
    if (record.apiId?.trim()) {
      return record.apiId.trim();
    }
    if (record.EmployeeCode) {
      return String(record.EmployeeCode);
    }
    return '';
  }

  private filterEmployeeSuggestions(query: string): LoanEmployeeOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.employeeOptions()
      .filter(
        (employee) =>
          employee.code.toLowerCase().includes(q) ||
          employee.name.toLowerCase().includes(q) ||
          employee.department.toLowerCase().includes(q) ||
          employee.designation.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }

  private populateFromEmployeeOption(employee: LoanEmployeeOption): void {
    this.headerEmployeeID.set(employee.code);
    this.headerEmployeeName.set(employee.name);
    this.department.set(employee.department);
    this.designation.set(employee.designation);
    this.branch.set(employee.branch);
    this.joiningDate.set(employee.dateOfJoining);
    this.employeeNature.set(employee.employeeNature);
    this.employmentType.set(employee.employmentType);
    this.workGradeLevel.set(employee.workGradeLevel);
    this.jobTitle.set(employee.jobTitle);
    this.employeeCategory.set(employee.employeeCategory);
    this.reportingManager.set(employee.reportingManager);
    this.populateExistingLoanDetails(employee.code, employee.name);
  }

  private generateDocumentNo(): string {
    return `LA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private getTodayDateDisplay(): string {
    return formatApiToDateSlash(new Date().toISOString().split('T')[0]);
  }

  private getCurrentPayrollMonth(): string {
    const today = new Date();
    return today.toISOString().slice(0, 7);
  }

  private calculateYearsOfService(joiningDateValue: string): string {
    const joining = joiningDateValue.trim();
    if (!joining) {
      return '';
    }

    const joiningDate = new Date(joining);
    if (Number.isNaN(joiningDate.getTime())) {
      return '';
    }

    const now = new Date();
    if (now.getTime() < joiningDate.getTime()) {
      return '';
    }

    let completedMonths =
      (now.getFullYear() - joiningDate.getFullYear()) * 12 +
      (now.getMonth() - joiningDate.getMonth());
    if (now.getDate() < joiningDate.getDate()) {
      completedMonths--;
    }

    if (completedMonths < 0) {
      return '';
    }

    if (completedMonths < 12) {
      const serviceMonths = completedMonths > 0 ? completedMonths : 1;
      return (serviceMonths / 10).toFixed(1);
    }

    return `${Math.floor(completedMonths / 12)}`;
  }

  private calculateBalance(amountValue: string, deductedValue: string): string {
    const amount = this.parseDecimal(amountValue);
    const deducted = this.parseDecimal(deductedValue);

    if (amount === null && deducted === null) {
      return '';
    }

    const balance = (amount ?? 0) - (deducted ?? 0);
    return Number.isInteger(balance) ? `${balance}` : `${balance.toFixed(2)}`;
  }

  private parseDecimal(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private populateExistingLoanDetails(employeeCode: string, employeeName: string): void {
    const existingLoanRecord = this.findExistingLoanRecord(employeeCode, employeeName);
    if (!existingLoanRecord) {
      this.hasExistingLoanDetails.set(false);
      this.resetExistingLoanFields();
      return;
    }

    this.hasExistingLoanDetails.set(true);
    this.existingLoan.set('Yes');
    this.loanAcquiredDate.set(this.normalizeMonthInput(existingLoanRecord.LoanDetail.loanAcquiredDate));
    this.installmentNumber.set(existingLoanRecord.LoanDetail.installmentNumber?.trim() ?? '');
    this.loanEndingDate.set(this.normalizeMonthInput(existingLoanRecord.LoanDetail.loanEndingDate));
    this.previousInstallmentAmount.set(existingLoanRecord.LoanDetail.previousInstallmentAmount?.trim() ?? '');
    this.previousLoanPurpose.set(existingLoanRecord.LoanDetail.previousLoanPurpose?.trim() ?? '');
    this.loanAmount.set(existingLoanRecord.LoanDetail.loanAmount?.trim() ?? '');
    this.loanAmountDeductedTillNow.set(
      existingLoanRecord.LoanDetail.loanAmountDeductedTillNow?.trim() ?? '',
    );
  }

  private findExistingLoanRecord(
    employeeCode: string,
    employeeName: string,
  ): LoanAdvanceRecord | undefined {
    const normalizedCode = employeeCode.trim().toLowerCase();
    const normalizedName = employeeName.trim().toLowerCase();

    return [...this.loanAdvanceService.loans()]
      .sort((left, right) => right.Id - left.Id)
      .find((record) => {
        if (record.RequestType !== 'Loan') {
          return false;
        }

        const matchesEmployee =
          (normalizedCode && record.EmployeeID.trim().toLowerCase() === normalizedCode) ||
          (!normalizedCode &&
            normalizedName &&
            record.EmployeeName.trim().toLowerCase() === normalizedName);

        if (!matchesEmployee) {
          return false;
        }

        const loanDetail = record.LoanDetail;
        return Boolean(
          (loanDetail.existingLoan || '').trim().toLowerCase() === 'yes' ||
            (loanDetail.loanAmount || '').trim() ||
            (loanDetail.loanAmountDeductedTillNow || '').trim() ||
            (loanDetail.loanBalance || '').trim() ||
            (loanDetail.loanEndingDate || '').trim() ||
            (loanDetail.loanAcquiredDate || '').trim(),
        );
      });
  }

  private resetExistingLoanFields(): void {
    this.existingLoan.set('');
    this.loanAcquiredDate.set('');
    this.installmentNumber.set('');
    this.loanEndingDate.set('');
    this.previousInstallmentAmount.set('');
    this.previousLoanPurpose.set('');
    this.loanAmount.set('');
    this.loanAmountDeductedTillNow.set('');
  }

  private normalizeMonthInput(value: string | undefined): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
      return '';
    }

    const directMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
    if (directMonthMatch) {
      return trimmed;
    }

    const formattedDate = formatDateForInput(trimmed);
    if (formattedDate) {
      return formattedDate.slice(0, 7);
    }

    return '';
  }

  protected scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }

    const payload = {
      headerInfo: {
        documentNo: this.documentNo(),
        requestType: this.requestType(),
        employeeID: this.headerEmployeeID(),
        employeeName: this.headerEmployeeName(),
        department: this.department(),
        designation: this.designation(),
        location: this.branch(),
        joiningDate: this.joiningDate(),
        yearsOfService: this.yearsOfService(),
        requestDate: formatDateSlashToApi(this.requestDate()),
        payrollMonth: this.payrollMonth(),
        status: this.status(),
        employeeNature: this.employeeNature(),
        employmentType: this.employmentType(),
        workGradeLevel: this.workGradeLevel(),
        jobTitle: this.jobTitle(),
        employeeCategory: this.employeeCategory(),
        reportingManager: this.reportingManager(),
      },
      loanDetail: {
        existingLoan: this.existingLoan(),
        loanAcquiredDate: this.loanAcquiredDate(),
        installmentNumber: this.installmentNumber(),
        loanEndingDate: this.loanEndingDate(),
        previousInstallmentAmount: this.previousInstallmentAmount(),
        previousLoanPurpose: this.previousLoanPurpose(),
        loanAmount: this.loanAmount(),
        loanAmountDeductedTillNow: this.loanAmountDeductedTillNow(),
        loanBalance: this.loanBalance(),
        newLoanRequest: {
          purpose: this.newLoanPurpose(),
          loanAmountRequested: this.loanAmountRequested(),
          installmentAmount: this.installmentAmount(),
          noOfInstallments: this.noOfInstallments(),
          loanEndMonth: this.loanEndMonth(),
          loanStartMonth: this.loanStartMonth(),
          loanTenure: this.loanTenure(),
          eligibleAmount: this.eligibleAmount()
        },
        remarks: this.remarks()
      },
      advanceDetail: {
        existingAdvance: this.existingAdvance(),
        advanceAcquiredDate: this.advanceAcquiredDate(),
        advanceEligibleAmount: this.advanceEligibleAmount(),
        previousAdvancePurpose: this.previousAdvancePurpose(),
        advanceRemarks: this.advanceRemarks(),
        advanceAmount: this.advanceAmount(),
        advanceAmountToBeDeductedThisMonth: this.advanceAmountToBeDeductedThisMonth(),
        advanceBalance: this.advanceBalance(),
        newAdvanceRequest: {
          purpose: this.newAdvancePurpose(),
          advanceAmountEligible: this.newAdvanceAmountEligible(),
          advanceAmountRequested: this.newAdvanceAmountRequested()
        }
      },
      repaymentSchedule: {
        repaymentStartDate: this.repaymentStartDate(),
        repaymentFrequency: this.repaymentFrequency(),
        deductionAmount: this.deductionAmount(),
        remarks: this.repaymentRemarks()
      }
    };

    this.saving.set(true);
    this.cdr.markForCheck();

    this.loanAdvanceService
      .submitLoanAdvance(payload)
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: async (response) => {
          if (response.status) {
            await this.alertService.successAndWait('Saved', response.message || 'Loan/Advance submitted successfully.');
            this.loanAdvanceService.fetchLoanAdvances().subscribe();
            void this.router.navigateByUrl('/employee-action/loan-advance-form');
          } else {
            void this.alertService.error('Error', response.message || 'Failed to submit loan/advance request.');
          }
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Error',
            formatApiErrorMessage(error, 'Failed to submit loan/advance request.'),
          );
        },
      });
  }
}
