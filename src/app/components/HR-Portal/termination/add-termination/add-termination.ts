import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import {
  FinalSettlementAddPayload,
  TerminationRecord,
  TerminationService,
} from '../../../../services/termination.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';

function emptyIfDash(value: string): string {
  return value === '—' ? '' : value;
}

@Component({
  selector: 'app-add-termination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-termination.html',
  styleUrls: [
    '../../Application-Form/create-job-requisition/create-job-requisition.css',
    './add-termination.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTerminationComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly sectionIds = [
    'header-section',
    'dues-payable-section',
    'recoverable-amount-section',
  ] as const;

  private sectionObserver: IntersectionObserver | null = null;

  protected editingId: string | null = null;
  protected pageTitle = 'Termination Form';
  protected submitButtonLabel = 'Save Termination';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly terminationService: TerminationService,
    private readonly alertService: AlertService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  protected readonly activeSection = signal('header-section');

  protected readonly employeeId = signal('');
  protected readonly employeeName = signal('');
  protected readonly department = signal('');
  protected readonly employeeCategory = signal('');
  protected readonly designation = signal('');
  protected readonly branchLocation = signal('');
  protected readonly costCenter = signal('');
  protected readonly workGradeLevel = signal('');
  protected readonly lastWorkingDay = signal('');
  protected readonly yearOfService = signal('');
  protected readonly releasingDate = signal('');
  protected readonly grossMonthlySalary = signal('');
  protected readonly committeeMeetingHeld = signal<'Yes' | 'No' | ''>('');

  protected readonly duesFromDate = signal('');
  protected readonly duesToDate = signal('');
  protected readonly noOfDaysSalaryNotPaid = signal('');
  protected readonly salaryPayable = signal('');
  protected readonly gratuity = signal('');
  protected readonly overtimeAmount = signal('');
  protected readonly noticePay = signal('');
  protected readonly leaveEncashmentAmount = signal('');
  protected readonly otherPayables = signal('');

  protected readonly salaryAdvances = signal('');
  protected readonly outstandingLoanBalance = signal('');
  protected readonly incomeTaxDeductions = signal('');
  protected readonly recoverableNoticePay = signal('');
  protected readonly leaveWithoutPay = signal('');
  protected readonly assetsHandledOver = signal<'Yes' | 'No' | ''>('');
  protected readonly assetRecovered = signal<'Yes' | 'No' | ''>('');
  protected readonly assetRecoveryName = signal('');
  protected readonly otherRecoverableAmounts = signal('');
  protected readonly sss = signal('');

  protected readonly totalDuesPayable = computed(() =>
    this.sumAmounts([
      this.salaryPayable(),
      this.gratuity(),
      this.overtimeAmount(),
      this.noticePay(),
      this.leaveEncashmentAmount(),
      this.otherPayables(),
    ]),
  );

  protected readonly totalRecoverableAmount = computed(() =>
    this.sumAmounts([
      this.salaryAdvances(),
      this.outstandingLoanBalance(),
      this.incomeTaxDeductions(),
      this.recoverableNoticePay(),
      this.leaveWithoutPay(),
      this.otherRecoverableAmounts(),
      this.sss(),
    ]),
  );

  protected readonly validationTouched = signal(false);

  ngOnInit(): void {
    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update Termination';
    this.submitButtonLabel = 'Update Termination';

    this.terminationService.fetchFinalSettlementDetail(editId).subscribe({
      next: (record) => {
        this.populateFromRecord(record);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load termination for edit.'),
        );
      },
    });
  }

  ngAfterViewInit(): void {
    this.initializeSectionObserver();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.sectionObserver = null;
  }

  protected scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  protected back(): void {
    void this.router.navigateByUrl('/termination');
  }

  protected save(): void {
    this.validationTouched.set(true);

    const employeeId = Number(this.employeeId().trim());
    const employeeName = this.employeeName().trim();
    const lastWorkingDay = this.lastWorkingDay().trim();
    const yearOfService = Number(this.yearOfService().trim());

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      void this.alertService.validation('Please enter a valid Employee ID.');
      this.scrollToSection('header-section');
      return;
    }
    if (!employeeName || !lastWorkingDay) {
      void this.alertService.validation('Please enter Employee Name and Last Working Day.');
      this.scrollToSection('header-section');
      return;
    }
    if (!Number.isFinite(yearOfService) || yearOfService < 0) {
      void this.alertService.validation('Please enter a valid Year of Service.');
      this.scrollToSection('header-section');
      return;
    }

    const payload = this.buildPayload();
    const request$ = this.editingId
      ? this.terminationService.updateFinalSettlement(this.editingId, payload)
      : this.terminationService.addFinalSettlement(payload);

    request$.subscribe({
      next: async (response) => {
        if (response?.status === false || response?.success === false) {
          const fallback = this.editingId
            ? 'Failed to update termination.'
            : 'Failed to save termination.';
          this.alertService.error('Error', response.message || fallback);
          return;
        }

        const title = this.editingId ? 'Updated' : 'Saved';
        const message = this.editingId
          ? response?.message || 'Termination updated successfully.'
          : response?.message || 'Termination saved successfully.';
        await this.alertService.successAndWait(title, message);
        this.terminationService.fetchFinalSettlements().subscribe();
        void this.router.navigateByUrl('/termination');
      },
      error: (error: unknown) => {
        const fallback = this.editingId
          ? 'Failed to update termination.'
          : 'Failed to save termination.';
        this.alertService.error('Error', formatApiErrorMessage(error, fallback));
      },
    });
  }

  protected isInvalid(field: 'employeeId' | 'employeeName' | 'lastWorkingDay' | 'yearOfService'): boolean {
    if (!this.validationTouched()) {
      return false;
    }

    if (field === 'employeeId') {
      const id = Number(this.employeeId().trim());
      return !Number.isFinite(id) || id <= 0;
    }
    if (field === 'employeeName') {
      return !this.employeeName().trim();
    }
    if (field === 'lastWorkingDay') {
      return !this.lastWorkingDay().trim();
    }
    const years = Number(this.yearOfService().trim());
    return !Number.isFinite(years) || years < 0;
  }

  private populateFromRecord(record: TerminationRecord): void {
    this.employeeId.set(record.EmployeeId > 0 ? String(record.EmployeeId) : '');
    this.employeeName.set(emptyIfDash(record.EmployeeName));
    this.department.set(emptyIfDash(record.Department));
    this.employeeCategory.set(emptyIfDash(record.EmployeeCategory));
    this.designation.set(emptyIfDash(record.Designation));
    this.branchLocation.set(emptyIfDash(record.BranchLocation));
    this.costCenter.set(emptyIfDash(record.CostCenter));
    this.workGradeLevel.set(emptyIfDash(record.WorkGradeLevel));
    this.lastWorkingDay.set(emptyIfDash(record.LastWorkingDay));
    this.yearOfService.set(record.YearOfService > 0 ? String(record.YearOfService) : '');
    this.releasingDate.set(emptyIfDash(record.ReleasingDate));
    this.grossMonthlySalary.set(emptyIfDash(record.GrossMonthlySalary));
    this.committeeMeetingHeld.set(
      record.CommitteeMeetingHeld === 'Yes' || record.CommitteeMeetingHeld === 'No'
        ? record.CommitteeMeetingHeld
        : '',
    );

    const dues = record.detail?.duesPayable;
    if (dues) {
      this.duesFromDate.set(dues.duesFromDate);
      this.duesToDate.set(dues.duesToDate);
      this.noOfDaysSalaryNotPaid.set(dues.noOfDaysSalaryNotPaid);
      this.salaryPayable.set(dues.salaryPayable);
      this.gratuity.set(dues.gratuity);
      this.overtimeAmount.set(dues.overtimeAmount);
      this.noticePay.set(dues.noticePay);
      this.leaveEncashmentAmount.set(dues.leaveEncashmentAmount);
      this.otherPayables.set(dues.otherPayables);
    }

    const recoverable = record.detail?.recoverableAmount;
    if (recoverable) {
      this.salaryAdvances.set(recoverable.salaryAdvances);
      this.outstandingLoanBalance.set(recoverable.outstandingLoanBalance);
      this.incomeTaxDeductions.set(recoverable.incomeTaxDeductions);
      this.recoverableNoticePay.set(recoverable.recoverableNoticePay);
      this.leaveWithoutPay.set(recoverable.leaveWithoutPay);
      this.assetsHandledOver.set(
        recoverable.assetsHandledOver === 'Yes' || recoverable.assetsHandledOver === 'No'
          ? recoverable.assetsHandledOver
          : '',
      );
      this.assetRecovered.set(
        recoverable.assetRecovered === 'Yes' || recoverable.assetRecovered === 'No'
          ? recoverable.assetRecovered
          : '',
      );
      this.assetRecoveryName.set(recoverable.assetRecoveryName);
      this.otherRecoverableAmounts.set(recoverable.otherRecoverableAmounts);
      this.sss.set(recoverable.sss);
    }
  }

  private buildPayload(): FinalSettlementAddPayload {
    return {
      headerSection: {
        employeeId: Number(this.employeeId().trim()),
        employeeName: this.employeeName().trim(),
        department: this.department().trim(),
        employeeCategory: this.employeeCategory().trim(),
        designation: this.designation().trim(),
        branchLocation: this.branchLocation().trim(),
        costCenter: this.costCenter().trim(),
        workGradeLevel: this.workGradeLevel().trim(),
        lastWorkingDay: this.lastWorkingDay().trim(),
        yearOfService: this.toNumber(this.yearOfService()),
        releasingDate: this.releasingDate().trim(),
        grossMonthlySalary: this.toNumber(this.grossMonthlySalary()),
        committeeMeetingHeld: this.committeeMeetingHeld() || '',
      },
      duesPayable: {
        duesFromDate: this.duesFromDate().trim(),
        duesToDate: this.duesToDate().trim(),
        noOfDaysSalaryNotPaid: this.toNumber(this.noOfDaysSalaryNotPaid()),
        salaryPayable: this.toNumber(this.salaryPayable()),
        gratuity: this.toNumber(this.gratuity()),
        overtimeAmount: this.toNumber(this.overtimeAmount()),
        noticePay: this.toNumber(this.noticePay()),
        leaveEncashmentAmount: this.toNumber(this.leaveEncashmentAmount()),
        otherPayables: this.toNumber(this.otherPayables()),
        totalDuesPayable: this.totalDuesPayable(),
      },
      recoverableAmountSection: {
        salaryAdvances: this.toNumber(this.salaryAdvances()),
        outstandingLoanBalance: this.toNumber(this.outstandingLoanBalance()),
        incomeTaxDeductions: this.toNumber(this.incomeTaxDeductions()),
        recoverableNoticePay: this.toNumber(this.recoverableNoticePay()),
        leaveWithoutPay: this.toNumber(this.leaveWithoutPay()),
        assetsHandledOver: this.assetsHandledOver() || '',
        assetRecovered: this.assetRecovered() || '',
        assetRecoveryName: this.assetRecoveryName().trim(),
        otherRecoverableAmounts: this.toNumber(this.otherRecoverableAmounts()),
        sss: this.toNumber(this.sss()),
        totalRecoverableAmount: this.totalRecoverableAmount(),
      },
    };
  }

  private sumAmounts(values: string[]): number {
    return values.reduce((sum, value) => sum + this.toNumber(value), 0);
  }

  private toNumber(value: string): number {
    const numeric = Number((value ?? '').toString().replace(/,/g, '').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private initializeSectionObserver(): void {
    const sections = this.sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter((section): section is HTMLElement => section !== null);

    if (!sections.length) {
      return;
    }

    const visibleSections = new Map<string, number>();
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const sectionId = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) {
            visibleSections.set(sectionId, entry.intersectionRatio);
          } else {
            visibleSections.delete(sectionId);
          }
        }

        if (!visibleSections.size) {
          return;
        }

        const nextActiveSection = [...visibleSections.entries()].sort((left, right) => {
          return right[1] - left[1];
        })[0]?.[0];

        if (nextActiveSection) {
          this.activeSection.set(nextActiveSection);
        }
      },
      {
        root: null,
        rootMargin: '-120px 0px -55% 0px',
        threshold: [0.2, 0.35, 0.5, 0.7],
      },
    );

    for (const section of sections) {
      this.sectionObserver.observe(section);
    }
  }
}
