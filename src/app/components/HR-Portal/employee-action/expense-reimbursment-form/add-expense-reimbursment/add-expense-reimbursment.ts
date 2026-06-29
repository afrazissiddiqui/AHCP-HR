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
  ExpenseReimbursementRecord,
  ExpenseReimbursementService,
  buildExpenseReimbursementDraftFromForm,
  buildExpenseReimbursementSubmitPayload,
} from '../../../../../services/expense-reimbursement.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import {
  formatDateDdMmYyyyInput,
  formatDateOfBirthFromApi,
  formatDateOfBirthToApi,
} from '../../../../../utils/date-format.util';

interface ExpenseEmployeeOption {
  code: string;
  name: string;
  department: string;
  designation: string;
  costCenter: string;
}

@Component({
  selector: 'app-add-expense-reimbursment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-expense-reimbursment.html',
  styleUrls: [
    '../../../job-specification-form/create-job-specification/create-job-specification.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExpenseReimbursmentComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add Expense Reimbursement';
  submitButtonLabel = 'Save Expense Reimbursement';

  protected readonly expenseTypeOptions = ['Fuel', 'Travel', 'Medical', 'Meals', 'Utilities', 'Lodging', 'Other'] as const;

  protected readonly employeeCode = signal('');
  protected readonly headerEmployeeName = signal('');
  protected readonly headerDepartment = signal('');
  protected readonly designation = signal('');
  protected readonly costCenter = signal('');
  protected readonly claimMonth = signal('');
  protected readonly formNumber = signal('');
  protected readonly submissionDate = signal(new Date().toISOString().slice(0, 10));

  protected readonly employeeId = signal('');
  protected readonly detailEmployeeName = signal('');
  protected readonly detailDepartment = signal('');
  protected readonly expenseType = signal('');
  protected readonly claimAmount = signal('');
  protected readonly claimDate = signal('');
  protected readonly approvalStatus = signal('Pending');
  protected readonly expenseRemarks = signal('');

  protected readonly travelFromDate = signal('');
  protected readonly travelToDate = signal('');
  protected readonly dailyAllowanceApplicable = signal<'Yes' | 'No' | ''>('');
  protected readonly dailyAllowanceRate = signal('');
  protected readonly travelRemarks = signal('');

  private readonly employeeOptions = signal<ExpenseEmployeeOption[]>([]);
  protected readonly codeSuggestionsOpen = signal(false);
  protected readonly nameSuggestionsOpen = signal(false);

  protected readonly codeSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.employeeCode()),
  );

  protected readonly nameSuggestions = computed(() =>
    this.filterEmployeeSuggestions(this.headerEmployeeName()),
  );

  protected readonly numberOfDays = computed(() => {
    const from = this.travelFromDate();
    const to = this.travelToDate();
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
    return String(days);
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
    return String(days * rate);
  });

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly alertService: AlertService,
    private readonly expenseService: ExpenseReimbursementService,
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
    this.pageTitle = 'Update Expense Reimbursement';
    this.submitButtonLabel = 'Update Expense Reimbursement';

    this.expenseService.fetchExpenseReimbursementDetail(editId).subscribe({
      next: (record) => {
        this.populateFromRecord(record);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load expense reimbursement for edit.'),
        );
      },
    });
  }

  protected onEmployeeCodeInput(code: string): void {
    this.employeeCode.set(code);
    this.employeeId.set(code);
    if (this.editingId) {
      return;
    }
    this.codeSuggestionsOpen.set(code.trim().length > 0);
    this.closeNameSuggestions();
  }

  protected onHeaderEmployeeNameInput(name: string): void {
    this.headerEmployeeName.set(name);
    this.detailEmployeeName.set(name);
    if (this.editingId) {
      return;
    }
    this.nameSuggestionsOpen.set(name.trim().length > 0);
    this.closeCodeSuggestions();
  }

  protected onDetailEmployeeNameInput(name: string): void {
    this.detailEmployeeName.set(name);
  }

  protected onHeaderDepartmentInput(department: string): void {
    this.headerDepartment.set(department);
    this.detailDepartment.set(department);
  }

  protected onFormNumberChange(value: string): void {
    this.formNumber.set(value);
  }

  protected openCodeSuggestions(): void {
    if (this.editingId || !this.employeeCode().trim()) {
      return;
    }
    this.codeSuggestionsOpen.set(true);
    this.closeNameSuggestions();
  }

  protected openNameSuggestions(): void {
    if (this.editingId || !this.headerEmployeeName().trim()) {
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

  protected selectEmployeeFromSuggestion(employee: ExpenseEmployeeOption): void {
    this.closeCodeSuggestions();
    this.closeNameSuggestions();
    this.populateFromEmployeeOption(employee);
    this.cdr.markForCheck();
  }

  protected back(): void {
    void this.router.navigateByUrl('/employee-action/expense-reimbursement-form');
  }

  protected save(): void {
    if (!this.formNumber().trim()) {
      void this.alertService.warning('Validation', 'Form Number is required.');
      return;
    }

    if (!this.employeeCode().trim() || !this.headerEmployeeName().trim()) {
      void this.alertService.warning('Validation', 'Employee Code and Employee Name are required.');
      return;
    }

    if (!this.expenseType().trim()) {
      void this.alertService.warning('Validation', 'Expense Type is required.');
      return;
    }

    const draft = buildExpenseReimbursementDraftFromForm({
      employeeCode: this.employeeCode(),
      headerEmployeeName: this.headerEmployeeName(),
      headerDepartment: this.headerDepartment(),
      designation: this.designation(),
      costCenter: this.costCenter(),
      claimMonth: this.claimMonth(),
      formNumber: this.formNumber(),
      submissionDate: this.submissionDate(),
      employeeId: this.employeeId() || this.employeeCode(),
      detailEmployeeName: this.detailEmployeeName() || this.headerEmployeeName(),
      detailDepartment: this.detailDepartment() || this.headerDepartment(),
      expenseType: this.expenseType(),
      claimAmount: this.claimAmount(),
      claimDate: formatDateOfBirthToApi(this.claimDate().replace(/\//g, '-')),
      approvalStatus: this.approvalStatus(),
      expenseRemarks: this.expenseRemarks(),
      travelFromDate: this.travelFromDate(),
      travelToDate: this.travelToDate(),
      dailyAllowanceApplicable: this.dailyAllowanceApplicable(),
      dailyAllowanceRate: this.dailyAllowanceRate(),
      numberOfDays: this.numberOfDays(),
      dailyAllowanceAmount: this.dailyAllowanceAmount(),
      travelRemarks: this.travelRemarks(),
    });

    const payload = buildExpenseReimbursementSubmitPayload(draft);
    const request$ = this.editingId
      ? this.expenseService.updateExpenseReimbursement(this.editingId, payload)
      : this.expenseService.addExpenseReimbursement(payload);

    request$.subscribe({
      next: async () => {
        const message = this.editingId
          ? 'Expense reimbursement updated successfully.'
          : 'Expense reimbursement saved successfully.';
        await this.alertService.successAndWait(this.editingId ? 'Updated' : 'Saved', message);
        this.expenseService.fetchExpenseReimbursements().subscribe();
        void this.router.navigateByUrl('/employee-action/expense-reimbursement-form');
      },
      error: (error: unknown) => {
        const fallback = this.editingId
          ? 'Failed to update expense reimbursement.'
          : 'Failed to save expense reimbursement.';
        void this.alertService.error(
          this.editingId ? 'Update Failed' : 'Save Failed',
          formatApiErrorMessage(error, fallback),
        );
      },
    });
  }

  private buildEmployeeOptions(): ExpenseEmployeeOption[] {
    return this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toEmployeeOption(record))
      .filter((option) => option.code || option.name);
  }

  private toEmployeeOption(record: ApplicationFormRecord): ExpenseEmployeeOption {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);

    return {
      code: this.resolveEmployeeCode(record),
      name: emptyIfDash(record.EmployeeName),
      department: emptyIfDash(record.Department),
      designation: emptyIfDash(record.Designation),
      costCenter: emptyIfDash(record.detail?.requisition.costCenter ?? ''),
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

  private filterEmployeeSuggestions(query: string): ExpenseEmployeeOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.employeeOptions()
      .filter(
        (employee) =>
          employee.code.toLowerCase().includes(q) ||
          employee.name.toLowerCase().includes(q) ||
          employee.department.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }

  private populateFromEmployeeOption(employee: ExpenseEmployeeOption): void {
    this.employeeCode.set(employee.code);
    this.employeeId.set(employee.code);
    this.headerEmployeeName.set(employee.name);
    this.detailEmployeeName.set(employee.name);
    this.headerDepartment.set(employee.department);
    this.detailDepartment.set(employee.department);
    this.designation.set(employee.designation);
    this.costCenter.set(employee.costCenter);
  }

  onClaimDateChange(value: string): void {
    this.claimDate.set(formatDateDdMmYyyyInput(value).replace(/-/g, '/'));
  }

  private populateFromRecord(record: ExpenseReimbursementRecord): void {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);
    const yesNo = (value: string): 'Yes' | 'No' | '' =>
      value === 'Yes' || value === 'No' ? value : '';

    const header = record.HeaderFields;
    this.employeeCode.set(emptyIfDash(header.employeeCode));
    this.headerEmployeeName.set(emptyIfDash(header.employeeName));
    this.headerDepartment.set(emptyIfDash(header.department));
    this.designation.set(emptyIfDash(header.designation));
    this.costCenter.set(emptyIfDash(header.costCenter));
    this.claimMonth.set(emptyIfDash(header.claimMonth));
    this.formNumber.set(emptyIfDash(header.formNumber));
    this.submissionDate.set(emptyIfDash(header.submissionDate) || new Date().toISOString().slice(0, 10));

    const detail = record.ExpenseDetail;
    this.employeeId.set(emptyIfDash(detail.employeeID));
    this.detailEmployeeName.set(emptyIfDash(detail.employeeName));
    this.detailDepartment.set(emptyIfDash(detail.department));
    this.expenseType.set(emptyIfDash(detail.expenseType));
    this.claimAmount.set(emptyIfDash(detail.claimAmount));
    this.claimDate.set(formatDateOfBirthFromApi(emptyIfDash(detail.claimDate)).replace(/-/g, '/'));
    this.approvalStatus.set(emptyIfDash(detail.approvalStatus) || 'Pending');
    this.expenseRemarks.set(emptyIfDash(detail.remarks));

    const travel = record.Travel;
    this.travelFromDate.set(emptyIfDash(travel.travelFromDate));
    this.travelToDate.set(emptyIfDash(travel.travelToDate));
    this.dailyAllowanceApplicable.set(yesNo(travel.dailyAllowanceApplicable));
    this.dailyAllowanceRate.set(emptyIfDash(travel.dailyAllowanceRate));
    this.travelRemarks.set(emptyIfDash(travel.remarks));
  }
}
