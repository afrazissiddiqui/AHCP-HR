import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import {
  TerminationDuesPayable,
  TerminationFormDetail,
  TerminationRecoverableAmount,
  TerminationRecord,
  TerminationService,
} from '../../../../services/termination.service';

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
export class AddTerminationComponent implements AfterViewInit, OnDestroy {
  private readonly sectionIds = [
    'header-section',
    'dues-payable-section',
    'recoverable-amount-section',
  ] as const;

  private sectionObserver: IntersectionObserver | null = null;

  constructor(
    private readonly router: Router,
    private readonly terminationService: TerminationService,
    private readonly alertService: AlertService
  ) {
    this.employeeId.set(String(this.terminationService.getNextEmployeeId()));
  }

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
    ])
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
    ])
  );

  protected readonly validationTouched = signal(false);

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

  protected async save(): Promise<void> {
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

    const duesPayable: TerminationDuesPayable = {
      fromDate: this.duesFromDate().trim(),
      toDate: this.duesToDate().trim(),
      noOfDaysSalaryNotPaid: this.noOfDaysSalaryNotPaid().trim(),
      salaryPayable: this.salaryPayable().trim(),
      gratuity: this.gratuity().trim(),
      overtimeAmount: this.overtimeAmount().trim(),
      noticePay: this.noticePay().trim(),
      leaveEncashmentAmount: this.leaveEncashmentAmount().trim(),
      otherPayables: this.otherPayables().trim(),
    };

    const recoverableAmount: TerminationRecoverableAmount = {
      salaryAdvances: this.salaryAdvances().trim(),
      outstandingLoanBalance: this.outstandingLoanBalance().trim(),
      incomeTaxDeductions: this.incomeTaxDeductions().trim(),
      noticePay: this.recoverableNoticePay().trim(),
      leaveWithoutPay: this.leaveWithoutPay().trim(),
      assetsHandledOver: this.assetsHandledOver() || '—',
      assetRecovered: this.assetRecovered() || '—',
      assetRecoveryName: this.assetRecoveryName().trim(),
      otherRecoverableAmounts: this.otherRecoverableAmounts().trim(),
      sss: this.sss().trim(),
    };

    const detail: TerminationFormDetail = {
      duesPayable,
      recoverableAmount,
      totalDuesPayable: this.totalDuesPayable(),
      totalRecoverableAmount: this.totalRecoverableAmount(),
    };

    const record: TerminationRecord = {
      EmployeeId: employeeId,
      EmployeeName: employeeName,
      Department: this.department().trim() || '—',
      EmployeeCategory: this.employeeCategory().trim() || '—',
      Designation: this.designation().trim() || '—',
      BranchLocation: this.branchLocation().trim() || '—',
      CostCenter: this.costCenter().trim() || '—',
      WorkGradeLevel: this.workGradeLevel().trim() || '—',
      LastWorkingDay: lastWorkingDay,
      YearOfService: yearOfService,
      ReleasingDate: this.releasingDate().trim() || '—',
      GrossMonthlySalary: this.grossMonthlySalary().trim() || '—',
      CommitteeMeetingHeld: this.committeeMeetingHeld() || '—',
      selected: false,
      detail,
    };

    this.terminationService.addTerminationRecord(record);
    await this.alertService.successAndWait('Saved', 'Termination saved successfully.');
    void this.router.navigateByUrl('/termination');
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

  private sumAmounts(values: string[]): number {
    return values.reduce((sum, value) => sum + this.toAmount(value), 0);
  }

  private toAmount(value: string): number {
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
      }
    );

    for (const section of sections) {
      this.sectionObserver.observe(section);
    }
  }
}
