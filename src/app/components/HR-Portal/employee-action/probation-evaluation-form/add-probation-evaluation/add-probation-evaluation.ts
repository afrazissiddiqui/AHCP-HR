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
import { formatDateForInput } from '../../../../../utils/date-format.util';
import { sanitizeApiText } from '../../../../../utils/api-text.util';
import { glAccountBranchLabel } from '../../../../setup/gl-account-determination/gl-account-branch.options';

type RatingKey =
  | 'communication_skills'
  | 'technical_skills'
  | 'attendance'
  | 'discipline'
  | 'teamwork'
  | 'productivity';

type ProbationValidationField =
  | 'employeeCode'
  | 'employeeName'
  | 'department'
  | 'designation'
  | 'terminationEffectiveDate'
  | 'effectiveDateOfRevision';

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
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    './add-probation-evaluation.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProbationEvaluationComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add Probation Evaluation';
  submitButtonLabel = 'Save Probation Evaluation';
  protected readonly activeSection = signal('probation-info-section');

  get pageSubtitle(): string {
    return this.editingId
      ? 'Update probation evaluation, performance ratings, and post-probation decisions.'
      : 'Capture probation details, performance ratings, and completion outcomes for an employee.';
  }

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
        if (this.editingId && this.employeeCode().trim()) {
          this.enrichEmployeeFieldsFromApplication(this.employeeCode());
        }
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
      this.enrichEmployeeFieldsFromApplication(this.employeeCode());
      this.cdr.markForCheck();
      return;
    }

    this.probationService.fetchProbationEvaluations().subscribe({
      next: (records) => {
        const record = records.find((item) => String(item.Id) === editId);
        if (record) {
          this.populateFromRecord(record);
          this.enrichEmployeeFieldsFromApplication(this.employeeCode());
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
      const profileFields = this.mapApplicationRecordToEmployeeFields(record);
      const employeeCode = this.resolveEmployeeCode(record);
      this.populateFromApplicationRecord(record);
      this.applyExistingProbationForEmployee(employeeCode, profileFields);
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
            this.applyExistingProbationForEmployee(employee.code, employee);
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
    this.applyExistingProbationForEmployee(employee.code, employee);
    this.cdr.markForCheck();
  }

  /** If this employee already has a probation evaluation, load it for update (avoids duplicate API error). */
  private applyExistingProbationForEmployee(
    employeeCode: string,
    profileFields?: Omit<ProbationEmployeeOption, 'code' | 'apiId'>,
  ): void {
    if (this.route.snapshot.paramMap.get('id')) {
      return;
    }

    const existing = this.probationService.findProbationByEmployeeCode(employeeCode);
    if (existing?.Id) {
      this.editingId = String(existing.Id);
      this.pageTitle = 'Update Probation Evaluation';
      this.submitButtonLabel = 'Update Probation Evaluation';
      this.populateFromRecord(existing);
      if (profileFields) {
        this.applyEmployeeProfileFields(profileFields, employeeCode, { overwrite: true });
      }
      return;
    }

    this.editingId = null;
    this.pageTitle = 'Add Probation Evaluation';
    this.submitButtonLabel = 'Save Probation Evaluation';
    this.resetPostSubmitFields();
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
    const emptyIfDash = (value: string | undefined | null): string =>
      sanitizeApiText(value);
    const personal = record.detail?.personalInfo;
    const requisition = record.detail?.requisition;
    const remuneration = record.detail?.remuneration;
    const login = record.detail?.loginDetails;
    const composedName = [
      emptyIfDash(personal?.firstName),
      emptyIfDash(personal?.middleName),
      emptyIfDash(personal?.lastName),
    ]
      .filter(Boolean)
      .join(' ');
    const branchCode = this.firstNonEmpty(
      emptyIfDash(personal?.branchLocation),
      emptyIfDash(requisition?.location),
    );
    const branchLabel = glAccountBranchLabel(branchCode);
    const designation = this.firstNonEmpty(
      emptyIfDash(personal?.designation),
      emptyIfDash(record.Designation),
      emptyIfDash(requisition?.internalJobTitle),
    );

    return {
      name: this.firstNonEmpty(
        emptyIfDash(record.EmployeeName),
        emptyIfDash(personal?.personName),
        composedName,
        emptyIfDash(login?.employeeName),
      ),
      department: this.firstNonEmpty(
        emptyIfDash(personal?.departmentInAhcp),
        emptyIfDash(record.Department),
        emptyIfDash(requisition?.department),
      ),
      location: this.firstNonEmpty(
        branchLabel,
        branchCode,
        emptyIfDash(personal?.city),
        emptyIfDash(requisition?.location),
      ),
      designation,
      reportingManager: this.firstNonEmpty(
        emptyIfDash(personal?.reportingManager),
        emptyIfDash(record.ReportingManager),
        emptyIfDash(requisition?.hiringManager),
      ),
      employeeNature: this.normalizeEmployeeNature(
        this.firstNonEmpty(
          emptyIfDash(personal?.employmentNature),
          emptyIfDash(record.EmployeeNature),
          emptyIfDash(requisition?.company),
        ),
      ),
      employeeType: this.firstNonEmpty(
        emptyIfDash(personal?.employmentStatus),
        emptyIfDash(record.status),
      ),
      gradeWorkLevel: this.firstNonEmpty(
        emptyIfDash(personal?.workGradeLevel),
        emptyIfDash(personal?.roleSalary),
        emptyIfDash(record.detail?.hrSettings?.salaryStructure),
        emptyIfDash(requisition?.costCenter),
      ),
      employmentCategory: this.firstNonEmpty(
        emptyIfDash(personal?.employmentCategory),
        emptyIfDash(record.EmploymentCategory),
      ),
      remarks: emptyIfDash(personal?.remarks),
      dateOfJoining: this.firstNonEmpty(
        emptyIfDash(remuneration?.dateOfJoining),
      ),
      basicSalary: this.formatGrossSalary(
        this.firstNonEmpty(emptyIfDash(remuneration?.basicSalary)),
      ),
    };
  }

  private firstNonEmpty(...values: string[]): string {
    for (const value of values) {
      const trimmed = value.trim();
      if (trimmed && trimmed !== '—') {
        return trimmed;
      }
    }
    return '';
  }

  private normalizeProfileValue(value: string | undefined | null): string {
    return sanitizeApiText(value);
  }

  private normalizeEmployeeNature(value: string | undefined | null): string {
    const sanitized = sanitizeApiText(value);
    if (!sanitized) {
      return '';
    }

    const compact = sanitized.toLowerCase().replace(/[\s_-]+/g, '');
    if (compact === 'technical') {
      return 'Technical';
    }
    if (compact === 'nontechnical') {
      return 'Non-Technical';
    }

    return sanitized;
  }

  private formatGrossSalary(value: string | undefined | null): string {
    const sanitized = sanitizeApiText(value);
    if (!sanitized) {
      return '';
    }

    const numeric = Number.parseFloat(sanitized.replace(/,/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) {
      return String(numeric);
    }

    return sanitized;
  }

  private applyEmployeeProfileFields(
    profile: Omit<ProbationEmployeeOption, 'code' | 'apiId'>,
    employeeCode: string,
    options: { overwrite?: boolean } = {},
  ): void {
    const overwrite = options.overwrite ?? false;
    const setField = (target: ReturnType<typeof signal<string>>, value: string): void => {
      const next = this.normalizeProfileValue(value);
      if (!next) {
        if (overwrite) {
          target.set('');
        }
        return;
      }
      if (overwrite || !this.normalizeProfileValue(target())) {
        target.set(next);
      }
    };

    setField(this.employeeCode, employeeCode);
    setField(this.employeeName, profile.name);
    setField(this.department, profile.department);
    setField(this.location, profile.location);
    setField(this.designation, profile.designation);
    setField(this.reportingManager, profile.reportingManager);
    setField(this.employeeNature, profile.employeeNature);
    setField(this.employeeType, profile.employeeType);
    setField(this.gradeWorkLevel, profile.gradeWorkLevel);
    setField(this.employmentCategory, profile.employmentCategory);
    setField(this.remarks, profile.remarks);

    const joiningDate = this.normalizeProfileValue(profile.dateOfJoining);
    if (joiningDate && (overwrite || !this.probationStartDate().trim())) {
      this.applyProbationDatesFromJoining(joiningDate);
    }

    const grossSalary = this.formatGrossSalary(profile.basicSalary);
    if (overwrite) {
      if (grossSalary) {
        this.applyGrossSalaryAsCurrentSalary(grossSalary);
      } else {
        this.currentSalary.set('');
        this.recalculateAdjustmentAmountFromPercent();
      }
      return;
    }

    if (grossSalary && !this.normalizeProfileValue(this.currentSalary())) {
      this.applyGrossSalaryAsCurrentSalary(grossSalary);
    }
  }

  private applyGrossSalaryAsCurrentSalary(grossSalary: string): void {
    const salary = grossSalary.trim();
    if (!salary) {
      return;
    }
    this.currentSalary.set(salary);
    this.recalculateAdjustmentAmountFromPercent();
  }

  private enrichEmployeeFieldsFromApplication(employeeCode: string): void {
    const code = employeeCode.trim();
    if (!code) {
      return;
    }

    const applyFromRecord = (record: ApplicationFormRecord): void => {
      const profile = this.mapApplicationRecordToEmployeeFields(record);
      this.applyEmployeeProfileFields(profile, this.resolveEmployeeCode(record), { overwrite: false });
      const grossSalary = this.formatGrossSalary(profile.basicSalary);
      if (grossSalary && !this.normalizeProfileValue(this.currentSalary())) {
        this.applyGrossSalaryAsCurrentSalary(grossSalary);
      }
      this.cdr.markForCheck();
    };

    const localRecord = this.findApplicationRecordByCode(code);
    if (!localRecord) {
      return;
    }

    const detailId = localRecord.apiId?.trim();
    if (!detailId) {
      applyFromRecord(localRecord);
      return;
    }

    this.applicationFormService.fetchEmployeeProfileDetail(detailId).subscribe({
      next: applyFromRecord,
      error: () => applyFromRecord(localRecord),
    });
  }

  private findApplicationRecordByCode(employeeCode: string): ApplicationFormRecord | undefined {
    const code = employeeCode.trim().toLowerCase();
    if (!code) {
      return undefined;
    }

    return this.applicationFormService.getApplicationRecords().find(
      (record) => this.resolveEmployeeCode(record).trim().toLowerCase() === code,
    );
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
    const profile = this.mapApplicationRecordToEmployeeFields(record);
    this.applyEmployeeProfileFields(profile, this.resolveEmployeeCode(record), { overwrite: true });
  }

  private applyProbationDatesFromJoining(dateOfJoining: string): void {
    const joiningDate = formatDateForInput(dateOfJoining);
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
    const { code, apiId, ...profile } = employee;
    this.applyEmployeeProfileFields(profile, code, { overwrite: true });
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
    const normalized = formatDateForInput(endDate);
    this.baseProbationEndDate.set(normalized);
    this.probationEndDate.set(normalized);
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

  private addMonthsToIsoDate(dateValue: string, monthsToAdd: number): string {
    const isoDate = formatDateForInput(dateValue);
    const parts = isoDate.split('-').map(Number);
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
    const baseEndDate =
      formatDateForInput(this.baseProbationEndDate()) || formatDateForInput(this.probationEndDate());
    let rollingEndDate = baseEndDate;

    const updatedEntries = this.extensionEntries().map((entry) => {
      if (!entry.period.trim() || !rollingEndDate) {
        return { ...entry, newProbationEndDate: '' };
      }

      const months = this.parseExtensionMonths(entry.period);
      if (!months) {
        return { ...entry, newProbationEndDate: '' };
      }

      const newEndDate = this.addMonthsToIsoDate(rollingEndDate, months);
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
  protected readonly validationTouched = signal(false);
  protected readonly ratingValidationTouched = signal(false);

  protected onPercentageChange(key: RatingKey, value: string | number | null): void {
    const normalized = this.clampRatingValue(value);

    this.ratings.update((current) => ({
      ...current,
      [key]: { ...current[key], rating: normalized },
    }));
  }

  protected onRatingBlur(key: RatingKey): void {
    const current = this.ratings()[key].rating;
    const normalized = this.clampRatingValue(current);
    if (normalized !== current) {
      this.ratings.update((state) => ({
        ...state,
        [key]: { ...state[key], rating: normalized },
      }));
    }
  }

  protected onRatingKeyDown(event: KeyboardEvent): void {
    if (['-', '+', 'e', 'E', '.'].includes(event.key)) {
      event.preventDefault();
      return;
    }

    if (!/^\d$/.test(event.key)) {
      return;
    }

    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const current = input.value ?? '';
    const selectionStart = input.selectionStart ?? current.length;
    const selectionEnd = input.selectionEnd ?? current.length;
    const nextValue = `${current.slice(0, selectionStart)}${event.key}${current.slice(selectionEnd)}`;
    const digitsOnly = nextValue.replace(/\D/g, '');

    if (digitsOnly && Number(digitsOnly) > 100) {
      event.preventDefault();
    }
  }

  private clampRatingValue(value: string | number | null | undefined): string {
    const rawValue = value === null || value === undefined ? '' : String(value).trim();
    if (!rawValue) {
      return '';
    }

    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) {
      return '';
    }

    const numericValue = Math.min(100, Math.max(0, Number(digitsOnly)));
    return String(numericValue);
  }

  private toRatingNumber(value: string): number {
    const clamped = this.clampRatingValue(value);
    return clamped === '' ? 0 : Number(clamped);
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

  protected isPostSubmitSectionsAvailable(): boolean {
    return !!this.editingId;
  }

  private resetPostSubmitFields(): void {
    this.extensionEntries.set([]);
    this.termination.set('');
    this.terminationEffectiveDate.set('');
    this.adjustmentInSalary.set('');
    this.adjustmentAmountInSalary.set('');
    this.effectiveDateOfRevision.set('');
    this.allowances.set([]);
  }

  protected isFieldInvalid(field: ProbationValidationField): boolean {
    if (!this.validationTouched()) {
      return false;
    }

    switch (field) {
      case 'employeeCode':
        return !this.employeeCode().trim();
      case 'employeeName':
        return !this.employeeName().trim();
      case 'department':
        return !this.department().trim();
      case 'designation':
        return !this.designation().trim();
      case 'terminationEffectiveDate':
        return (
          this.isPostSubmitSectionsAvailable() &&
          this.termination() === 'Yes' &&
          !this.terminationEffectiveDate().trim()
        );
      case 'effectiveDateOfRevision':
        return (
          this.isPostSubmitSectionsAvailable() &&
          this.isEffectiveDateRequired() &&
          !this.effectiveDateOfRevision().trim()
        );
      default:
        return false;
    }
  }

  protected isExtensionPeriodInvalid(index: number): boolean {
    if (!this.validationTouched() || !this.isPostSubmitSectionsAvailable()) {
      return false;
    }

    const entry = this.extensionEntries()[index];
    if (!entry) {
      return false;
    }

    return !entry.period.trim() || (!!entry.period.trim() && !entry.newProbationEndDate.trim());
  }

  protected isEffectiveDateRequired(): boolean {
    if (!this.isPostSubmitSectionsAvailable()) {
      return false;
    }

    const latestExtensionEndDate = this.getLatestExtensionEntry()?.newProbationEndDate ?? '';
    return (
      this.toAmount(this.currentSalary()) > 0 &&
      !this.probationEndDate().trim() &&
      !latestExtensionEndDate.trim()
    );
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

  private scrollToFirstInvalidSection(): void {
    if (
      this.isFieldInvalid('employeeCode') ||
      this.isFieldInvalid('employeeName') ||
      this.isFieldInvalid('department') ||
      this.isFieldInvalid('designation')
    ) {
      this.scrollToSectionById('probation-info-section');
      return;
    }

    if (this.isPostSubmitSectionsAvailable() && this.extensionEntries().some((_, index) => this.isExtensionPeriodInvalid(index))) {
      this.scrollToSectionById('extension-of-probation-section');
      return;
    }

    if (this.isPostSubmitSectionsAvailable() && this.isFieldInvalid('terminationEffectiveDate')) {
      this.scrollToSectionById('termination-of-probation-section');
      return;
    }

    if (this.isPostSubmitSectionsAvailable() && this.isFieldInvalid('effectiveDateOfRevision')) {
      this.scrollToSectionById('salary-adjustment-section');
    }
  }

  protected back(): void {
    this.cancel();
  }

  protected scrollToSection(sectionId: string): void {
    let targetId = sectionId;
    if (
      (sectionId === 'extension-of-probation-section' ||
        sectionId === 'termination-of-probation-section' ||
        sectionId === 'salary-adjustment-section') &&
      !this.isPostSubmitSectionsAvailable()
    ) {
      targetId = 'post-submit-locked-section';
    }

    this.activeSection.set(sectionId);
    setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  protected cancel(): void {
    void this.router.navigateByUrl('/employee-action/probation-evaluation-form');
  }

  protected save(): void {
    this.validationTouched.set(true);
    this.ratingValidationTouched.set(true);

    const validationMessage = this.validateBeforeSubmit();
    if (validationMessage) {
      this.alertService.validation(validationMessage);
      this.scrollToFirstInvalidSection();
      this.cdr.markForCheck();
      return;
    }

    if (!this.areAllRatingsValid()) {
      this.scrollToSectionById('probation-rating-section');
      this.cdr.markForCheck();
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
          rating: this.toRatingNumber(ratingValues.communication_skills.rating),
          remarks: ratingValues.communication_skills.remarks.trim(),
        },
        technical_skills: {
          rating: this.toRatingNumber(ratingValues.technical_skills.rating),
          remarks: ratingValues.technical_skills.remarks.trim(),
        },
        attendance: {
          rating: this.toRatingNumber(ratingValues.attendance.rating),
          remarks: ratingValues.attendance.remarks.trim(),
        },
        discipline: {
          rating: this.toRatingNumber(ratingValues.discipline.rating),
          remarks: ratingValues.discipline.remarks.trim(),
        },
        teamwork: {
          rating: this.toRatingNumber(ratingValues.teamwork.rating),
          remarks: ratingValues.teamwork.remarks.trim(),
        },
        productivity: {
          rating: this.toRatingNumber(ratingValues.productivity.rating),
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
    if (this.isPostSubmitSectionsAvailable() && this.termination() === 'Yes' && !this.terminationEffectiveDate().trim()) {
      return 'Please enter Termination Effective Date when termination is Yes.';
    }
    if (this.isPostSubmitSectionsAvailable() && this.extensionEntries().length > 0) {
      const incompleteExtension = this.extensionEntries().find(
        (entry) => !entry.period.trim() || !entry.newProbationEndDate.trim(),
      );
      if (incompleteExtension) {
        return 'Please select an extension period for each added row.';
      }
    }
    if (this.isPostSubmitSectionsAvailable() && this.isExtensionActive()) {
      const incompleteExtension = this.getActiveExtensionEntries().find((entry) => !entry.newProbationEndDate.trim());
      if (incompleteExtension) {
        return 'Please ensure each extension has a valid New Probation End Date.';
      }
    }
    const latestExtensionEndDate = this.getLatestExtensionEntry()?.newProbationEndDate ?? '';
    if (
      this.isPostSubmitSectionsAvailable() &&
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
    const emptyIfDash = (value: string): string => sanitizeApiText(value);

    this.employeeCode.set(emptyIfDash(record.EmployeeCode));
    this.employeeName.set(emptyIfDash(record.EmployeeName));
    this.department.set(emptyIfDash(record.Department));
    this.location.set(emptyIfDash(record.Location));
    this.designation.set(emptyIfDash(record.Designation));
    this.reportingManager.set(emptyIfDash(record.ReportingManager));
    this.employeeNature.set(this.normalizeEmployeeNature(record.EmployeeNature));
    this.employeeType.set(emptyIfDash(record.EmployeeType));
    this.gradeWorkLevel.set(emptyIfDash(record.GradeWorkLevel));
    this.employmentCategory.set(emptyIfDash(record.EmploymentCategory));
    this.remarks.set(emptyIfDash(record.Remarks));
    this.supervisionRemark.set(emptyIfDash(record.SupervisionRemark));

    this.ratings.set({
      communication_skills: {
        rating: this.clampRatingValue(record.ProbationRating.communication_skills.rating),
        remarks: record.ProbationRating.communication_skills.remarks,
      },
      technical_skills: {
        rating: this.clampRatingValue(record.ProbationRating.technical_skills.rating),
        remarks: record.ProbationRating.technical_skills.remarks,
      },
      attendance: {
        rating: this.clampRatingValue(record.ProbationRating.attendance.rating),
        remarks: record.ProbationRating.attendance.remarks,
      },
      discipline: {
        rating: this.clampRatingValue(record.ProbationRating.discipline.rating),
        remarks: record.ProbationRating.discipline.remarks,
      },
      teamwork: {
        rating: this.clampRatingValue(record.ProbationRating.teamwork.rating),
        remarks: record.ProbationRating.teamwork.remarks,
      },
      productivity: {
        rating: this.clampRatingValue(record.ProbationRating.productivity.rating),
        remarks: record.ProbationRating.productivity.remarks,
      },
    });

    const probationStart = formatDateForInput(
      emptyIfDash(record.ExtensionOfProbation.probation_start_date) || emptyIfDash(record.ProbationStartDate),
    );
    const probationEnd = formatDateForInput(
      emptyIfDash(record.ExtensionOfProbation.probation_end_date) || emptyIfDash(record.ProbationEndDate),
    );
    const extensionPeriod = emptyIfDash(record.ExtensionOfProbation.extension_period_in_probation);
    const newProbationEnd = formatDateForInput(emptyIfDash(record.ExtensionOfProbation.new_probation_end_date));

    this.probationStartDate.set(probationStart);
    this.baseProbationEndDate.set(probationEnd);

    if (record.ExtensionOfProbation.is_extension_enabled && extensionPeriod) {
      this.extensionEntries.set([{ period: extensionPeriod, newProbationEndDate: newProbationEnd }]);
      this.recalculateExtensionEntries();
    } else {
      this.extensionEntries.set([]);
      this.probationEndDate.set(probationEnd);
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

    this.currentSalary.set(
      record.SalaryAdjustment.currentSalary
        ? this.formatGrossSalary(String(record.SalaryAdjustment.currentSalary))
        : '',
    );
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
