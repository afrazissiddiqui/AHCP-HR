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
import { AlertService } from '../../../../../services/alert.service';
import {
  TrainingDevelopmentRecord,
  TrainingDevelopmentService,
  buildTrainingDevelopmentDraftFromForm,
  buildTrainingDevelopmentSubmitPayload,
} from '../../../../../services/training-development.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';

@Component({
  selector: 'app-add-training-development',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-training-development.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddTrainingDevelopmentComponent implements OnInit, AfterViewInit, OnDestroy {
  editingId: string | null = null;
  pageTitle = 'Add Training Development';
  submitButtonLabel = 'Save Training Development';

  private readonly sectionIds = [
    'probation-info-section',
    'probation-rating-section',
    'termination-of-probation-section',
    'salary-adjustment-section',
    'promotion-section'
  ] as const;
  private sectionObserver: IntersectionObserver | null = null;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly alertService: AlertService,
    private readonly trainingService: TrainingDevelopmentService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update Training Development';
    this.submitButtonLabel = 'Update Training Development';

    this.trainingService.fetchTrainingDevelopmentDetail(editId).subscribe({
      next: (record) => {
        this.populateFromRecord(record);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load training & development record for edit.'),
        );
      },
    });
  }

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
  protected readonly jobTitle = signal('');
  protected readonly dateOfJoining = signal('');
  protected readonly reportingManager = signal('');
  protected readonly employeeNature = signal('');
  protected readonly employeeType = signal('');
  protected readonly gradeWorkLevel = signal('');
  protected readonly employmentCategory = signal('');
  protected readonly trainingTitle = signal('');
  protected readonly trainingCategory = signal('');
  protected readonly trainingType = signal('');
  protected readonly trainingStage = signal('');
  protected readonly trainingStartDate = signal('');
  protected readonly trainingEndDate = signal('');
  protected readonly trainer = signal('');
  protected readonly trainingObjectives = signal('');
  protected readonly skillsCovered = signal('');
  protected readonly trainingDetailRemarks = signal('');
  protected readonly trainingCategoryOptions = [
    'Technical',
    'Non-Technical',
    'Other Training'
  ] as const;
  protected readonly trainingTypeOptions = [
    'Drop-down',
    'Internship',
    'Training',
    'External'
  ] as const;
  protected readonly trainingStageOptions = [
    'Drop-down',
    'Training',
    'On-job Training'
  ] as const;
  protected readonly trainingDuration = computed(() => {
    const start = this.trainingStartDate();
    const end = this.trainingEndDate();
    if (!start || !end) {
      return '';
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return '';
    }
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days === 1 ? '' : 's'}`;
  });
  protected readonly probationStartDate = signal('');
  protected readonly probationEndDate = signal('');
  protected readonly extensionProbationStartDate = signal('');
  protected readonly extensionProbationEndDate = signal('');
  protected readonly isExtensionEnabled = signal(false);
  protected readonly extensionPeriodOptions = ['3 months', '6 months', '9 months'] as const;
  protected readonly extensionPeriodInProbation = signal('');
  protected readonly newProbationEndDate = signal('');
  protected readonly evaluationCycleOptions = ['1', '2', '3', '4', '5', '6'] as const;
  protected readonly evaluationCycleNumber = signal('');
  protected readonly evaluationDate = signal('');
  protected readonly evaluationPeriod = signal('6 months');
  protected readonly evaluatorNameOptions = ['HOD', 'Manager', 'Supervisor'] as const;
  protected readonly evaluatorName = signal('');
  protected readonly evaluationParameter = signal('');
  protected readonly parameterRating = signal('');
  protected readonly overallScore = signal('');
  protected readonly performanceRemarks = signal('');
  protected readonly currentSalary = signal('');
  protected readonly incrementAmount = signal('');
  protected readonly incrementPercentage = signal('');
  protected readonly effectiveDateOfRevision = signal('');
  protected readonly reasonForIncrement = signal('');
  protected readonly approvalAuthority = signal('');
  protected readonly promotionRecommended = signal<'Yes' | 'No' | ''>('');
  protected readonly newDesignation = signal('');
  protected readonly promotionEffectiveDate = signal('');
  protected readonly performanceEligibilityCheck = computed(() => {
    const rating = this.toAmount(this.parameterRating());
    if (rating >= 75) {
      return 'Eligible';
    }
    if (rating > 0) {
      return 'Not Eligible';
    }
    return '';
  });
  protected readonly trainingCompletionVerification = signal<'Yes' | 'No' | ''>('');
  protected readonly promotionRemarks = signal('');
  protected readonly allowances = signal<Array<{ allowance: string; amount: string; notes: string }>>([]);
  protected readonly totalSalary = computed(() => {
    const current = this.toAmount(this.currentSalary());
    const adjustment = this.toAmount(this.incrementAmount());
    const allowancesTotal = this.allowances().reduce((sum, item) => sum + this.toAmount(item.amount), 0);
    return current + adjustment + allowancesTotal;
  });
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

  protected onParameterRatingChange(value: string | number | null): void {
    const rawValue = value === null ? '' : String(value);
    const digitsOnly = rawValue.replace(/\D/g, '');
    const numericValue = Math.min(100, Math.max(0, Number(digitsOnly || '0')));
    const normalized = digitsOnly === '' ? '' : numericValue.toString();
    this.parameterRating.set(normalized);
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
    void this.router.navigateByUrl('/employee-action/training-development-form');
  }

  protected back(): void {
    this.cancel();
  }

  protected save(): void {
    if (!this.employeeCode().trim() || !this.employeeName().trim()) {
      void this.alertService.warning('Validation', 'Employee Code and Employee Name are required.');
      return;
    }

    if (!this.trainingTitle().trim()) {
      void this.alertService.warning('Validation', 'Training Title is required.');
      return;
    }

    const draft = buildTrainingDevelopmentDraftFromForm({
      employeeCode: this.employeeCode(),
      employeeName: this.employeeName(),
      department: this.department(),
      location: this.location(),
      designation: this.designation(),
      jobTitle: this.jobTitle(),
      reportingManager: this.reportingManager(),
      employeeNature: this.employeeNature(),
      employeeType: this.employeeType(),
      gradeWorkLevel: this.gradeWorkLevel(),
      employmentCategory: this.employmentCategory(),
      dateOfJoining: this.dateOfJoining(),
      remarks: this.remarks(),
      trainingTitle: this.trainingTitle(),
      trainingCategory: this.trainingCategory(),
      trainingType: this.trainingType(),
      trainingStage: this.trainingStage(),
      trainingStartDate: this.trainingStartDate(),
      trainingEndDate: this.trainingEndDate(),
      trainingDuration: this.trainingDuration(),
      trainer: this.trainer(),
      trainingObjectives: this.trainingObjectives(),
      skillsCovered: this.skillsCovered(),
      trainingDetailRemarks: this.trainingDetailRemarks(),
      evaluationCycleNumber: this.evaluationCycleNumber(),
      evaluationDate: this.evaluationDate(),
      evaluationPeriod: this.evaluationPeriod(),
      evaluatorName: this.evaluatorName(),
      evaluationParameter: this.evaluationParameter(),
      parameterRating: this.parameterRating(),
      overallScore: this.overallScore(),
      performanceRemarks: this.performanceRemarks(),
      currentSalary: this.currentSalary(),
      incrementAmount: this.incrementAmount(),
      incrementPercentage: this.incrementPercentage(),
      revisedSalary: this.revisedSalary(),
      effectiveDateOfRevision: this.effectiveDateOfRevision(),
      reasonForIncrement: this.reasonForIncrement(),
      approvalAuthority: this.approvalAuthority(),
      promotionRecommended: this.promotionRecommended(),
      newDesignation: this.newDesignation(),
      promotionEffectiveDate: this.promotionEffectiveDate(),
      performanceEligibilityCheck: this.performanceEligibilityCheck(),
      trainingCompletionVerification: this.trainingCompletionVerification(),
      promotionRemarks: this.promotionRemarks(),
    });

    const payload = buildTrainingDevelopmentSubmitPayload(draft);
    const request$ = this.editingId
      ? this.trainingService.updateTrainingDevelopment(this.editingId, payload)
      : this.trainingService.addTrainingDevelopment(payload);

    request$.subscribe({
      next: async () => {
        const message = this.editingId
          ? 'Training & development record updated successfully.'
          : 'Training & development record saved successfully.';
        await this.alertService.successAndWait(this.editingId ? 'Updated' : 'Saved', message);
        this.trainingService.fetchTrainingDevelopments().subscribe();
        void this.router.navigateByUrl('/employee-action/training-development-form');
      },
      error: (error: unknown) => {
        const fallback = this.editingId
          ? 'Failed to update training & development record.'
          : 'Failed to save training & development record.';
        void this.alertService.error(
          this.editingId ? 'Update Failed' : 'Save Failed',
          formatApiErrorMessage(error, fallback),
        );
      },
    });
  }

  private populateFromRecord(record: TrainingDevelopmentRecord): void {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);
    const yesNo = (value: string): 'Yes' | 'No' | '' =>
      value === 'Yes' || value === 'No' ? value : '';

    this.employeeCode.set(emptyIfDash(record.EmployeeCode));
    this.employeeName.set(emptyIfDash(record.EmployeeName));
    this.department.set(emptyIfDash(record.Department));
    this.location.set(emptyIfDash(record.Location));
    this.designation.set(emptyIfDash(record.Designation));
    this.jobTitle.set(emptyIfDash(record.JobTitle));
    this.reportingManager.set(emptyIfDash(record.ReportingManager));
    this.employeeNature.set(emptyIfDash(record.EmployeeNature));
    this.employeeType.set(emptyIfDash(record.EmployeeType));
    this.gradeWorkLevel.set(emptyIfDash(record.GradeWorkLevel));
    this.employmentCategory.set(emptyIfDash(record.EmploymentCategory));
    this.dateOfJoining.set(emptyIfDash(record.DateOfJoining));
    this.remarks.set(emptyIfDash(record.Remarks));

    const detail = record.TrainingDetail;
    this.trainingTitle.set(emptyIfDash(detail.training_title));
    this.trainingCategory.set(emptyIfDash(detail.training_category));
    this.trainingType.set(emptyIfDash(detail.training_type));
    this.trainingStage.set(emptyIfDash(detail.training_stage));
    this.trainingStartDate.set(emptyIfDash(detail.training_start_date));
    this.trainingEndDate.set(emptyIfDash(detail.training_end_date));
    this.trainer.set(emptyIfDash(detail.trainer));
    this.trainingObjectives.set(emptyIfDash(detail.training_objectives));
    this.skillsCovered.set(emptyIfDash(detail.skills_covered));
    this.trainingDetailRemarks.set(emptyIfDash(detail.remarks));

    const evaluation = record.TrainingEvaluation;
    this.evaluationCycleNumber.set(emptyIfDash(evaluation.evaluation_cycle_number));
    this.evaluationDate.set(emptyIfDash(evaluation.evaluation_date));
    this.evaluationPeriod.set(emptyIfDash(evaluation.evaluation_period) || '6 months');
    this.evaluatorName.set(emptyIfDash(evaluation.evaluator_name));
    this.evaluationParameter.set(emptyIfDash(evaluation.evaluation_parameter));
    this.parameterRating.set(
      evaluation.parameter_rating ? String(evaluation.parameter_rating) : '',
    );
    this.overallScore.set(emptyIfDash(evaluation.overall_score));
    this.performanceRemarks.set(emptyIfDash(evaluation.performance_remarks));

    const salary = record.Salary;
    this.currentSalary.set(salary.current_salary ? String(salary.current_salary) : '');
    this.incrementAmount.set(salary.increment_amount ? String(salary.increment_amount) : '');
    this.incrementPercentage.set(
      salary.increment_percentage ? String(salary.increment_percentage) : '',
    );
    this.effectiveDateOfRevision.set(emptyIfDash(salary.effective_date_of_revision));
    this.reasonForIncrement.set(emptyIfDash(salary.reason_for_increment));
    this.approvalAuthority.set(emptyIfDash(salary.approval_authority));

    const promotion = record.Promotion;
    this.promotionRecommended.set(yesNo(promotion.promotion_recommended));
    this.newDesignation.set(emptyIfDash(promotion.new_designation));
    this.promotionEffectiveDate.set(emptyIfDash(promotion.promotion_effective_date));
    this.trainingCompletionVerification.set(yesNo(promotion.training_completion_verification));
    this.promotionRemarks.set(emptyIfDash(promotion.remarks));
  }
}
