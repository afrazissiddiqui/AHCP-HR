import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-probation-evaluation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-probation-evaluation.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    './add-probation-evaluation.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddProbationEvaluationComponent implements AfterViewInit, OnDestroy {
  private readonly sectionIds = [
    'probation-info-section',
    'probation-rating-section',
    'extension-of-probation-section',
    'termination-of-probation-section',
    'salary-adjustment-section'
  ] as const;
  private sectionObserver: IntersectionObserver | null = null;

  constructor(private readonly router: Router) {}

  protected readonly ratingParameters = [
    { key: 'performanceRating', label: 'Performance Rating' },
    { key: 'workQuality', label: 'Work Quality' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'behaviour', label: 'Behaviour' }
  ] as const;

  protected readonly activeSection = signal('probation-info-section');
  protected readonly employeeCode = signal('');
  protected readonly employeeName = signal('');
  protected readonly department = signal('');
  protected readonly location = signal('');
  protected readonly designation = signal('');
  protected readonly reportingManager = signal('');
  protected readonly employeeNature = signal('');
  protected readonly employeeType = signal('');
  protected readonly gradeWorkLevel = signal('');
  protected readonly employmentCategory = signal('');
  protected readonly probationStartDate = signal('');
  protected readonly probationEndDate = signal('');
  protected readonly extensionProbationStartDate = signal('');
  protected readonly extensionProbationEndDate = signal('');
  protected readonly isExtensionEnabled = signal(false);
  protected readonly extensionPeriodOptions = ['3 months', '6 months', '9 months'] as const;
  protected readonly extensionPeriodInProbation = signal('');
  protected readonly newProbationEndDate = signal('');
  protected readonly termination = signal<'Yes' | 'No' | ''>('');
  protected readonly terminationEffectiveDate = signal('');
  protected readonly currentSalary = signal('');
  protected readonly adjustmentInSalary = signal('');
  protected readonly adjustmentAmountInSalary = signal('');
  protected readonly effectiveDateOfRevision = signal('');
  protected readonly allowances = signal<Array<{ allowance: string; amount: string; notes: string }>>([]);
  protected readonly totalSalary = computed(() => {
    const current = this.toAmount(this.currentSalary());
    const adjustment = this.toAmount(this.adjustmentAmountInSalary());
    const allowancesTotal = this.allowances().reduce((sum, item) => sum + this.toAmount(item.amount), 0);
    return current + adjustment + allowancesTotal;
  });

  protected addAllowance(): void {
    this.allowances.update((items) => [...items, { allowance: '', amount: '', notes: '' }]);
  }

  protected updateAllowance(
    index: number,
    field: 'allowance' | 'amount' | 'notes',
    value: string
  ): void {
    this.allowances.update((items) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  protected removeAllowance(index: number): void {
    this.allowances.update((items) => {
      return items.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  private toAmount(value: string): number {
    const numeric = Number((value ?? '').toString().replace(/,/g, '').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }
  protected onExtensionToggle(checked: boolean): void {
    this.isExtensionEnabled.set(checked);
    if (!checked) {
      this.extensionPeriodInProbation.set('');
      this.newProbationEndDate.set('');
    }
  }

  protected readonly remarks = signal('');
  protected readonly performanceRating = signal('');
  protected readonly workQuality = signal('');
  protected readonly attendance = signal('');
  protected readonly behaviour = signal('');
  protected readonly performanceRatingRemark = signal('');
  protected readonly workQualityRemark = signal('');
  protected readonly attendanceRemark = signal('');
  protected readonly behaviourRemark = signal('');
  protected readonly supervisionRemark = signal('');
  protected readonly ratingValidationTouched = signal(false);

  ngAfterViewInit(): void {
    this.initializeSectionObserver();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.sectionObserver = null;
  }

  protected onPercentageChange(
    field: 'performanceRating' | 'workQuality' | 'attendance' | 'behaviour',
    value: string | number | null
  ): void {
    const rawValue = value === null ? '' : String(value);
    const digitsOnly = rawValue.replace(/\D/g, '');
    const numericValue = Math.min(100, Math.max(0, Number(digitsOnly || '0')));
    const normalized = digitsOnly === '' ? '' : numericValue.toString();

    if (field === 'performanceRating') {
      this.performanceRating.set(normalized);
      return;
    }
    if (field === 'workQuality') {
      this.workQuality.set(normalized);
      return;
    }
    if (field === 'attendance') {
      this.attendance.set(normalized);
      return;
    }
    this.behaviour.set(normalized);
  }

  protected onRatingKeyDown(event: KeyboardEvent): void {
    if (['-', '+', 'e', 'E', '.'].includes(event.key)) {
      event.preventDefault();
    }
  }

  private isRatingValidValue(value: string): boolean {
    if (value.trim() === '') {
      return false;
    }
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 100;
  }

  protected isRatingInvalid(field: 'performanceRating' | 'workQuality' | 'attendance' | 'behaviour'): boolean {
    if (!this.ratingValidationTouched()) {
      return false;
    }
    return !this.isRatingValidValue(this.getRatingValue(field));
  }

  protected areAllRatingsValid(): boolean {
    return this.ratingParameters.every((row) => this.isRatingValidValue(this.getRatingValue(row.key)));
  }

  protected getRatingValue(field: 'performanceRating' | 'workQuality' | 'attendance' | 'behaviour'): string {
    if (field === 'performanceRating') {
      return this.performanceRating();
    }
    if (field === 'workQuality') {
      return this.workQuality();
    }
    if (field === 'attendance') {
      return this.attendance();
    }
    return this.behaviour();
  }

  protected getRatingRemark(field: 'performanceRating' | 'workQuality' | 'attendance' | 'behaviour'): string {
    if (field === 'performanceRating') {
      return this.performanceRatingRemark();
    }
    if (field === 'workQuality') {
      return this.workQualityRemark();
    }
    if (field === 'attendance') {
      return this.attendanceRemark();
    }
    return this.behaviourRemark();
  }

  protected onRatingRemarkChange(
    field: 'performanceRating' | 'workQuality' | 'attendance' | 'behaviour',
    value: string
  ): void {
    if (field === 'performanceRating') {
      this.performanceRatingRemark.set(value);
      return;
    }
    if (field === 'workQuality') {
      this.workQualityRemark.set(value);
      return;
    }
    if (field === 'attendance') {
      this.attendanceRemark.set(value);
      return;
    }
    this.behaviourRemark.set(value);
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

  protected cancel(): void {
    void this.router.navigateByUrl('/employee-action/probation-evaluation-form');
  }

  protected back(): void {
    this.cancel();
  }

  protected save(): void {
    this.ratingValidationTouched.set(true);
    if (!this.areAllRatingsValid()) {
      this.activeSection.set('probation-rating-section');
      setTimeout(() => {
        const element = document.getElementById('probation-rating-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
      return;
    }

    // TODO: connect to API/service once endpoint is ready.
    console.log('Probation evaluation payload:', {
      employeeCode: this.employeeCode(),
      employeeName: this.employeeName(),
      department: this.department(),
      location: this.location(),
      designation: this.designation(),
      reportingManager: this.reportingManager(),
      employeeNature: this.employeeNature(),
      employeeType: this.employeeType(),
      gradeWorkLevel: this.gradeWorkLevel(),
      employmentCategory: this.employmentCategory(),
      probationStartDate: this.probationStartDate(),
      probationEndDate: this.probationEndDate(),
      extensionOfProbation: {
        enabled: this.isExtensionEnabled(),
        probationStartDate: this.extensionProbationStartDate(),
        probationEndDate: this.extensionProbationEndDate(),
        extensionPeriodInProbation: this.extensionPeriodInProbation(),
        newProbationEndDate: this.newProbationEndDate()
      },
      terminationOfProbation: {
        termination: this.termination(),
        terminationEffectiveDate: this.terminationEffectiveDate()
      },
      salaryAdjustment: {
        currentSalary: this.currentSalary(),
        adjustmentInSalary: this.adjustmentInSalary(),
        adjustmentAmountInSalary: this.adjustmentAmountInSalary(),
        effectiveDateOfRevision: this.effectiveDateOfRevision(),
        allowances: this.allowances(),
        totalSalary: this.totalSalary()
      },
      remarks: this.remarks(),
      probationRating: {
        performanceRating: this.performanceRating(),
        workQuality: this.workQuality(),
        attendance: this.attendance(),
        behaviour: this.behaviour(),
        performanceRatingRemark: this.performanceRatingRemark(),
        workQualityRemark: this.workQualityRemark(),
        attendanceRemark: this.attendanceRemark(),
        behaviourRemark: this.behaviourRemark(),
        supervisionRemark: this.supervisionRemark()
      }
    });
    void this.router.navigateByUrl('/employee-action/probation-evaluation-form');
  }
}
