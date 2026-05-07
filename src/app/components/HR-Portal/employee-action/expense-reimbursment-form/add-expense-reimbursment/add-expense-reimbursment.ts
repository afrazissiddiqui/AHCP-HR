import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../../services/alert.service';

@Component({
  selector: 'app-add-expense-reimbursment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-expense-reimbursment.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddExpenseReimbursmentComponent implements AfterViewInit, OnDestroy {
  private readonly sectionIds = [
    'header-feilds-section',
    'expense-detail-section',
    'travel-section'
  ] as const;
  private sectionObserver: IntersectionObserver | null = null;

  constructor(
    private readonly router: Router,
    private readonly alertService: AlertService
  ) {}

  protected readonly formNumber = signal('');
  protected readonly activeSection = signal('header-feilds-section');
  protected readonly employeeCode = signal('');
  protected readonly headerEmployeeName = signal('');
  protected readonly claimMonth = signal('');
  protected readonly headerFormNumber = computed(() => {
    const code = this.employeeCode().trim() || 'AUTO';
    return `ERF-${code}-${new Date().getFullYear()}`;
  });
  protected readonly submissionDate = computed(() => new Date().toISOString().slice(0, 10));
  protected readonly departmentAuto = computed(() => this.resolveEmployeeMeta().department);
  protected readonly designationAuto = computed(() => this.resolveEmployeeMeta().designation);
  protected readonly costCenterAuto = computed(() => this.resolveEmployeeMeta().costCenter);
  protected readonly employeeID = signal('');
  protected readonly employeeName = signal('');
  protected readonly department = signal('');
  protected readonly expenseType = signal('');
  protected readonly claimAmount = signal('');
  protected readonly claimDate = signal('');
  protected readonly approvalStatus = signal('');
  protected readonly remarks = signal('');
  protected readonly travelFrom = signal('');
  protected readonly travelTo = signal('');
  protected readonly dailyAllowanceApplicable = signal<'Yes' | 'No' | ''>('');
  protected readonly dailyAllowanceRate = signal('');
  protected readonly dailyAllowanceRateOptions = ['2000', '1500', '1000', '600'] as const;
  protected readonly numberOfDays = computed(() => {
    const from = this.travelFrom();
    const to = this.travelTo();
    if (!from || !to) {
      return '';
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate < fromDate) {
      return '';
    }
    const diffMs = toDate.getTime() - fromDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return days.toString();
  });
  protected readonly dailyAllowanceAmount = computed(() => {
    if (this.dailyAllowanceApplicable() !== 'Yes') {
      return '';
    }
    const days = Number(this.numberOfDays() || '0');
    const rate = Number(this.dailyAllowanceRate() || '0');
    if (!Number.isFinite(days) || !Number.isFinite(rate) || days <= 0 || rate <= 0) {
      return '';
    }
    return (days * rate).toString();
  });
  protected readonly travelRemarks = signal('');

  private readonly employeeDirectory: Record<string, { name: string; department: string; designation: string; costCenter: string }> = {
    '1001': { name: 'Ahsan Khan', department: 'Finance', designation: 'Analyst', costCenter: 'CC-110' },
    '1002': { name: 'Sara Ali', department: 'HR', designation: 'Executive', costCenter: 'CC-210' },
    '1003': { name: 'Bilal Ahmed', department: 'Operations', designation: 'Coordinator', costCenter: 'CC-310' }
  };

  ngAfterViewInit(): void {
    this.initializeSectionObserver();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.sectionObserver = null;
  }

  protected back(): void {
    void this.router.navigateByUrl('/employee-action/expense-reimbursement-form');
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
    console.log('Expense reimbursment payload:', {
      headerFeilds: {
        employeeCode: this.employeeCode(),
        employeeName: this.headerEmployeeName(),
        department: this.departmentAuto(),
        designation: this.designationAuto(),
        costCenter: this.costCenterAuto(),
        claimMonth: this.claimMonth(),
        formNumber: this.headerFormNumber(),
        submissionDate: this.submissionDate()
      },
      formNumber: this.formNumber(),
      employeeID: this.employeeID(),
      employeeName: this.employeeName(),
      department: this.department(),
      expenseType: this.expenseType(),
      claimAmount: this.claimAmount(),
      claimDate: this.claimDate(),
      approvalStatus: this.approvalStatus(),
      remarks: this.remarks(),
      travel: {
        travelFromDate: this.travelFrom(),
        travelToDate: this.travelTo(),
        dailyAllowanceApplicable: this.dailyAllowanceApplicable(),
        dailyAllowanceRate: this.dailyAllowanceRate(),
        numberOfDays: this.numberOfDays(),
        dailyAllowanceAmount: this.dailyAllowanceAmount(),
        remarks: this.travelRemarks()
      }
    });
    await this.alertService.successAndWait('Saved', 'Expense reimbursment submitted successfully.');
    void this.router.navigateByUrl('/employee-action/expense-reimbursement-form');
  }

  private resolveEmployeeMeta(): { department: string; designation: string; costCenter: string } {
    const byCode = this.employeeDirectory[this.employeeCode().trim()];
    if (byCode) {
      return {
        department: byCode.department,
        designation: byCode.designation,
        costCenter: byCode.costCenter
      };
    }
    const byName = Object.values(this.employeeDirectory).find(
      (item) => item.name.toLowerCase() === this.headerEmployeeName().trim().toLowerCase()
    );
    if (byName) {
      return {
        department: byName.department,
        designation: byName.designation,
        costCenter: byName.costCenter
      };
    }
    return {
      department: '',
      designation: '',
      costCenter: ''
    };
  }
}
