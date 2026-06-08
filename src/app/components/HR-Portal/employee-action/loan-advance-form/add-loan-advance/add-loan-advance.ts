import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../../services/alert.service';
import { LoanAdvanceService } from '../../../../../services/loan-advance.service';
import { ApplicationFormService, ApplicationFormRecord } from '../../../../../services/application-form.service';

@Component({
  selector: 'app-add-loan-advance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-loan-advance.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddLoanAdvanceComponent implements AfterViewInit, OnDestroy {
  private readonly sectionIds = [
    'header-info-section',
    'loan-detail-section',
    'advance-detail-section',
    'repayment-schedule-section'
  ] as const;
  private sectionObserver: IntersectionObserver | null = null;

  constructor(
    private readonly router: Router,
    private readonly alertService: AlertService,
    private readonly loanAdvanceService: LoanAdvanceService,
    private readonly applicationFormService: ApplicationFormService
  ) {}

  protected readonly activeSection = signal('header-info-section');
  protected readonly documentNo = signal(this.generateDocumentNo());
  protected readonly headerEmployeeID = signal('');
  protected readonly headerEmployeeName = signal('');
  protected readonly employeeSearchText = signal('');
  protected readonly showEmployeeDropdown = signal(false);
  protected readonly filteredEmployees = computed(() => {
    const searchText = this.employeeSearchText().trim().toLowerCase();
    if (!searchText) return [];
    const employees = this.applicationFormService.getApplicationRecords();
    return employees.filter((emp) =>
      emp.EmployeeName.toLowerCase().includes(searchText) ||
      emp.EmployeeCode.toString().includes(searchText)
    );
  });
  protected readonly designation = signal('');
  protected readonly location = signal('');
  protected readonly requestType = signal('');
  protected readonly requestDate = signal(this.getTodayDate());
  protected readonly status = signal('Draft');
  protected readonly joiningDate = signal('');
  protected readonly department = signal('');
  protected readonly payrollMonth = signal(this.getCurrentPayrollMonth());
  protected readonly yearsOfService = computed(() => {
    const joining = this.joiningDate();
    if (!joining) {
      return '';
    }
    const joiningDate = new Date(joining);
    if (Number.isNaN(joiningDate.getTime())) {
      return '';
    }
    const now = new Date();
    let years = now.getFullYear() - joiningDate.getFullYear();
    const monthDiff = now.getMonth() - joiningDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < joiningDate.getDate())) {
      years--;
    }
    return years < 0 ? '' : `${years}`;
  });
  protected readonly existingLoan = signal<'Yes' | 'No' | ''>('');
  protected readonly loanAcquiredDate = signal('');
  protected readonly installmentNumber = signal('');
  protected readonly loanEndingDate = signal('');
  protected readonly previousInstallmentAmount = signal('');
  protected readonly previousLoanPurpose = signal('');
  protected readonly loanAmount = signal('');
  protected readonly loanAmountDeductedTillNow = signal('');
  protected readonly loanBalance = signal('');
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

  ngAfterViewInit(): void {
    this.initializeSectionObserver();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.sectionObserver = null;
  }

  protected back(): void {
    void this.router.navigateByUrl('/employee-action/loan-advance-form');
  }

  protected onEmployeeSearchChange(text: string): void {
    this.employeeSearchText.set(text);
    this.showEmployeeDropdown.set(text.trim().length > 0);
  }

  protected selectEmployee(employee: ApplicationFormRecord): void {
    this.headerEmployeeID.set(employee.EmployeeCode.toString());
    this.headerEmployeeName.set(employee.EmployeeName);
    this.employeeSearchText.set('');
    this.showEmployeeDropdown.set(false);
    this.department.set(employee.Department);
    this.designation.set(employee.Designation);
  }

  protected closeEmployeeDropdown(): void {
    this.showEmployeeDropdown.set(false);
    this.employeeSearchText.set('');
  }

  protected onEmployeeCodeChange(code: string): void {
    this.employeeSearchText.set(code);
    this.showEmployeeDropdown.set(code.trim().length > 0);
  }

  protected onEmployeeNameChange(name: string): void {
    this.employeeSearchText.set(name);
    this.showEmployeeDropdown.set(name.trim().length > 0);
  }

  private generateDocumentNo(): string {
    return `LA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private getCurrentPayrollMonth(): string {
    const today = new Date();
    return today.toISOString().slice(0, 7);
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
        threshold: [0.2, 0.35, 0.5, 0.7]
      }
    );

    for (const section of sections) {
      this.sectionObserver.observe(section);
    }
  }

  protected async save(): Promise<void> {
    const payload = {
      headerInfo: {
        documentNo: this.documentNo(),
        requestType: this.requestType(),
        employeeID: this.headerEmployeeID(),
        employeeName: this.headerEmployeeName(),
        department: this.department(),
        designation: this.designation(),
        location: this.location(),
        joiningDate: this.joiningDate(),
        yearsOfService: this.yearsOfService(),
        requestDate: this.requestDate(),
        payrollMonth: this.payrollMonth(),
        status: this.status(),
        employeeNature: '',
        employmentType: '',
        workGradeLevel: '',
        jobTitle: '',
        employeeCategory: '',
        reportingManager: ''
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

    this.loanAdvanceService.submitLoanAdvance(payload).subscribe({
      next: async (response) => {
        if (response.status) {
          await this.alertService.successAndWait('Saved', response.message || 'Loan/Advance submitted successfully.');
          void this.router.navigateByUrl('/employee-action/loan-advance-form');
        } else {
          this.alertService.error('Error', response.message || 'Failed to submit loan/advance request.');
        }
      },
      error: (error: any) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to submit loan/advance request.';
        this.alertService.error('Error', errorMessage);
      }
    });
  }
}