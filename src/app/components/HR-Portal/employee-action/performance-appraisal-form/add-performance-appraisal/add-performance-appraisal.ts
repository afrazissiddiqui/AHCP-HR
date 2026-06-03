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
  PerformanceAppraisalRecord,
  PerformanceAppraisalService,
  buildPerformanceAppraisalDraftFromForm,
  buildPerformanceAppraisalSubmitPayload,
} from '../../../../../services/performance-appraisal.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';

interface AppraisalEmployeeOption {
  code: string;
  name: string;
  department: string;
  designation: string;
  jobTitle: string;
  reportingManager: string;
  employeeCategory: string;
  workGradeLevel: string;
  employmentNature: string;
  employmentType: string;
}

@Component({
  selector: 'app-add-performance-appraisal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-performance-appraisal.html',
  styleUrls: [
    '../../../job-specification-form/create-job-specification/create-job-specification.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPerformanceAppraisalComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add Performance Appraisal';
  submitButtonLabel = 'Save Performance Appraisal';

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

  protected readonly existingBenefitsDetails = signal('');
  protected readonly newBenefits = signal('');

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

  protected onEmployeeIdInput(code: string): void {
    this.employeeId.set(code);
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
    if (this.editingId || !this.employeeId().trim()) {
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

  protected selectEmployeeFromSuggestion(employee: AppraisalEmployeeOption): void {
    this.closeCodeSuggestions();
    this.closeNameSuggestions();
    this.populateFromEmployeeOption(employee);
    this.cdr.markForCheck();
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
    void this.router.navigateByUrl('/employee-action/performance-appraisal-form');
  }

  protected save(): void {
    if (!this.formNumber().trim()) {
      void this.alertService.warning('Validation', 'Form Number is required.');
      return;
    }

    if (!this.employeeId().trim() || !this.employeeName().trim()) {
      void this.alertService.warning('Validation', 'Employee ID and Employee Name are required.');
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
      existingBenefitsDetails: this.existingBenefitsDetails(),
      newBenefits: this.newBenefits(),
    });

    const payload = buildPerformanceAppraisalSubmitPayload(draft);
    const request$ = this.editingId
      ? this.appraisalService.updatePerformanceAppraisal(this.editingId, payload)
      : this.appraisalService.addPerformanceAppraisal(payload);

    request$.subscribe({
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
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);
    const designation = emptyIfDash(record.Designation);

    return {
      code: this.resolveEmployeeCode(record),
      name: emptyIfDash(record.EmployeeName),
      department: emptyIfDash(record.Department),
      designation,
      jobTitle: designation,
      reportingManager: emptyIfDash(record.ReportingManager),
      employeeCategory: emptyIfDash(record.EmploymentCategory),
      workGradeLevel: emptyIfDash(record.detail?.requisition.costCenter ?? ''),
      employmentNature: emptyIfDash(record.EmployeeNature),
      employmentType: emptyIfDash(record.EmploymentType),
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
    this.employeeId.set(employee.code);
    this.employeeName.set(employee.name);
    this.department.set(employee.department);
    this.designation.set(employee.designation);
    this.jobTitle.set(employee.jobTitle);
    this.reportingManager.set(employee.reportingManager);
    this.employeeCategory.set(employee.employeeCategory);
    this.workGradeLevel.set(employee.workGradeLevel);
    this.employmentNature.set(employee.employmentNature);
    this.employmentType.set(employee.employmentType);
  }

  private populateFromRecord(record: PerformanceAppraisalRecord): void {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);
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
    this.dateOfJoining.set(emptyIfDash(record.DateOfJoining));
    this.employmentType.set(emptyIfDash(record.EmploymentType));
    this.jobTitle.set(emptyIfDash(record.JobTitle));
    this.reportingManager.set(emptyIfDash(record.ReportingManager));
    this.appraisalAuthority.set(emptyIfDash(record.AppraisalAuthority));
    this.appraisalPeriod.set(emptyIfDash(record.AppraisalPeriod));
    this.currentSalary.set(record.CurrentSalary ? String(record.CurrentSalary) : '');
    this.evaluationDate.set(emptyIfDash(record.EvaluationDate));

    const increment = record.Increment;
    this.incrementPercentage.set(
      increment.increment_percentage ? String(increment.increment_percentage) : '',
    );
    this.incrementEffectiveDate.set(emptyIfDash(increment.increment_effective_date));
    this.reasonForIncrement.set(emptyIfDash(increment.reason_for_increment));
    this.incrementAmount.set(increment.increment_amount ? String(increment.increment_amount) : '');

    const promotion = record.Promotion;
    this.promotionRecommended.set(yesNo(promotion.promotion_recommended));
    this.newDesignation.set(emptyIfDash(promotion.new_designation));
    this.promotionEffectiveDate.set(emptyIfDash(promotion.promotion_effective_date));
    this.promotionRemarks.set(emptyIfDash(promotion.remarks));

    this.existingBenefitsDetails.set(emptyIfDash(record.OtherBenefits.existing_benefits_details));
    this.newBenefits.set(emptyIfDash(record.OtherBenefits.new_benefits));
  }

  private toAmount(value: string): number {
    const numeric = Number((value ?? '').toString().replace(/,/g, '').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
