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
import { finalize } from 'rxjs';
import {
  ApplicationFormRecord,
  ApplicationFormRemuneration,
  ApplicationFormService,
} from '../../../../../services/application-form.service';
import { AlertService } from '../../../../../services/alert.service';
import {
  PerformanceAppraisalRecord,
  PerformanceAppraisalService,
  PerformanceAllowanceRowPayload,
  buildPerformanceAppraisalDraftFromForm,
  buildPerformanceAppraisalSubmitPayload,
} from '../../../../../services/performance-appraisal.service';
import { KpiSetupRecord, KpiSetupService } from '../../../../../services/kpi-setup.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import { sanitizeApiText } from '../../../../../utils/api-text.util';
import { formatDateForInput } from '../../../../../utils/date-format.util';
import { normalizeEmploymentStatus } from '../../../../../utils/employment-status.util';

interface AppraisalEmployeeOption {
  code: string;
  name: string;
  apiId?: string;
  department: string;
  designation: string;
  jobTitle: string;
  reportingManager: string;
  employeeCategory: string;
  workGradeLevel: string;
  employmentNature: string;
  employmentType: string;
  dateOfJoining: string;
  basicSalary: string;
}

type AllowanceKey = 'fuelLimit' | 'mobileAllowances' | 'carAllowances' | 'otherAllowances';

interface AllowanceRowState {
  key: AllowanceKey;
  label: string;
  existing: string;
  incrementPercentage: string;
}

interface KpiAssessmentRowState {
  sr: number;
  kpi: string;
  weight: string;
  weightPercentage: string;
  definitionMeasure: string;
  obtained: string;
}

export function calculateIncrementAmount(currentSalary: number, percentage: number): number {
  return currentSalary > 0 && percentage > 0 ? (currentSalary * percentage) / 100 : 0;
}

export function calculateIncrementPercentage(currentSalary: number, amount: number): number {
  return currentSalary > 0 && amount > 0 ? (amount * 100) / currentSalary : 0;
}

export function pickKpiFieldValue(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();
    if (text) {
      return text;
    }
  }

  const lowerKeys = keys.map((key) => key.toLowerCase());
  for (const [sourceKey, sourceValue] of Object.entries(source)) {
    if (!lowerKeys.includes(sourceKey.toLowerCase())) {
      continue;
    }

    if (sourceValue === null || sourceValue === undefined) {
      continue;
    }

    const text = String(sourceValue).trim();
    if (text) {
      return text;
    }
  }

  return '';
}

const ALLOWANCE_KEY_ALIASES: Record<AllowanceKey, readonly string[]> = {
  fuelLimit: ['fuelLimit', 'fuel_limit', 'Fuel Limit (Liters)', 'Fuel Limit (liter)'],
  mobileAllowances: ['mobileAllowances', 'mobile_allowances', 'Mobile Allowances'],
  carAllowances: ['carAllowances', 'car_allowances', 'Car Allowances'],
  otherAllowances: ['otherAllowances', 'other_allowances', 'Other Allowances'],
};

const DEFAULT_ALLOWANCE_ROWS: AllowanceRowState[] = [
  { key: 'fuelLimit', label: 'Fuel Limit (Liters)', existing: '', incrementPercentage: '' },
  { key: 'mobileAllowances', label: 'Mobile Allowances', existing: '', incrementPercentage: '' },
  { key: 'carAllowances', label: 'Car Allowances', existing: '', incrementPercentage: '' },
  { key: 'otherAllowances', label: 'Other Allowances', existing: '', incrementPercentage: '' },
];

type AppraisalValidationField = 'formNumber' | 'employeeId' | 'employeeName';

@Component({
  selector: 'app-add-performance-appraisal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-performance-appraisal.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css',
    './add-performance-appraisal.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPerformanceAppraisalComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add Performance Appraisal';
  submitButtonLabel = 'Save Performance Appraisal';
  protected readonly activeSection = signal('pa-info-section');
  protected readonly saving = signal(false);
  protected readonly validationTouched = signal(false);
  protected readonly employeeProfileLoaded = signal(false);

  get pageSubtitle(): string {
    return this.editingId
      ? 'Update appraisal details, increment outcomes, and promotion recommendations.'
      : 'Capture employee appraisal information, salary increment, and promotion outcomes.';
  }

  protected readonly formNumber = signal('');
  protected readonly employeeId = signal('');
  protected readonly employeeName = signal('');
  protected readonly employeeCategory = signal('');
  protected readonly workGradeLevel = signal('');
  protected readonly employmentNature = signal('');
  protected readonly department = signal('');
  protected readonly designation = signal('');
  protected readonly dateOfJoining = signal('');
  protected readonly employmentType = signal('');
  protected readonly jobTitle = signal('');
  protected readonly reportingManager = signal('');
  protected readonly appraisalAuthority = signal('');
  protected readonly appraisalPeriod = signal('');
  protected readonly currentSalary = signal('');
  protected readonly evaluationDate = signal('');

  protected readonly incrementPercentage = signal('');
  protected readonly incrementEffectiveDate = signal('');
  protected readonly reasonForIncrement = signal('');
  protected readonly incrementAmount = signal('');

  protected readonly promotionRecommended = signal<'Yes' | 'No' | ''>('');
  protected readonly newDesignation = signal('');
  protected readonly promotionEffectiveDate = signal('');
  protected readonly promotionRemarks = signal('');

  protected readonly allowanceRows = signal<AllowanceRowState[]>(
    DEFAULT_ALLOWANCE_ROWS.map((row) => ({ ...row })),
  );
  protected readonly employeeDetailLoading = signal(false);
  protected readonly kpiAssessmentRows = signal<KpiAssessmentRowState[]>([]);
  protected readonly kpiAssessmentLoading = signal(false);
  protected readonly kpiAssessmentMessage = signal('');
  protected readonly totalKpiWeightPercentage = computed(() =>
    this.kpiAssessmentRows().reduce((sum, row) => sum + (this.parseNumericValue(row.weightPercentage) ?? 0), 0),
  );
  protected readonly totalKpiObtained = computed(() =>
    this.kpiAssessmentRows().reduce((sum, row) => sum + (this.parseNumericValue(row.obtained) ?? 0), 0),
  );
  protected readonly totalKpiPercentage = computed(() => {
    const totalMarks = this.totalKpiWeightPercentage();
    if (totalMarks <= 0) {
      return 0;
    }
    return (this.totalKpiObtained() * 100) / totalMarks;
  });
  protected readonly totalKpiPercentageDisplay = computed(() => {
    if (this.totalKpiWeightPercentage() <= 0) {
      return '0%';
    }
    return `${this.totalKpiPercentage().toFixed(0)}%`;
  });
  protected readonly activeCategoryRow = computed(() => {
    const percentage = this.totalKpiPercentage();
    if (percentage >= 95) {
      return 1;
    }
    if (percentage >= 85) {
      return 2;
    }
    if (percentage >= 70) {
      return 3;
    }
    if (percentage >= 50) {
      return 4;
    }
    return 5;
  });

  private employeeListLoadRequested = false;
  private readonly employeeOptions = signal<AppraisalEmployeeOption[]>([]);
  protected readonly codeSuggestionsOpen = signal(false);
  protected readonly nameSuggestionsOpen = signal(false);

  protected readonly codeSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeId()),
  );

  protected readonly nameSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeName()),
  );

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
    private readonly appraisalService: PerformanceAppraisalService,
    private readonly applicationFormService: ApplicationFormService,
    private readonly kpiSetupService: KpiSetupService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update Performance Appraisal';
    this.submitButtonLabel = 'Update Performance Appraisal';

    this.appraisalService.fetchPerformanceAppraisalDetail(editId).subscribe({
      next: (record) => {
        this.populateFromRecord(record);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load performance appraisal for edit.'),
        );
      },
    });
  }

  protected allowanceRevised(row: AllowanceRowState): string {
    const existing = this.toAmount(row.existing);
    const percentage = this.toAmount(row.incrementPercentage);
    if (existing === 0 && percentage === 0) {
      return row.existing.trim() === '0' ? '0' : '';
    }
    if (existing <= 0) {
      return '';
    }
    if (percentage <= 0) {
      return String(Math.round(existing));
    }
    return String(Math.round(existing + (existing * percentage) / 100));
  }

  protected updateAllowanceIncrementPercentage(key: AllowanceKey, value: string | number | null): void {
    const next = value === null ? '' : String(value);
    this.allowanceRows.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, incrementPercentage: next } : row)),
    );
    this.cdr.markForCheck();
  }

  protected updateKpiObtainedValue(index: number, value: string | number | null): void {
    const next = value === null ? '' : String(value);
    this.kpiAssessmentRows.update((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        const cap = this.parseNumericValue(row.weightPercentage);
        const parsed = this.parseNumericValue(next);
        if (cap !== null && parsed !== null && parsed > cap) {
          return row;
        }

        return { ...row, obtained: next };
      }),
    );
    this.cdr.markForCheck();
  }

  protected getKpiObtainedMax(row: KpiAssessmentRowState): number | null {
    return this.parseNumericValue(row.weightPercentage);
  }

  protected onKpiObtainedInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;

    const cap = this.parseNumericValue(this.kpiAssessmentRows()[index]?.weightPercentage ?? '');
    const parsed = this.parseNumericValue(raw);

    if (parsed === null) {
      // allow empty or non-numeric (cleared) values
      this.kpiAssessmentRows.update((rows) =>
        rows.map((row, i) => (i === index ? { ...row, obtained: raw } : row)),
      );
      this.cdr.markForCheck();
      return;
    }

    let safe = parsed;
    if (cap !== null && parsed > cap) {
      safe = cap;
      // immediately reflect the clamped value in the input element
      input.value = String(safe);
    }

    this.kpiAssessmentRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, obtained: String(safe) } : row)),
    );
    this.cdr.markForCheck();
  }

  private ensureEmployeeOptionsLoaded(): void {
    if (this.employeeListLoadRequested) {
      return;
    }

    this.employeeListLoadRequested = true;
    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: () => {
        this.employeeOptions.set(this.buildEmployeeOptions());
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.employeeListLoadRequested = false;
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load employees for search.'),
        );
      },
    });
  }

  protected onEmployeeIdInput(code: string): void {
    this.employeeId.set(code);
    if (this.editingId) {
      return;
    }
    this.ensureEmployeeOptionsLoaded();
    this.employeeProfileLoaded.set(false);
    this.codeSuggestionsOpen.set(code.trim().length > 0);
    this.closeNameSuggestions();
  }

  protected onEmployeeNameInput(name: string): void {
    this.employeeName.set(name);
    if (this.editingId) {
      return;
    }
    this.ensureEmployeeOptionsLoaded();
    this.employeeProfileLoaded.set(false);
    this.nameSuggestionsOpen.set(name.trim().length > 0);
    this.closeCodeSuggestions();
  }

  protected openCodeSuggestions(): void {
    if (this.editingId || !this.employeeId().trim()) {
      return;
    }
    this.ensureEmployeeOptionsLoaded();
    this.codeSuggestionsOpen.set(true);
    this.closeNameSuggestions();
  }

  protected openNameSuggestions(): void {
    if (this.editingId || !this.employeeName().trim()) {
      return;
    }
    this.ensureEmployeeOptionsLoaded();
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
    setTimeout(() => {
      this.closeCodeSuggestions();
      if (!this.editingId) {
        this.trySelectEmployeeFromTypedValue('code');
      }
    }, 150);
  }

  protected onNameInputBlur(): void {
    setTimeout(() => {
      this.closeNameSuggestions();
      if (!this.editingId) {
        this.trySelectEmployeeFromTypedValue('name');
      }
    }, 150);
  }

  protected selectEmployeeFromSuggestion(employee: AppraisalEmployeeOption, event?: MouseEvent): void {
    event?.preventDefault();
    this.closeCodeSuggestions();
    this.closeNameSuggestions();
    this.resetEmployeeProfileFields();
    this.employeeId.set(employee.code);
    this.employeeName.set(employee.name);

    const detailId = employee.apiId?.trim();
    if (!detailId) {
      void this.alertService.warning(
        'Employee Profile',
        'No profile id found for this employee. Select another employee from the list.',
      );
      return;
    }

    this.employeeDetailLoading.set(true);
    this.applicationFormService.fetchEmployeeProfileDetail(detailId).subscribe({
      next: (record) => {
        this.populateFromApplicationRecord(record);
        this.employeeProfileLoaded.set(true);
        this.employeeDetailLoading.set(false);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.employeeDetailLoading.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load employee profile details.'),
        );
        this.cdr.markForCheck();
      },
    });
  }

  protected onIncrementAmountChange(value: string | number | null): void {
    this.incrementAmount.set(value === null ? '' : String(value));
    const amount = this.toAmount(this.incrementAmount());
    const currentSalary = this.toAmount(this.currentSalary());
    this.incrementPercentage.set(
      amount > 0 && currentSalary > 0
        ? String(Math.round(calculateIncrementPercentage(currentSalary, amount) * 100) / 100)
        : '',
    );
  }

  protected onIncrementPercentageChange(value: string | number | null): void {
    this.incrementPercentage.set(value === null ? '' : String(value));
    const percentage = this.toAmount(this.incrementPercentage());
    const currentSalary = this.toAmount(this.currentSalary());
    this.incrementAmount.set(
      percentage > 0 && currentSalary > 0
        ? String(Math.round(calculateIncrementAmount(currentSalary, percentage) * 100) / 100)
        : '',
    );
  }

  protected back(): void {
    void this.router.navigateByUrl('/employee-action/performance-appraisal-form');
  }

  protected scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  protected isFieldInvalid(field: AppraisalValidationField): boolean {
    if (!this.validationTouched()) {
      return false;
    }

    switch (field) {
      case 'formNumber':
        return !this.formNumber().trim();
      case 'employeeId':
        return !this.employeeId().trim();
      case 'employeeName':
        return !this.employeeName().trim();
      default:
        return false;
    }
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }

    this.validationTouched.set(true);

    if (!this.formNumber().trim()) {
      void this.alertService.warning('Validation', 'Form Number is required.');
      this.scrollToSection('pa-info-section');
      this.cdr.markForCheck();
      return;
    }

    if (!this.employeeId().trim() || !this.employeeName().trim()) {
      void this.alertService.warning('Validation', 'Employee ID and Employee Name are required.');
      this.scrollToSection('pa-info-section');
      this.cdr.markForCheck();
      return;
    }

    const draft = buildPerformanceAppraisalDraftFromForm({
      formNumber: this.formNumber(),
      employeeId: this.employeeId(),
      employeeName: this.employeeName(),
      employeeCategory: this.employeeCategory(),
      workGradeLevel: this.workGradeLevel(),
      employmentNature: this.employmentNature(),
      department: this.department(),
      designation: this.designation(),
      dateOfJoining: this.dateOfJoining(),
      employmentType: this.employmentType(),
      jobTitle: this.jobTitle(),
      reportingManager: this.reportingManager(),
      appraisalAuthority: this.appraisalAuthority(),
      appraisalPeriod: this.appraisalPeriod(),
      currentSalary: this.currentSalary(),
      evaluationDate: this.evaluationDate(),
      incrementPercentage: this.incrementPercentage(),
      incrementEffectiveDate: this.incrementEffectiveDate(),
      reasonForIncrement: this.reasonForIncrement(),
      incrementAmount: this.incrementAmount(),
      revisedSalary: this.revisedSalary(),
      promotionRecommended: this.promotionRecommended(),
      newDesignation: this.newDesignation(),
      promotionEffectiveDate: this.promotionEffectiveDate(),
      promotionRemarks: this.promotionRemarks(),
      allowances: this.buildAllowancesPayload(),
    });

    const payload = buildPerformanceAppraisalSubmitPayload(draft);
    const request$ = this.editingId
      ? this.appraisalService.updatePerformanceAppraisal(this.editingId, payload)
      : this.appraisalService.addPerformanceAppraisal(payload);

    this.saving.set(true);
    request$
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
      next: async () => {
        const message = this.editingId
          ? 'Performance appraisal updated successfully.'
          : 'Performance appraisal saved successfully.';
        await this.alertService.successAndWait(this.editingId ? 'Updated' : 'Saved', message);
        this.appraisalService.fetchPerformanceAppraisals().subscribe();
        void this.router.navigateByUrl('/employee-action/performance-appraisal-form');
      },
      error: (error: unknown) => {
        const fallback = this.editingId
          ? 'Failed to update performance appraisal.'
          : 'Failed to save performance appraisal.';
        void this.alertService.error(
          this.editingId ? 'Update Failed' : 'Save Failed',
          formatApiErrorMessage(error, fallback),
        );
      },
    });
  }

  private buildEmployeeOptions(): AppraisalEmployeeOption[] {
    return this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toEmployeeOption(record))
      .filter((option) => option.code || option.name);
  }

  private toEmployeeOption(record: ApplicationFormRecord): AppraisalEmployeeOption {
    const mapped = this.mapApplicationRecordToEmployeeFields(record);

    return {
      code: this.resolveEmployeeCode(record),
      apiId: record.apiId,
      ...mapped,
    };
  }

  private mapApplicationRecordToEmployeeFields(
    record: ApplicationFormRecord,
  ): Omit<AppraisalEmployeeOption, 'code' | 'apiId'> {
    const emptyIfDash = (value: string | undefined | null): string => sanitizeApiText(value);
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
    const designation = this.firstNonEmpty(
      emptyIfDash(personal?.designation),
      emptyIfDash(record.Designation),
      emptyIfDash(requisition?.internalJobTitle),
    );
    const jobTitle = this.firstNonEmpty(
      emptyIfDash(requisition?.internalJobTitle),
      emptyIfDash(personal?.designation),
      emptyIfDash(record.Designation),
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
      designation,
      jobTitle,
      reportingManager: this.firstNonEmpty(
        emptyIfDash(personal?.reportingManager),
        emptyIfDash(record.ReportingManager),
        emptyIfDash(requisition?.hiringManager),
      ),
      employeeCategory: this.firstNonEmpty(
        emptyIfDash(personal?.employmentCategory),
        emptyIfDash(record.EmploymentCategory),
      ),
      workGradeLevel: this.firstNonEmpty(
        emptyIfDash(personal?.workGradeLevel),
        emptyIfDash(personal?.roleSalary),
        emptyIfDash(record.detail?.hrSettings?.salaryStructure),
        emptyIfDash(requisition?.costCenter),
      ),
      employmentNature: this.firstNonEmpty(
        emptyIfDash(personal?.employmentNature),
        emptyIfDash(record.EmployeeNature),
        emptyIfDash(requisition?.company),
      ),
      employmentType: normalizeEmploymentStatus(
        this.firstNonEmpty(
          emptyIfDash(personal?.employmentStatus),
          emptyIfDash(record.EmploymentStatus),
          emptyIfDash(record.status),
        ),
      ),
      dateOfJoining: this.firstNonEmpty(emptyIfDash(remuneration?.dateOfJoining)),
      basicSalary: this.formatGrossSalary(
        this.firstNonEmpty(
          emptyIfDash(remuneration?.basicSalary),
          emptyIfDash(personal?.roleSalary),
        ),
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

  private resolveEmployeeCode(record: ApplicationFormRecord): string {
    const fromLogin = record.detail?.loginDetails?.employeeCode?.trim();
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

  private findApplicationRecord(employee: AppraisalEmployeeOption): ApplicationFormRecord | undefined {
    const code = employee.code.trim().toLowerCase();
    const apiId = employee.apiId?.trim();

    return this.applicationFormService.getApplicationRecords().find((record) => {
      if (apiId && record.apiId === apiId) {
        return true;
      }
      return code && this.resolveEmployeeCode(record).trim().toLowerCase() === code;
    });
  }

  private trySelectEmployeeFromTypedValue(field: 'code' | 'name'): void {
    if (this.employeeProfileLoaded()) {
      return;
    }

    const query = (field === 'code' ? this.employeeId() : this.employeeName()).trim().toLowerCase();
    if (!query) {
      return;
    }

    const match = this.employeeOptions().find((employee) => {
      const value = (field === 'code' ? employee.code : employee.name).trim().toLowerCase();
      return value === query;
    });

    if (match) {
      this.selectEmployeeFromSuggestion(match);
    }
  }

  private resetEmployeeProfileFields(): void {
    this.employeeId.set('');
    this.employeeName.set('');
    this.employeeCategory.set('');
    this.workGradeLevel.set('');
    this.employmentNature.set('');
    this.department.set('');
    this.designation.set('');
    this.dateOfJoining.set('');
    this.employmentType.set('');
    this.jobTitle.set('');
    this.reportingManager.set('');
    this.currentSalary.set('');
    this.resetAllowanceRows();
    this.resetKpiAssessmentRows();
    this.employeeProfileLoaded.set(false);
  }

  private resetAllowanceRows(): void {
    this.allowanceRows.set(DEFAULT_ALLOWANCE_ROWS.map((row) => ({ ...row })));
  }

  private resetKpiAssessmentRows(): void {
    this.kpiAssessmentRows.set([]);
    this.kpiAssessmentLoading.set(false);
    this.kpiAssessmentMessage.set('');
  }

  private buildAllowancesPayload(): PerformanceAllowanceRowPayload[] {
    return this.allowanceRows().map((row) => {
      const existing = this.toAmount(row.existing);
      const incrementPercentage = this.toAmount(row.incrementPercentage);
      const revised = this.toAmount(this.allowanceRevised(row));
      return {
        allowance: row.key,
        existing,
        increment_percentage: incrementPercentage,
        revised:
          revised > 0 || existing > 0
            ? revised > 0
              ? revised
              : existing
            : existing,
      };
    });
  }

  private applyAllowancesFromRemuneration(remuneration: ApplicationFormRemuneration | undefined): void {
    if (!remuneration) {
      return;
    }

    this.allowanceRows.set(
      DEFAULT_ALLOWANCE_ROWS.map((row) => ({
        ...row,
        existing:
          row.key === 'fuelLimit'
            ? this.applicationFormService.formatFuelLimitForForm(remuneration[row.key])
            : this.formatAllowanceValue(remuneration[row.key]),
        incrementPercentage: '',
      })),
    );
  }

  private formatAllowanceValue(value: string | undefined | null): string {
    const sanitized = sanitizeApiText(value);
    if (!sanitized) {
      return '';
    }
    const numeric = Number.parseFloat(sanitized.replace(/,/g, ''));
    if (Number.isFinite(numeric)) {
      return String(numeric);
    }
    return sanitized;
  }

  private applyAllowancesFromRecord(allowances: PerformanceAllowanceRowPayload[]): void {
    if (!allowances.length) {
      return;
    }

    this.allowanceRows.set(
      DEFAULT_ALLOWANCE_ROWS.map((defaultRow) => {
        const match = allowances.find((row) => this.matchesAllowanceRow(row, defaultRow));
        if (!match) {
          return { ...defaultRow };
        }
        return {
          ...defaultRow,
          existing:
            match.existing !== undefined && match.existing !== null
              ? String(match.existing)
              : '',
          incrementPercentage:
            match.increment_percentage !== undefined && match.increment_percentage !== null
              ? String(match.increment_percentage)
              : '',
        };
      }),
    );
  }

  private matchesAllowanceRow(
    apiRow: PerformanceAllowanceRowPayload,
    defaultRow: AllowanceRowState,
  ): boolean {
    const allowance = apiRow.allowance.trim().toLowerCase();
    if (!allowance) {
      return false;
    }

    return ALLOWANCE_KEY_ALIASES[defaultRow.key].some(
      (alias) => alias.trim().toLowerCase() === allowance,
    );
  }

  private populateFromApplicationRecord(record: ApplicationFormRecord): void {
    this.applyEmployeeFields(this.mapApplicationRecordToEmployeeFields(record), this.resolveEmployeeCode(record));
    this.applyAllowancesFromRemuneration(record.detail?.remuneration);
    this.loadKpiAssessmentRows();
  }

  private loadAllowancesForEdit(savedAllowances: PerformanceAllowanceRowPayload[]): void {
    this.applyAllowancesFromRecord(savedAllowances);
    this.refreshAllowanceExistingFromEmployeeProfile(true);
  }

  private loadKpiAssessmentRows(): void {
    const employeeFields = [
      this.department(),
      this.employmentNature(),
      this.workGradeLevel(),
      this.employeeCategory(),
      this.employmentType(),
      this.designation(),
    ];

    const hasEmployeeContext = employeeFields.some((value) => value.trim().length > 0);
    if (!hasEmployeeContext) {
      this.resetKpiAssessmentRows();
      return;
    }

    this.kpiAssessmentLoading.set(true);
    this.kpiAssessmentMessage.set('');
    this.kpiSetupService.fetchKpis().subscribe({
      next: (records) => {
        const matchedRecord = records.find((record) => this.matchesKpiSetupRecord(record));
        const rows = this.toKpiAssessmentRows(matchedRecord);
        this.kpiAssessmentRows.set(rows);
        this.kpiAssessmentMessage.set(rows.length > 0 ? '' : 'No KPI setup matched the selected employee profile.');
        this.kpiAssessmentLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.kpiAssessmentRows.set([]);
        this.kpiAssessmentLoading.set(false);
        this.kpiAssessmentMessage.set('Unable to load KPI setup data right now.');
        this.cdr.markForCheck();
      },
    });
  }

  private matchesKpiSetupRecord(record: KpiSetupRecord): boolean {
    const comparisons = [
      { employee: this.department().trim(), record: record.department?.trim() ?? '' },
      { employee: this.employmentNature().trim(), record: record.employment_nature?.trim() ?? '' },
      { employee: this.workGradeLevel().trim(), record: record.work_level?.trim() ?? '' },
      { employee: this.employeeCategory().trim(), record: record.employment_category?.trim() ?? '' },
      { employee: this.employmentType().trim(), record: record.employment_status?.trim() ?? '' },
      { employee: this.designation().trim(), record: record.designation?.trim() ?? '' },
    ];

    const hasCriteria = comparisons.some((item) => item.employee.length > 0);
    if (!hasCriteria) {
      return false;
    }

    return comparisons.every((item) => {
      if (!item.employee) {
        return true;
      }
      if (!item.record) {
        return false;
      }
      return this.normalizeText(item.employee) === this.normalizeText(item.record);
    });
  }

  private toKpiAssessmentRows(record: KpiSetupRecord | undefined): KpiAssessmentRowState[] {
    if (!record?.kpis?.length) {
      return [];
    }

    return record.kpis.map((item, index) => {
      const row = item as Record<string, unknown> | undefined;
      if (!row) {
        return {
          sr: index + 1,
          kpi: '',
          weight: '',
          weightPercentage: '',
          definitionMeasure: '',
          obtained: '',
        };
      }

      return {
        sr: index + 1,
        kpi: pickKpiFieldValue(row, ['kpi', 'Kpi', 'KPI', 'kpi_name', 'kpiName']),
        weight: pickKpiFieldValue(row, ['weight', 'Weight', 'weightage', 'Weightage']),
        weightPercentage: pickKpiFieldValue(row, ['weight_percentage', 'weightPercentage', 'Weight_Percentage', 'percentage', 'Percentage']),
        definitionMeasure: pickKpiFieldValue(row, [
          'defination_measurement',
          'definition_measurement',
          'Definition_Measurement',
          'Defination_Measurement',
          'definition_measure',
          'Definition / Measurement',
          'definition',
          'Definition',
          'measurement',
          'Measurement',
        ]),
        obtained: '',
      };
    });
  }

  private asText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
  }

  private refreshAllowanceExistingFromEmployeeProfile(preserveIncrement = false): void {
    const employeeCode = this.employeeId().trim();
    if (!employeeCode) {
      return;
    }

    const savedIncrements = new Map(
      this.allowanceRows().map((row) => [row.key, row.incrementPercentage] as const),
    );

    const applyRemuneration = (remuneration: ApplicationFormRemuneration | undefined): void => {
      if (!remuneration) {
        return;
      }

      this.allowanceRows.set(
        DEFAULT_ALLOWANCE_ROWS.map((row) => ({
          ...row,
          existing:
            row.key === 'fuelLimit'
              ? this.applicationFormService.formatFuelLimitForForm(remuneration[row.key])
              : this.formatAllowanceValue(remuneration[row.key]),
          incrementPercentage: preserveIncrement ? savedIncrements.get(row.key) ?? '' : '',
        })),
      );
      this.cdr.markForCheck();
    };

    const cachedRecord = this.applicationFormService
      .getApplicationRecords()
      .find((record) => this.resolveEmployeeCode(record).toLowerCase() === employeeCode.toLowerCase());

    if (cachedRecord?.detail?.remuneration) {
      applyRemuneration(cachedRecord.detail.remuneration);
    }

    const detailId = cachedRecord?.apiId?.trim();
    if (!detailId) {
      return;
    }

    this.applicationFormService.fetchEmployeeProfileDetail(detailId).subscribe({
      next: (record) => applyRemuneration(record.detail?.remuneration),
      error: () => {
        // Keep allowances from the saved appraisal when profile refresh fails.
      },
    });
  }

  private applyEmployeeFields(
    fields: Omit<AppraisalEmployeeOption, 'code' | 'apiId'>,
    employeeCode: string,
  ): void {
    const setField = (target: ReturnType<typeof signal<string>>, value: string): void => {
      const next = sanitizeApiText(value);
      if (next) {
        target.set(next);
      }
    };

    setField(this.employeeId, employeeCode);
    setField(this.employeeName, fields.name);
    setField(this.employeeCategory, fields.employeeCategory);
    setField(this.workGradeLevel, fields.workGradeLevel);
    setField(this.employmentNature, fields.employmentNature);
    setField(this.department, fields.department);
    setField(this.designation, fields.designation);
    setField(this.employmentType, fields.employmentType);
    setField(this.jobTitle, fields.jobTitle);
    setField(this.reportingManager, fields.reportingManager);

    const joiningDate = formatDateForInput(fields.dateOfJoining);
    if (joiningDate) {
      this.dateOfJoining.set(joiningDate);
    }

    const grossSalary = this.formatGrossSalary(fields.basicSalary);
    if (grossSalary) {
      this.currentSalary.set(grossSalary);
    }
  }

  private filterEmployeeSuggestions(query: string): AppraisalEmployeeOption[] {
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

  private populateFromEmployeeOption(employee: AppraisalEmployeeOption): void {
    this.applyEmployeeFields(employee, employee.code);
  }

  private populateFromRecord(record: PerformanceAppraisalRecord): void {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);
    const emptyDate = (value: string): string => formatDateForInput(emptyIfDash(value));
    const yesNo = (value: string): 'Yes' | 'No' | '' =>
      value === 'Yes' || value === 'No' ? value : '';

    this.formNumber.set(emptyIfDash(record.FormNumber));
    this.employeeId.set(emptyIfDash(record.EmployeeId));
    this.employeeName.set(emptyIfDash(record.EmployeeName));
    this.employeeCategory.set(emptyIfDash(record.EmployeeCategory));
    this.workGradeLevel.set(emptyIfDash(record.WorkGradeLevel));
    this.employmentNature.set(emptyIfDash(record.EmploymentNature));
    this.department.set(emptyIfDash(record.Department));
    this.designation.set(emptyIfDash(record.Designation));
    this.dateOfJoining.set(emptyDate(record.DateOfJoining));
    this.employmentType.set(emptyIfDash(record.EmploymentType));
    this.jobTitle.set(emptyIfDash(record.JobTitle));
    this.reportingManager.set(emptyIfDash(record.ReportingManager));
    this.appraisalAuthority.set(emptyIfDash(record.AppraisalAuthority));
    this.appraisalPeriod.set(emptyIfDash(record.AppraisalPeriod));
    this.currentSalary.set(record.CurrentSalary ? String(record.CurrentSalary) : '');
    this.evaluationDate.set(emptyDate(record.EvaluationDate));
    if (this.employeeId().trim() && this.employeeName().trim()) {
      this.employeeProfileLoaded.set(true);
    }

    const increment = record.Increment;
    this.incrementPercentage.set(
      increment.increment_percentage ? String(increment.increment_percentage) : '',
    );
    this.incrementEffectiveDate.set(emptyDate(increment.increment_effective_date));
    this.reasonForIncrement.set(emptyIfDash(increment.reason_for_increment));
    this.incrementAmount.set(increment.increment_amount ? String(increment.increment_amount) : '');

    const promotion = record.Promotion;
    this.promotionRecommended.set(yesNo(promotion.promotion_recommended));
    this.newDesignation.set(emptyIfDash(promotion.new_designation));
    this.promotionEffectiveDate.set(emptyDate(promotion.promotion_effective_date));
    this.promotionRemarks.set(emptyIfDash(promotion.remarks));

    this.loadAllowancesForEdit(record.OtherBenefits.allowances ?? []);
  }

  private parseNumericValue(value: string): number | null {
    const sanitized = (value ?? '').toString().trim();
    if (!sanitized) {
      return null;
    }

    const numeric = Number(sanitized.replace(/,/g, '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  }

  private toAmount(value: string): number {
    const numeric = Number((value ?? '').toString().replace(/,/g, '').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
