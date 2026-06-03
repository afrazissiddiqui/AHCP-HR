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
import {
  ProbationEvaluationAddPayload,
  ProbationEvaluationRecord,
  ProbationEvaluationService,
} from '../../../../../services/probation-evaluation.service';
import { AlertService } from '../../../../../services/alert.service';

type RatingKey =
  | 'communication_skills'
  | 'technical_skills'
  | 'attendance'
  | 'discipline'
  | 'teamwork'
  | 'productivity';

interface ProbationEmployeeOption {
  code: string;
  name: string;
  department: string;
  location: string;
  designation: string;
  reportingManager: string;
  employeeNature: string;
  employeeType: string;
  gradeWorkLevel: string;
  employmentCategory: string;
  apiId?: string;
}

@Component({
  selector: 'app-add-probation-evaluation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-probation-evaluation.html',
  styleUrls: [
    '../../../job-specification-form/create-job-specification/create-job-specification.css',
    './add-probation-evaluation.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProbationEvaluationComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add Probation Evaluation';
  submitButtonLabel = 'Save Probation Evaluation';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly probationService: ProbationEvaluationService,
    private readonly applicationFormService: ApplicationFormService,
    private readonly alertService: AlertService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  protected readonly ratingParameters: Array<{ key: RatingKey; label: string }> = [
    { key: 'communication_skills', label: 'Communication Skills' },
    { key: 'technical_skills', label: 'Technical Skills' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'teamwork', label: 'Teamwork' },
    { key: 'productivity', label: 'Productivity' },
  ];

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

  protected readonly ratings = signal<Record<RatingKey, { rating: string; remarks: string }>>({
    communication_skills: { rating: '', remarks: '' },
    technical_skills: { rating: '', remarks: '' },
    attendance: { rating: '', remarks: '' },
    discipline: { rating: '', remarks: '' },
    teamwork: { rating: '', remarks: '' },
    productivity: { rating: '', remarks: '' },
  });

  private readonly employeeOptions = signal<ProbationEmployeeOption[]>([]);
  protected readonly codeSuggestionsOpen = signal(false);
  protected readonly nameSuggestionsOpen = signal(false);

  protected readonly codeSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeCode()),
  );

  protected readonly nameSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeName()),
  );

  ngOnInit(): void {
    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: () => {
        this.employeeOptions.set(this.buildEmployeeOptions());
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to load employees for search.';
        this.alertService.error('Load Failed', errorMessage);
      },
    });

    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update Probation Evaluation';
    this.submitButtonLabel = 'Update Probation Evaluation';

    const existing = this.probationService.findProbationById(editId);
    if (existing) {
      this.populateFromRecord(existing);
      this.cdr.markForCheck();
      return;
    }

    this.probationService.fetchProbationEvaluations().subscribe({
      next: (records) => {
        const record = records.find((item) => String(item.Id) === editId);
        if (record) {
          this.populateFromRecord(record);
        } else {
          this.alertService.warning('Edit', 'Probation evaluation not found.');
        }
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to load probation evaluation for edit.';
        this.alertService.error('Load Failed', errorMessage);
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

  protected selectEmployeeFromSuggestion(employee: ProbationEmployeeOption): void {
    this.closeCodeSuggestions();
    this.closeNameSuggestions();
    this.populateFromEmployeeOption(employee);

    if (!employee.apiId) {
      return;
    }

    this.applicationFormService.fetchEmployeeProfileDetail(employee.apiId).subscribe({
      next: (record) => {
        this.populateFromApplicationRecord(record);
        this.cdr.markForCheck();
      },
    });
  }

  private buildEmployeeOptions(): ProbationEmployeeOption[] {
    return this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toEmployeeOption(record))
      .filter((option) => option.code || option.name);
  }

  private toEmployeeOption(record: ApplicationFormRecord): ProbationEmployeeOption {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);

    return {
      code: this.resolveEmployeeCode(record),
      name: emptyIfDash(record.EmployeeName),
      department: emptyIfDash(record.Department),
      location:
        emptyIfDash(record.detail?.requisition.location ?? '') ||
        emptyIfDash(record.detail?.personalInfo.city ?? ''),
      designation: emptyIfDash(record.Designation),
      reportingManager: emptyIfDash(record.ReportingManager),
      employeeNature: emptyIfDash(record.EmployeeNature),
      employeeType: emptyIfDash(record.EmploymentType),
      gradeWorkLevel: emptyIfDash(record.detail?.requisition.costCenter ?? ''),
      employmentCategory: emptyIfDash(record.EmploymentCategory),
      apiId: record.apiId,
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

  private filterEmployeeSuggestions(query: string): ProbationEmployeeOption[] {
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

  private populateFromEmployeeOption(employee: ProbationEmployeeOption): void {
    this.employeeCode.set(employee.code);
    this.employeeName.set(employee.name);
    this.department.set(employee.department);
    this.location.set(employee.location);
    this.designation.set(employee.designation);
    this.reportingManager.set(employee.reportingManager);
    this.employeeNature.set(employee.employeeNature);
    this.employeeType.set(employee.employeeType);
    this.gradeWorkLevel.set(employee.gradeWorkLevel);
    this.employmentCategory.set(employee.employmentCategory);
  }

  private populateFromApplicationRecord(record: ApplicationFormRecord): void {
    this.populateFromEmployeeOption(this.toEmployeeOption(record));
  }

  protected addAllowance(): void {
    this.allowances.update((items) => [...items, { allowance: '', amount: '', notes: '' }]);
  }

  protected updateAllowance(index: number, field: 'allowance' | 'amount' | 'notes', value: string): void {
    this.allowances.update((items) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  protected removeAllowance(index: number): void {
    this.allowances.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
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
  protected readonly supervisionRemark = signal('');
  protected readonly ratingValidationTouched = signal(false);

  protected onPercentageChange(key: RatingKey, value: string | number | null): void {
    const rawValue = value === null ? '' : String(value);
    const digitsOnly = rawValue.replace(/\D/g, '');
    const numericValue = Math.min(100, Math.max(0, Number(digitsOnly || '0')));
    const normalized = digitsOnly === '' ? '' : numericValue.toString();

    this.ratings.update((current) => ({
      ...current,
      [key]: { ...current[key], rating: normalized },
    }));
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

  protected isRatingInvalid(key: RatingKey): boolean {
    if (!this.ratingValidationTouched()) {
      return false;
    }
    return !this.isRatingValidValue(this.ratings()[key].rating);
  }

  protected areAllRatingsValid(): boolean {
    return this.ratingParameters.every((row) => this.isRatingValidValue(this.ratings()[row.key].rating));
  }

  protected onRatingRemarkChange(key: RatingKey, value: string): void {
    this.ratings.update((current) => ({
      ...current,
      [key]: { ...current[key], remarks: value },
    }));
  }

  private scrollToSectionById(sectionId: string): void {
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  protected cancel(): void {
    void this.router.navigateByUrl('/employee-action/probation-evaluation-form');
  }

  protected back(): void {
    this.cancel();
  }

  protected save(): void {
    if (!this.employeeCode().trim() || !this.employeeName().trim()) {
      this.alertService.validation('Please enter Employee Code and Employee Name at minimum.');
      return;
    }

    this.ratingValidationTouched.set(true);
    if (!this.areAllRatingsValid()) {
      this.scrollToSectionById('probation-rating-section');
      return;
    }

    const ratingValues = this.ratings();
    const payload: ProbationEvaluationAddPayload = {
      employee_code: this.employeeCode().trim(),
      employee_name: this.employeeName().trim(),
      department: this.department().trim(),
      location: this.location().trim(),
      designation: this.designation().trim(),
      reporting_manager: this.reportingManager().trim(),
      employee_nature: this.employeeNature().trim(),
      employee_type: this.employeeType().trim(),
      grade_work_level: this.gradeWorkLevel().trim(),
      employment_category: this.employmentCategory().trim(),
      probation_start_date: this.probationStartDate(),
      probation_end_date: this.probationEndDate(),
      remarks: this.remarks().trim(),
      probation_rating: {
        communication_skills: {
          rating: Number(ratingValues.communication_skills.rating),
          remarks: ratingValues.communication_skills.remarks.trim(),
        },
        technical_skills: {
          rating: Number(ratingValues.technical_skills.rating),
          remarks: ratingValues.technical_skills.remarks.trim(),
        },
        attendance: {
          rating: Number(ratingValues.attendance.rating),
          remarks: ratingValues.attendance.remarks.trim(),
        },
        discipline: {
          rating: Number(ratingValues.discipline.rating),
          remarks: ratingValues.discipline.remarks.trim(),
        },
        teamwork: {
          rating: Number(ratingValues.teamwork.rating),
          remarks: ratingValues.teamwork.remarks.trim(),
        },
        productivity: {
          rating: Number(ratingValues.productivity.rating),
          remarks: ratingValues.productivity.remarks.trim(),
        },
      },
      supervision_remark: this.supervisionRemark().trim(),
      extension_of_probation: {
        probation_start_date: this.extensionProbationStartDate(),
        probation_end_date: this.extensionProbationEndDate(),
        is_extension_enabled: this.isExtensionEnabled(),
        extension_period_in_probation: this.extensionPeriodInProbation(),
        new_probation_end_date: this.newProbationEndDate(),
      },
      termination_of_probation: {
        termination: this.termination() || 'No',
        termination_effective_date: this.terminationEffectiveDate() || null,
      },
      salary_adjustment: {
        currentSalary: this.toAmount(this.currentSalary()),
        adjustmentInSalary: this.toAmount(this.adjustmentInSalary()),
        adjustmentAmountInSalary: this.toAmount(this.adjustmentAmountInSalary()),
        effectiveDateOfRevision: this.effectiveDateOfRevision(),
      },
      allowances: this.allowances()
        .filter((item) => item.allowance.trim() !== '')
        .map((item) => ({
          allowance: item.allowance.trim(),
          amount: this.toAmount(item.amount),
          notes: item.notes.trim(),
        })),
      total_salary: this.totalSalary(),
    };

    const request$ = this.editingId
      ? this.probationService.updateProbationEvaluation(this.editingId, payload)
      : this.probationService.addProbationEvaluation(payload);

    request$.subscribe({
      next: () => {
        this.alertService.success(
          'Success',
          this.editingId
            ? 'Probation evaluation updated successfully!'
            : 'Probation evaluation saved successfully!',
        );
        this.cancel();
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          (this.editingId ? 'Failed to update probation evaluation.' : 'Failed to save probation evaluation.');
        this.alertService.error(this.editingId ? 'Update Failed' : 'Save Failed', errorMessage);
      },
    });
  }

  private populateFromRecord(record: ProbationEvaluationRecord): void {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);

    this.employeeCode.set(emptyIfDash(record.EmployeeCode));
    this.employeeName.set(emptyIfDash(record.EmployeeName));
    this.department.set(emptyIfDash(record.Department));
    this.location.set(emptyIfDash(record.Location));
    this.designation.set(emptyIfDash(record.Designation));
    this.reportingManager.set(emptyIfDash(record.ReportingManager));
    this.employeeNature.set(emptyIfDash(record.EmployeeNature));
    this.employeeType.set(emptyIfDash(record.EmployeeType));
    this.gradeWorkLevel.set(emptyIfDash(record.GradeWorkLevel));
    this.employmentCategory.set(emptyIfDash(record.EmploymentCategory));
    this.probationStartDate.set(emptyIfDash(record.ProbationStartDate));
    this.probationEndDate.set(emptyIfDash(record.ProbationEndDate));
    this.remarks.set(emptyIfDash(record.Remarks));
    this.supervisionRemark.set(emptyIfDash(record.SupervisionRemark));

    this.ratings.set({
      communication_skills: {
        rating: record.ProbationRating.communication_skills.rating
          ? String(record.ProbationRating.communication_skills.rating)
          : '',
        remarks: record.ProbationRating.communication_skills.remarks,
      },
      technical_skills: {
        rating: record.ProbationRating.technical_skills.rating
          ? String(record.ProbationRating.technical_skills.rating)
          : '',
        remarks: record.ProbationRating.technical_skills.remarks,
      },
      attendance: {
        rating: record.ProbationRating.attendance.rating ? String(record.ProbationRating.attendance.rating) : '',
        remarks: record.ProbationRating.attendance.remarks,
      },
      discipline: {
        rating: record.ProbationRating.discipline.rating ? String(record.ProbationRating.discipline.rating) : '',
        remarks: record.ProbationRating.discipline.remarks,
      },
      teamwork: {
        rating: record.ProbationRating.teamwork.rating ? String(record.ProbationRating.teamwork.rating) : '',
        remarks: record.ProbationRating.teamwork.remarks,
      },
      productivity: {
        rating: record.ProbationRating.productivity.rating ? String(record.ProbationRating.productivity.rating) : '',
        remarks: record.ProbationRating.productivity.remarks,
      },
    });

    this.extensionProbationStartDate.set(emptyIfDash(record.ExtensionOfProbation.probation_start_date));
    this.extensionProbationEndDate.set(emptyIfDash(record.ExtensionOfProbation.probation_end_date));
    this.isExtensionEnabled.set(record.ExtensionOfProbation.is_extension_enabled);
    this.extensionPeriodInProbation.set(emptyIfDash(record.ExtensionOfProbation.extension_period_in_probation));
    this.newProbationEndDate.set(emptyIfDash(record.ExtensionOfProbation.new_probation_end_date));

    this.termination.set(
      record.TerminationOfProbation.termination === 'Yes' || record.TerminationOfProbation.termination === 'No'
        ? record.TerminationOfProbation.termination
        : '',
    );
    this.terminationEffectiveDate.set(record.TerminationOfProbation.termination_effective_date ?? '');

    this.currentSalary.set(record.SalaryAdjustment.currentSalary ? String(record.SalaryAdjustment.currentSalary) : '');
    this.adjustmentInSalary.set(
      record.SalaryAdjustment.adjustmentInSalary ? String(record.SalaryAdjustment.adjustmentInSalary) : '',
    );
    this.adjustmentAmountInSalary.set(
      record.SalaryAdjustment.adjustmentAmountInSalary ? String(record.SalaryAdjustment.adjustmentAmountInSalary) : '',
    );
    this.effectiveDateOfRevision.set(emptyIfDash(record.SalaryAdjustment.effectiveDateOfRevision));

    this.allowances.set(
      record.Allowances.length
        ? record.Allowances.map((item) => ({
            allowance: item.allowance,
            amount: item.amount ? String(item.amount) : '',
            notes: item.notes,
          }))
        : [],
    );
  }
}
