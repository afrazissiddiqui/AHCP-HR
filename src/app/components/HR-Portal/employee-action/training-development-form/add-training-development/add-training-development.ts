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
import { ActivatedRoute, Router } from '@angular/router';
import {
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../../../services/application-form.service';
import { AlertService } from '../../../../../services/alert.service';
import {
  TrainingDevelopmentRecord,
  TrainingDevelopmentService,
  TrainingEvaluationRowFormInput,
  buildTrainingDevelopmentDraftFromForm,
  buildTrainingDevelopmentSubmitPayload,
} from '../../../../../services/training-development.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';

interface TrainingEmployeeOption {
  code: string;
  name: string;
  apiId?: string;
  department: string;
  location: string;
  designation: string;
  jobTitle: string;
  reportingManager: string;
  employeeNature: string;
  employeeType: string;
  gradeWorkLevel: string;
  employmentCategory: string;
  dateOfJoining: string;
  basicSalary: string;
}

@Component({
  selector: 'app-add-training-development',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-training-development.html',
  styleUrls: [
    '../../../job-specification-form/create-job-specification/create-job-specification.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css',
    './add-training-development.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTrainingDevelopmentComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add Training & Development';
  submitButtonLabel = 'Save Training & Development';

  protected readonly trainingCategoryOptions = [
    'Technical',
    'Non-Technical',
    'Other Training',
  ] as const;

  protected readonly trainingTypeOptions = ['Internal', 'External'] as const;
  protected readonly trainingStageOptions = ['Internship', 'Training', 'On-Job Training'] as const;
  protected readonly departmentApplicabilityOptions = [
    'Production Department',
    'Plant Maintenance Department',
    'Electrical Department',
    'Quality Control Department',
    'Logistics Department',
    'Procurement Department',
    'Admin Department',
    'Accounts & Finance Department',
    'Internal Audit Department',
    'Human Resource (HR) Department',
    'Sales & Marketing Department',
    'IT Department',
    'BOD Department',
    'Common Department',
  ] as const;
  protected readonly evaluationCycleNumberOptions = ['1', '2', '3', '4'] as const;
  protected readonly overallScoreOptions = ['A', 'B', 'C', 'D', 'E'] as const;
  protected readonly performanceEligibilityOptions = ['Eligible', 'Not Eligible'] as const;

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
  protected readonly remarks = signal('');

  protected readonly trainingTitle = signal('');
  protected readonly trainingCategory = signal('');
  protected readonly trainingType = signal('');
  protected readonly trainingStage = signal('');
  protected readonly departmentApplicability = signal('');
  protected readonly trainingStartDate = signal('');
  protected readonly trainingEndDate = signal('');
  protected readonly trainer = signal('');
  protected readonly trainingObjectives = signal('');
  protected readonly skillsCovered = signal('');
  protected readonly trainingDetailRemarks = signal('');

  protected readonly evaluationCycleNumber = signal('');
  protected readonly evaluationDate = signal('');
  protected readonly evaluationPeriod = signal('');
  protected readonly evaluatorName = signal('');
  protected readonly evaluationRows = signal<TrainingEvaluationRowFormInput[]>([
    { evaluationParameter: '', scoring: '', actualScore: '', overallScore: '' },
  ]);
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
  protected readonly performanceEligibilityCheck = signal('');
  protected readonly trainingCompletionVerification = signal<'Yes' | 'No' | ''>('');
  protected readonly promotionRemarks = signal('');

  private readonly employeeOptions = signal<TrainingEmployeeOption[]>([]);
  protected readonly codeSuggestionsOpen = signal(false);
  protected readonly nameSuggestionsOpen = signal(false);

  protected readonly codeSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeCode()),
  );

  protected readonly nameSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeName()),
  );

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
    return `${days} Day${days === 1 ? '' : 's'}`;
  });

  protected readonly revisedSalary = computed(() => {
    const current = this.toAmount(this.currentSalary());
    const amount = this.toAmount(this.incrementAmount());
    const percentage = this.toAmount(this.incrementPercentage());
    if (current === 0) {
      return '';
    }
    const increment = amount > 0 ? amount : percentage > 0 ? (current * percentage) / 100 : 0;
    return String(Math.round(current + increment));
  });

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly alertService: AlertService,
    private readonly trainingService: TrainingDevelopmentService,
    private readonly applicationFormService: ApplicationFormService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

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

    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update Training & Development';
    this.submitButtonLabel = 'Update Training & Development';

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

  protected onEmployeeCodeInput(code: string): void {
    this.employeeCode.set(code);
    if (this.editingId) {
      return;
    }
    this.codeSuggestionsOpen.set(code.trim().length > 0);
    this.closeNameSuggestions();
  }

  protected onEmployeeNameInput(name: string): void {
    this.employeeName.set(name);
    if (this.editingId) {
      return;
    }
    this.nameSuggestionsOpen.set(name.trim().length > 0);
    this.closeCodeSuggestions();
  }

  protected openCodeSuggestions(): void {
    if (this.editingId || !this.employeeCode().trim()) {
      return;
    }
    this.codeSuggestionsOpen.set(true);
    this.closeNameSuggestions();
  }

  protected openNameSuggestions(): void {
    if (this.editingId || !this.employeeName().trim()) {
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

  protected selectEmployeeFromSuggestion(employee: TrainingEmployeeOption, event?: MouseEvent): void {
    event?.preventDefault();
    this.closeCodeSuggestions();
    this.closeNameSuggestions();

    const applyRecord = (record: ApplicationFormRecord): void => {
      this.populateFromApplicationRecord(record);
      this.cdr.markForCheck();
    };

    const localRecord = this.findApplicationRecord(employee);
    const detailId = localRecord?.apiId ?? employee.apiId;

    if (detailId) {
      this.applicationFormService.fetchEmployeeProfileDetail(detailId).subscribe({
        next: applyRecord,
        error: () => {
          if (localRecord) {
            applyRecord(localRecord);
          } else {
            this.populateFromEmployeeOption(employee);
            this.cdr.markForCheck();
          }
        },
      });
      return;
    }

    if (localRecord) {
      applyRecord(localRecord);
      return;
    }

    this.populateFromEmployeeOption(employee);
    this.cdr.markForCheck();
  }

  protected onRatingKeyDown(event: KeyboardEvent): void {
    if (['-', '+', 'e', 'E'].includes(event.key)) {
      event.preventDefault();
    }
  }

  protected addEvaluationRow(): void {
    this.evaluationRows.update((rows) => [
      ...rows,
      { evaluationParameter: '', scoring: '', actualScore: '', overallScore: '' },
    ]);
  }

  protected removeEvaluationRow(index: number): void {
    this.evaluationRows.update((rows) =>
      rows.length <= 1 ? rows : rows.filter((_, rowIndex) => rowIndex !== index),
    );
  }

  protected updateEvaluationRow(
    index: number,
    field: keyof TrainingEvaluationRowFormInput,
    value: string,
  ): void {
    this.evaluationRows.update((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  protected onEvaluationScoreChange(
    index: number,
    field: 'scoring' | 'actualScore',
    value: string | number | null,
  ): void {
    const normalized = this.normalizeRating(value);
    this.updateEvaluationRow(index, field, normalized);
    if (field === 'actualScore') {
      this.syncPerformanceEligibilityFromEvaluation();
    }
  }

  private normalizeRating(value: string | number | null): string {
    const rawValue = value === null ? '' : String(value);
    const digitsOnly = rawValue.replace(/\D/g, '');
    const numericValue = Math.min(100, Math.max(0, Number(digitsOnly || '0')));
    return digitsOnly === '' ? '' : numericValue.toString();
  }

  private syncPerformanceEligibilityFromEvaluation(): void {
    if (this.performanceEligibilityCheck()) {
      return;
    }

    const scores = this.evaluationRows()
      .map((row) => this.toAmount(row.actualScore))
      .filter((score) => score > 0);

    if (scores.length === 0) {
      return;
    }

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    this.performanceEligibilityCheck.set(average >= 75 ? 'Eligible' : 'Not Eligible');
  }

  protected onIncrementAmountChange(value: string | number | null): void {
    this.incrementAmount.set(value === null ? '' : String(value));
    if (this.toAmount(this.incrementAmount()) > 0) {
      this.incrementPercentage.set('');
    }
  }

  protected onIncrementPercentageChange(value: string | number | null): void {
    this.incrementPercentage.set(value === null ? '' : String(value));
    if (this.toAmount(this.incrementPercentage()) > 0) {
      this.incrementAmount.set('');
    }
  }

  protected back(): void {
    void this.router.navigateByUrl('/employee-action/training-development-form');
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
      departmentApplicability: this.departmentApplicability(),
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
      evaluationRows: this.evaluationRows(),
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

  private buildEmployeeOptions(): TrainingEmployeeOption[] {
    return this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toEmployeeOption(record))
      .filter((option) => option.code || option.name);
  }

  private toEmployeeOption(record: ApplicationFormRecord): TrainingEmployeeOption {
    const mapped = this.mapApplicationRecordToEmployeeFields(record);

    return {
      code: this.resolveEmployeeCode(record),
      apiId: record.apiId,
      ...mapped,
    };
  }

  private mapApplicationRecordToEmployeeFields(record: ApplicationFormRecord): Omit<
    TrainingEmployeeOption,
    'code' | 'apiId'
  > {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);
    const personal = record.detail?.personalInfo;
    const requisition = record.detail?.requisition;
    const remuneration = record.detail?.remuneration;
    const designation =
      emptyIfDash(personal?.designation ?? '') ||
      emptyIfDash(record.Designation) ||
      emptyIfDash(requisition?.internalJobTitle ?? '');
    const jobTitle =
      emptyIfDash(requisition?.internalJobTitle ?? '') ||
      emptyIfDash(personal?.designation ?? '') ||
      emptyIfDash(record.Designation);

    return {
      name: emptyIfDash(record.EmployeeName) || emptyIfDash(personal?.personName ?? ''),
      department:
        emptyIfDash(personal?.departmentInAhcp ?? '') ||
        emptyIfDash(record.Department),
      location:
        emptyIfDash(personal?.branchLocation ?? '') ||
        emptyIfDash(requisition?.location ?? '') ||
        emptyIfDash(personal?.city ?? ''),
      designation,
      jobTitle,
      reportingManager:
        emptyIfDash(personal?.reportingManager ?? '') ||
        emptyIfDash(record.ReportingManager) ||
        emptyIfDash(requisition?.hiringManager ?? ''),
      employeeNature:
        emptyIfDash(personal?.employmentNature ?? '') ||
        emptyIfDash(record.EmployeeNature),
      employeeType:
        emptyIfDash(requisition?.division ?? '') ||
        emptyIfDash(record.EmploymentType),
      gradeWorkLevel:
        emptyIfDash(personal?.workGradeLevel ?? '') ||
        emptyIfDash(requisition?.costCenter ?? ''),
      employmentCategory:
        emptyIfDash(personal?.employmentCategory ?? '') ||
        emptyIfDash(record.EmploymentCategory),
      dateOfJoining: emptyIfDash(remuneration?.dateOfJoining ?? ''),
      basicSalary:
        emptyIfDash(remuneration?.basicSalary ?? '') ||
        emptyIfDash(personal?.roleSalary ?? ''),
    };
  }

  private findApplicationRecord(employee: TrainingEmployeeOption): ApplicationFormRecord | undefined {
    const code = employee.code.trim().toLowerCase();
    const apiId = employee.apiId?.trim();

    return this.applicationFormService.getApplicationRecords().find((record) => {
      if (apiId && record.apiId === apiId) {
        return true;
      }
      return code && this.resolveEmployeeCode(record).trim().toLowerCase() === code;
    });
  }

  private populateFromApplicationRecord(record: ApplicationFormRecord): void {
    this.applyEmployeeFields(this.mapApplicationRecordToEmployeeFields(record), this.resolveEmployeeCode(record));
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

  private filterEmployeeSuggestions(query: string): TrainingEmployeeOption[] {
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

  private populateFromEmployeeOption(employee: TrainingEmployeeOption): void {
    this.applyEmployeeFields(employee, employee.code);
  }

  private applyEmployeeFields(
    fields: Omit<TrainingEmployeeOption, 'code' | 'apiId'>,
    employeeCode: string,
  ): void {
    this.employeeCode.set(employeeCode);
    this.employeeName.set(fields.name);
    this.department.set(fields.department);
    this.location.set(fields.location);
    this.designation.set(fields.designation);
    this.jobTitle.set(fields.jobTitle);
    this.reportingManager.set(fields.reportingManager);
    this.employeeNature.set(fields.employeeNature);
    this.employeeType.set(fields.employeeType);
    this.gradeWorkLevel.set(fields.gradeWorkLevel);
    this.employmentCategory.set(fields.employmentCategory);
    this.dateOfJoining.set(fields.dateOfJoining);
    this.currentSalary.set(fields.basicSalary);
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
    this.departmentApplicability.set(emptyIfDash(detail.department_applicability));
    this.trainingStartDate.set(emptyIfDash(detail.training_start_date));
    this.trainingEndDate.set(emptyIfDash(detail.training_end_date));
    this.trainer.set(emptyIfDash(detail.trainer));
    this.trainingObjectives.set(emptyIfDash(detail.training_objectives));
    this.skillsCovered.set(emptyIfDash(detail.skills_covered));
    this.trainingDetailRemarks.set(emptyIfDash(detail.remarks));

    const evaluation = record.TrainingEvaluation;
    this.evaluationCycleNumber.set(emptyIfDash(evaluation.evaluation_cycle_number));
    this.evaluationDate.set(emptyIfDash(evaluation.evaluation_date));
    this.evaluationPeriod.set(emptyIfDash(evaluation.evaluation_period));
    this.evaluatorName.set(emptyIfDash(evaluation.evaluator_name));
    this.evaluationRows.set(
      evaluation.evaluation_rows.length > 0
        ? evaluation.evaluation_rows.map((row) => ({
            evaluationParameter: emptyIfDash(row.evaluation_parameter),
            scoring: row.scoring ? String(row.scoring) : '',
            actualScore: row.actual_score ? String(row.actual_score) : '',
            overallScore: emptyIfDash(row.overall_score),
          }))
        : [{ evaluationParameter: '', scoring: '', actualScore: '', overallScore: '' }],
    );
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
    this.performanceEligibilityCheck.set(emptyIfDash(promotion.performance_eligibility_check));
    this.trainingCompletionVerification.set(yesNo(promotion.training_completion_verification));
    this.promotionRemarks.set(emptyIfDash(promotion.remarks));
  }

  private toAmount(value: string): number {
    const numeric = Number((value ?? '').toString().replace(/,/g, '').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
