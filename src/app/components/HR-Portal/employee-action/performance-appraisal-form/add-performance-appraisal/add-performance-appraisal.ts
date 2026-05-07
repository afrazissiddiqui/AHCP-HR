import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../../services/alert.service';

@Component({
  selector: 'app-add-performance-appraisal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-performance-appraisal.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddPerformanceAppraisalComponent implements AfterViewInit, OnDestroy {
  private readonly sectionIds = [
    'increment-section',
    'promotion-section',
    'other-benefits-section'
  ] as const;
  private sectionObserver: IntersectionObserver | null = null;

  constructor(
    private readonly router: Router,
    private readonly alertService: AlertService
  ) {}

  protected readonly formNumber = signal('');
  protected readonly employeeID = signal('');
  protected readonly employeeName = signal('');
  protected readonly employeeCategory = signal('');
  protected readonly activeSection = signal('increment-section');
  protected readonly workGradeLevel = signal('');
  protected readonly employmentNature = signal('');
  protected readonly department = signal('');
  protected readonly designation = signal('');
  protected readonly jobTitle = signal('');
  protected readonly reportingManager = signal('');
  protected readonly dateOfJoining = signal('');
  protected readonly employmentType = signal('');
  protected readonly appraisalAuthority = signal('');
  protected readonly appraisalPeriod = signal('');
  protected readonly currentSalary = signal('');
  protected readonly evaluationDate = signal('');
  protected readonly incrementAmount = signal('');
  protected readonly incrementPercentage = signal('');
  protected readonly incrementEffectiveDate = signal('');
  protected readonly reasonForIncrement = signal('');
  protected readonly revisedSalary = computed(() => {
    const current = this.toAmount(this.currentSalary());
    const amount = this.toAmount(this.incrementAmount());
    const percentage = this.toAmount(this.incrementPercentage());
    if (current === 0) {
      return '';
    }
    const increment = amount > 0 ? amount : percentage > 0 ? (current * percentage) / 100 : 0;
    return (current + increment).toFixed(2);
  });
  protected readonly promotionRecommended = signal<'Yes' | 'No' | ''>('');
  protected readonly newDesignation = signal('');
  protected readonly promotionEffectiveDate = signal('');
  protected readonly promotionRemarks = signal('');
  protected readonly existingBenefitsDetails = signal('');
  protected readonly newBenefits = signal('');

  ngAfterViewInit(): void {
    this.initializeSectionObserver();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.sectionObserver = null;
  }

  protected back(): void {
    void this.router.navigateByUrl('/employee-action/performance-appraisal-form');
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

  private toAmount(value: string): number {
    const numeric = Number((value ?? '').toString().replace(/,/g, '').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }

  protected async save(): Promise<void> {
    console.log('Performance appraisal payload:', {
      formNumber: this.formNumber(),
      employeeID: this.employeeID(),
      employeeName: this.employeeName(),
      employeeCategory: this.employeeCategory(),
      workGradeLevel: this.workGradeLevel(),
      employmentNature: this.employmentNature(),
      department: this.department(),
      designation: this.designation(),
      jobTitle: this.jobTitle(),
      reportingManager: this.reportingManager(),
      dateOfJoining: this.dateOfJoining(),
      employmentType: this.employmentType(),
      appraisalAuthority: this.appraisalAuthority(),
      appraisalPeriod: this.appraisalPeriod(),
      currentSalary: this.currentSalary(),
      evaluationDate: this.evaluationDate(),
      increment: {
        currentSalary: this.currentSalary(),
        incrementPercentage: this.incrementPercentage(),
        incrementEffectiveDate: this.incrementEffectiveDate(),
        reasonForIncrement: this.reasonForIncrement(),
        incrementAmount: this.incrementAmount(),
        revisedSalary: this.revisedSalary()
      },
      promotion: {
        promotionRecommended: this.promotionRecommended(),
        newDesignation: this.newDesignation(),
        promotionEffectiveDate: this.promotionEffectiveDate()
        ,
        remarks: this.promotionRemarks()
      },
      otherBenefits: {
        existingBenefitsDetails: this.existingBenefitsDetails(),
        newBenefits: this.newBenefits()
      }
    });
    await this.alertService.successAndWait('Saved', 'Performance appraisal submitted successfully.');
    void this.router.navigateByUrl('/employee-action/performance-appraisal-form');
  }
}
