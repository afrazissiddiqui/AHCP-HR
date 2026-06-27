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
  buildProbationEvaluationSubmitPayload,
} from '../../../../../services/probation-evaluation.service';
import { AlertService } from '../../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';

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
  remarks: string;
  dateOfJoining: string;
  basicSalary: string;
  apiId?: string;
}

interface ProbationExtensionEntry {
  period: string;
  newProbationEndDate: string;
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
  protected readonly baseProbationEndDate = signal('');
  protected readonly extensionPeriodOptions = ['3 months', '6 months', '9 months'] as const;
  protected readonly extensionEntries = signal<ProbationExtensionEntry[]>([]);
  protected readonly probationCompletion = signal<'Yes' | 'No' | ''>('');
  protected readonly termination = signal<'Yes' | 'No' | ''>('');
  protected readonly terminationEffectiveDate = signal('');
  protected readonly currentSalary = signal('');
  protected readonly adjustmentInSalary = signal('');
  protected readonly adjustmentAmountInSalary = signal('');
  protected readonly effectiveDateOfRevision = signal('');
  protected readonly allowances = signal<Array<{ allowance: string; amount: string; notes: string }>>([]);
  protected readonly revisedSalary = computed(() => {
    const current = this.toAmount(this.currentSalary());
    const adjustment = this.toAmount(this.adjustmentAmountInSalary());
    return current + adjustment;
  });
  protected readonly totalSalary = computed(() => {
    const allowancesTotal = this.allowances().reduce((sum, item) => sum + this.toAmount(item.amount), 0);
    return this.revisedSalary() + allowancesTotal;
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
        this.alertService.error('Load Failed', formatApiErrorMessage(error, 'Failed to load employees for search.'));
      },
    });

    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      this.probationService.fetchProbationEvaluations().subscribe();
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

  protected selectEmployeeFromSuggestion(employee: ProbationEmployeeOption, event?: MouseEvent): void {
    event?.preventDefault();
    this.closeCodeSuggestions();
    this.closeNameSuggestions();

    const applyRecord = (record: ApplicationFormRecord): void => {
      this.populateFromApplicationRecord(record);
      this.applyExistingProbationForEmployee(this.resolveEmployeeCode(record));
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
            this.applyExistingProbationForEmployee(employee.code);
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
    this.applyExistingProbationForEmployee(employee.code);
    this.cdr.markForCheck();
  }

  /** If this employee already has a probation evaluation, load it for update (avoids duplicate API error). */
  private applyExistingProbationForEmployee(employeeCode: string): void {
    if (this.route.snapshot.paramMap.get('id')) {
      return;
    }

    const existing = this.probationService.findProbationByEmployeeCode(employeeCode);
    if (existing?.Id) {
      this.editingId = String(existing.Id);
      this.pageTitle = 'Update Probation Evaluation';
      this.submitButtonLabel = 'Update Probation Evaluation';
      this.populateFromRecord(existing);
      return;
    }

    this.editingId = null;
    this.pageTitle = 'Add Probation Evaluation';
    this.submitButtonLabel = 'Save Probation Evaluation';
  }

  private buildEmployeeOptions(): ProbationEmployeeOption[] {
    return this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toEmployeeOption(record))
      .filter((option) => option.code || option.name);
  }

  private mapApplicationRecordToEmployeeFields(
    record: ApplicationFormRecord,
  ): Omit<ProbationEmployeeOption, 'code' | 'apiId'> {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);
    const personal = record.detail?.personalInfo;
    const requisition = record.detail?.requisition;
    const remuneration = record.detail?.remuneration;
    const designation =
      emptyIfDash(personal?.designation ?? '') ||
      emptyIfDash(record.Designation) ||
      emptyIfDash(requisition?.internalJobTitle ?? '');

    const dateOfJoining = emptyIfDash(remuneration?.dateOfJoining ?? '');
    const basicSalary =
      emptyIfDash(remuneration?.basicSalary ?? '') || emptyIfDash(personal?.roleSalary ?? '');

    return {
      name: emptyIfDash(record.EmployeeName) || emptyIfDash(personal?.personName ?? ''),
      department:
        emptyIfDash(personal?.departmentInAhcp ?? '') || emptyIfDash(record.Department),
      location:
        emptyIfDash(personal?.branchLocation ?? '') ||
        emptyIfDash(requisition?.location ?? '') ||
        emptyIfDash(personal?.city ?? ''),
      designation,
      reportingManager:
        emptyIfDash(personal?.reportingManager ?? '') ||
        emptyIfDash(record.ReportingManager) ||
        emptyIfDash(requisition?.hiringManager ?? ''),
      employeeNature:
        emptyIfDash(personal?.employmentNature ?? '') || emptyIfDash(record.EmployeeNature),
      employeeType:
        emptyIfDash(requisition?.division ?? '') || emptyIfDash(record.EmploymentType),
      gradeWorkLevel:
        emptyIfDash(personal?.workGradeLevel ?? '') ||
        emptyIfDash(requisition?.costCenter ?? ''),
      employmentCategory:
        emptyIfDash(personal?.employmentCategory ?? '') ||
        emptyIfDash(record.EmploymentCategory),
      remarks: emptyIfDash(personal?.remarks ?? ''),
      dateOfJoining,
      basicSalary,
    };
  }

  private toEmployeeOption(record: ApplicationFormRecord): ProbationEmployeeOption {
    const mapped = this.mapApplicationRecordToEmployeeFields(record);

    return {
      code: this.resolveEmployeeCode(record),
      apiId: record.apiId,
      ...mapped,
    };
  }

  private findApplicationRecord(employee: ProbationEmployeeOption): ApplicationFormRecord | undefined {
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
    const mapped = this.mapApplicationRecordToEmployeeFields(record);

    this.employeeCode.set(this.resolveEmployeeCode(record));
    this.employeeName.set(mapped.name);
    this.department.set(mapped.department);
    this.location.set(mapped.location);
    this.designation.set(mapped.designation);
    this.reportingManager.set(mapped.reportingManager);
    this.employeeNature.set(mapped.employeeNature);
    this.employeeType.set(mapped.employeeType);
    this.gradeWorkLevel.set(mapped.gradeWorkLevel);
    this.employmentCategory.set(mapped.employmentCategory);
    this.remarks.set(mapped.remarks);

    if (mapped.basicSalary) {
      this.currentSalary.set(mapped.basicSalary);
      this.recalculateAdjustmentAmountFromPercent();
    }

    this.applyProbationDatesFromJoining(mapped.dateOfJoining);
  }

  private applyProbationDatesFromJoining(dateOfJoining: string): void {
    const joiningDate = dateOfJoining.trim();
    if (!joiningDate) {
      this.probationStartDate.set('');
      this.probationEndDate.set('');
      this.baseProbationEndDate.set('');
      this.extensionEntries.set([]);
      return;
    }

    const probationEnd = this.addMonthsToIsoDate(joiningDate, 2);
    this.probationStartDate.set(joiningDate);
    this.probationEndDate.set(probationEnd);
    this.baseProbationEndDate.set(probationEnd);
    this.extensionEntries.set([]);
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
    this.remarks.set(employee.remarks);

    if (employee.basicSalary) {
      this.currentSalary.set(employee.basicSalary);
      this.recalculateAdjustmentAmountFromPercent();
    }

    this.applyProbationDatesFromJoining(employee.dateOfJoining);
  }

  private buildAllowancesForPayload(): ProbationEvaluationAddPayload['allowances'] {
    const rows = this.allowances()
      .filter((item) => item.allowance.trim() !== '')
      .map((item) => ({
        allowance: item.allowance.trim(),
        amount: this.toAmount(item.amount),
        notes: item.notes.trim(),
      }));
    return rows.length > 0 ? rows : null;
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

  protected onCurrentSalaryChange(value: string): void {
    this.currentSalary.set(value);
    this.recalculateAdjustmentAmountFromPercent();
  }

  protected onAdjustmentPercentChange(value: string): void {
    const sanitized = value.replace(/[^0-9.\-]/g, '');
    this.adjustmentInSalary.set(sanitized);
    this.recalculateAdjustmentAmountFromPercent();
  }

  private recalculateAdjustmentAmountFromPercent(): void {
    const current = this.toAmount(this.currentSalary());
    const percentRaw = this.adjustmentInSalary().trim();
    if (!percentRaw) {
      this.adjustmentAmountInSalary.set('');
      return;
    }
    const percent = Number.parseFloat(percentRaw);
    if (!Number.isFinite(current) || !Number.isFinite(percent)) {
      this.adjustmentAmountInSalary.set('');
      return;
    }
    const amount = Math.round(current * (percent / 100));
    this.adjustmentAmountInSalary.set(String(amount));
  }

  protected addExtensionEntry(): void {
    this.extensionEntries.update((items) => [...items, { period: '', newProbationEndDate: '' }]);
  }

  protected removeExtensionEntry(index: number): void {
    this.extensionEntries.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
    this.recalculateExtensionEntries();
  }

  protected onProbationEndDateChange(endDate: string): void {
    this.baseProbationEndDate.set(endDate);
    this.probationEndDate.set(endDate);
    this.recalculateExtensionEntries();
  }

  protected onExtensionPeriodChange(index: number, period: string): void {
    this.extensionEntries.update((items) => {
      const updated = [...items];
      updated[index] = { ...updated[index], period };
      return updated;
    });
    this.recalculateExtensionEntries();
  }

  private parseExtensionMonths(period: string): number | null {
    const match = period.trim().match(/^(\d+)\s*month/i);
    if (!match) {
      return null;
    }
    const months = Number.parseInt(match[1], 10);
    return Number.isFinite(months) && months > 0 ? months : null;
  }

  private addMonthsToIsoDate(isoDate: string, monthsToAdd: number): string {
    const parts = isoDate.trim().split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
      return '';
    }
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    date.setMonth(date.getMonth() + monthsToAdd);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private recalculateExtensionEntries(): void {
    const baseEndDate = this.baseProbationEndDate().trim() || this.probationEndDate().trim();
    let rollingEndDate = baseEndDate;

    const updatedEntries = this.extensionEntries().map((entry) => {
      if (!entry.period.trim() || !rollingEndDate) {
        return { ...entry, newProbationEndDate: '' };
      }

      const months = this.parseExtensionMonths(entry.period);
      if (!months) {
        return { ...entry, newProbationEndDate: '' };
      }

      const newEndDate = this.addMonthsToIsoDate(rollingEndDate, months - 1);
      rollingEndDate = newEndDate;
      return { ...entry, newProbationEndDate: newEndDate };
    });

    this.extensionEntries.set(updatedEntries);
    this.probationEndDate.set(rollingEndDate || baseEndDate);
  }

  private getActiveExtensionEntries(): ProbationExtensionEntry[] {
    return this.extensionEntries().filter((entry) => entry.period.trim() !== '');
  }

  private getLatestExtensionEntry(): ProbationExtensionEntry | undefined {
    const activeEntries = this.getActiveExtensionEntries();
    return activeEntries.length > 0 ? activeEntries[activeEntries.length - 1] : undefined;
  }

  private isExtensionActive(): boolean {
    return this.getActiveExtensionEntries().length > 0;
  }

  protected readonly isTerminationYes = computed(() => this.termination() === 'Yes');

  protected onTerminationChange(value: 'Yes' | 'No' | ''): void {
    this.termination.set(value);
    if (value !== 'Yes') {
      this.terminationEffectiveDate.set('');
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
    const validationMessage = this.validateBeforeSubmit();
    if (validationMessage) {
      this.alertService.validation(validationMessage);
      return;
    }

    this.ratingValidationTouched.set(true);
    if (!this.areAllRatingsValid()) {
      this.scrollToSectionById('probation-rating-section');
      return;
    }

    const ratingValues = this.ratings();
    const latestExtension = this.getLatestExtensionEntry();
    const draft: ProbationEvaluationAddPayload = {
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
      probation_completion: this.probationCompletion() || 'No',
      extension_of_probation: {
        probation_start_date: this.probationStartDate(),
        probation_end_date: this.baseProbationEndDate() || this.probationEndDate(),
        is_extension_enabled: this.isExtensionActive(),
        extension_period_in_probation: latestExtension?.period ?? '',
        new_probation_end_date: latestExtension?.newProbationEndDate ?? '',
      },
      termination_of_probation: {
        termination: this.termination() || 'No',
        termination_effective_date: this.terminationEffectiveDate() || null,
      },
      salary_adjustment: {
        currentSalary: this.toAmount(this.currentSalary()),
        adjustmentInSalary: this.toAmount(this.adjustmentInSalary()),
        adjustmentAmountInSalary: this.toAmount(this.adjustmentAmountInSalary()),
        revisedSalary: this.revisedSalary(),
        effectiveDateOfRevision: this.effectiveDateOfRevision(),
      },
      allowances: this.buildAllowancesForPayload(),
      total_salary: this.totalSalary(),
    };

    const payload = buildProbationEvaluationSubmitPayload(draft);

    let saveId = this.editingId;
    if (!saveId) {
      const existing = this.probationService.findProbationByEmployeeCode(payload.employee_code);
      if (existing?.Id) {
        saveId = String(existing.Id);
      }
    }

    const request$ = saveId
      ? this.probationService.updateProbationEvaluation(saveId, payload)
      : this.probationService.addProbationEvaluation(payload);

    request$.subscribe({
      next: () => {
        this.alertService.success(
          'Success',
          saveId ? 'Probation evaluation updated successfully!' : 'Probation evaluation saved successfully!',
        );
        this.cancel();
      },
      error: (error: unknown) => {
        const fallback = saveId
          ? 'Failed to update probation evaluation.'
          : 'Failed to save probation evaluation.';
        this.alertService.error(saveId ? 'Update Failed' : 'Save Failed', formatApiErrorMessage(error, fallback));
      },
    });
  }

  private validateBeforeSubmit(): string | null {
    if (!this.employeeCode().trim() || !this.employeeName().trim()) {
      return 'Please select or enter Employee Code and Employee Name.';
    }
    if (!this.department().trim()) {
      return 'Please enter Department.';
    }
    if (!this.designation().trim()) {
      return 'Please enter Designation.';
    }
    if (this.termination() === 'Yes' && !this.terminationEffectiveDate().trim()) {
      return 'Please enter Termination Effective Date when termination is Yes.';
    }
    if (this.isExtensionActive()) {
      const incompleteExtension = this.getActiveExtensionEntries().find((entry) => !entry.newProbationEndDate.trim());
      if (incompleteExtension) {
        return 'Please ensure each extension has a valid New Probation End Date.';
      }
    }
    const latestExtensionEndDate = this.getLatestExtensionEntry()?.newProbationEndDate ?? '';
    if (
      this.toAmount(this.currentSalary()) > 0 &&
      !this.effectiveDateOfRevision().trim() &&
      !this.probationEndDate().trim() &&
      !latestExtensionEndDate.trim()
    ) {
      return 'Please enter Effective Date of Revision or a probation end date for salary adjustment.';
    }
    return null;
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

    const probationStart =
      emptyIfDash(record.ExtensionOfProbation.probation_start_date) || emptyIfDash(record.ProbationStartDate);
    const probationEnd =
      emptyIfDash(record.ExtensionOfProbation.probation_end_date) || emptyIfDash(record.ProbationEndDate);
    const extensionPeriod = emptyIfDash(record.ExtensionOfProbation.extension_period_in_probation);
    const newProbationEnd = emptyIfDash(record.ExtensionOfProbation.new_probation_end_date);

    this.probationStartDate.set(probationStart);
    this.probationEndDate.set(newProbationEnd || probationEnd);
    this.baseProbationEndDate.set(probationEnd);

    if (record.ExtensionOfProbation.is_extension_enabled && extensionPeriod) {
      this.extensionEntries.set([{ period: extensionPeriod, newProbationEndDate: newProbationEnd }]);
    } else {
      this.extensionEntries.set([]);
    }

    this.probationCompletion.set(
      record.ProbationCompletion === 'Yes' || record.ProbationCompletion === 'No'
        ? record.ProbationCompletion
        : '',
    );

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

    const allowanceList = record.Allowances ?? [];
    this.allowances.set(
      allowanceList.length
        ? allowanceList.map((item) => ({
            allowance: item.allowance,
            amount: item.amount ? String(item.amount) : '',
            notes: item.notes,
          }))
        : [],
    );
  }
}
