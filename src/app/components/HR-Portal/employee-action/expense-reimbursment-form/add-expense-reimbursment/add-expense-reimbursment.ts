import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../../../services/application-form.service';
import { AlertService } from '../../../../../services/alert.service';
import { finalize } from 'rxjs';
import {
  ExpenseReimbursementRecord,
  ExpenseReimbursementService,
  ExpenseTravelPayload,
  buildExpenseReimbursementDraftFromForm,
  buildExpenseReimbursementSubmitPayload,
  createEmptyExpenseTravelPayload,
} from '../../../../../services/expense-reimbursement.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import {
  formatDateDdMmYyyyInput,
  formatDateForInput,
  formatDateOfBirthFromApi,
  formatDateOfBirthToApi,
} from '../../../../../utils/date-format.util';

interface ExpenseEmployeeOption {
  code: string;
  name: string;
  department: string;
  designation: string;
}

type ExpenseValidationField = 'formNumber' | 'employeeCode' | 'employeeName' | 'expenseType';

@Component({
  selector: 'app-add-expense-reimbursment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-expense-reimbursment.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css',
    './add-expense-reimbursment.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExpenseReimbursmentComponent implements OnInit {
  editingId: string | null = null;
  pageTitle = 'Add Expense Reimbursement';
  submitButtonLabel = 'Save Expense Reimbursement';
  protected readonly activeSection = signal('er-header-section');
  protected readonly saving = signal(false);
  protected readonly validationTouched = signal(false);

  get pageSubtitle(): string {
    return this.editingId
      ? 'Update expense claim details and reimbursement amounts.'
      : 'Submit employee expense claims with header and expense detail information.';
  }

  protected readonly expenseTypeOptions = ['Fuel', 'Travel', 'Medical', 'Meals', 'Utilities', 'Lodging', 'Other'] as const;

  protected readonly employeeCode = signal('');
  protected readonly headerEmployeeName = signal('');
  protected readonly headerDepartment = signal('');
  protected readonly designation = signal('');
  private readonly preservedCostCenter = signal('');
  private readonly preservedTravel = signal<ExpenseTravelPayload>(createEmptyExpenseTravelPayload());

  protected readonly claimMonth = signal('');
  protected readonly formNumber = signal('');
  protected readonly submissionDate = signal(new Date().toISOString().slice(0, 10));

  protected readonly employeeId = signal('');
  protected readonly detailEmployeeName = signal('');
  protected readonly detailDepartment = signal('');
  protected readonly expenseType = signal('');
  protected readonly claimAmount = signal('');
  protected readonly expenseFromDate = signal('');
  protected readonly expenseToDate = signal('');
  protected readonly claimDate = signal('');
  protected readonly approvalStatus = signal('Pending');
  protected readonly expenseRemarks = signal('');

  private readonly employeeOptions = signal<ExpenseEmployeeOption[]>([]);
  protected readonly codeSuggestionsOpen = signal(false);
  protected readonly nameSuggestionsOpen = signal(false);

  protected codeSuggestions(): ExpenseEmployeeOption[] {
    return this.filterEmployeeSuggestions(this.employeeCode());
  }

  protected nameSuggestions(): ExpenseEmployeeOption[] {
    return this.filterEmployeeSuggestions(this.headerEmployeeName());
  }

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

  protected scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  protected isFieldInvalid(field: ExpenseValidationField): boolean {
    if (!this.validationTouched()) {
      return false;
    }

    switch (field) {
      case 'formNumber':
        return !this.formNumber().trim();
      case 'employeeCode':
        return !this.employeeCode().trim();
      case 'employeeName':
        return !this.headerEmployeeName().trim();
      case 'expenseType':
        return !this.expenseType().trim();
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
      this.scrollToSection('er-header-section');
      this.cdr.markForCheck();
      return;
    }

    if (!this.employeeCode().trim() || !this.headerEmployeeName().trim()) {
      void this.alertService.warning('Validation', 'Employee Code and Employee Name are required.');
      this.scrollToSection('er-header-section');
      this.cdr.markForCheck();
      return;
    }

    if (!this.expenseType().trim()) {
      void this.alertService.warning('Validation', 'Expense Type is required.');
      this.scrollToSection('er-expense-detail-section');
      this.cdr.markForCheck();
      return;
    }

    this.saving.set(true);

    const draft = buildExpenseReimbursementDraftFromForm({
      employeeCode: this.employeeCode(),
      headerEmployeeName: this.headerEmployeeName(),
      headerDepartment: this.headerDepartment(),
      designation: this.designation(),
      costCenter: this.editingId ? this.preservedCostCenter() : '',
      claimMonth: this.claimMonth(),
      formNumber: this.formNumber(),
      submissionDate: this.submissionDate(),
      employeeId: this.employeeId() || this.employeeCode(),
      detailEmployeeName: this.detailEmployeeName() || this.headerEmployeeName(),
      detailDepartment: this.detailDepartment() || this.headerDepartment(),
      expenseType: this.expenseType(),
      claimAmount: this.claimAmount(),
      expenseFromDate: this.expenseFromDate(),
      expenseToDate: this.expenseToDate(),
      claimDate: formatDateOfBirthToApi(this.claimDate().replace(/\//g, '-')),
      approvalStatus: this.approvalStatus(),
      expenseRemarks: this.expenseRemarks(),
      travel: this.editingId ? this.preservedTravel() : createEmptyExpenseTravelPayload(),
    });

    const payload = buildExpenseReimbursementSubmitPayload(draft);
    const request$ = this.editingId
      ? this.expenseService.updateExpenseReimbursement(this.editingId, payload)
      : this.expenseService.addExpenseReimbursement(payload);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
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
  }

  onClaimDateChange(value: string): void {
    this.claimDate.set(formatDateDdMmYyyyInput(value).replace(/-/g, '/'));
  }

  protected onClaimMonthChange(value: string): void {
    this.claimMonth.set(value);
  }

  protected onClaimAmountChange(value: string): void {
    this.claimAmount.set(value.replace(/\D/g, ''));
  }

  protected onClaimAmountKeyDown(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  private formatClaimMonthForInput(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}`;
    }

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      return `${slashMatch[2]}-${slashMatch[1].padStart(2, '0')}`;
    }

    return trimmed;
  }

  private populateFromRecord(record: ExpenseReimbursementRecord): void {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);

    const header = record.HeaderFields;
    this.employeeCode.set(emptyIfDash(header.employeeCode));
    this.headerEmployeeName.set(emptyIfDash(header.employeeName));
    this.headerDepartment.set(emptyIfDash(header.department));
    this.designation.set(emptyIfDash(header.designation));
    this.preservedCostCenter.set(emptyIfDash(header.costCenter));
    this.claimMonth.set(this.formatClaimMonthForInput(emptyIfDash(header.claimMonth)));
    this.formNumber.set(emptyIfDash(header.formNumber));
    this.submissionDate.set(emptyIfDash(header.submissionDate) || new Date().toISOString().slice(0, 10));

    const detail = record.ExpenseDetail;
    this.employeeId.set(emptyIfDash(detail.employeeID));
    this.detailEmployeeName.set(emptyIfDash(detail.employeeName));
    this.detailDepartment.set(emptyIfDash(detail.department));
    this.expenseType.set(emptyIfDash(detail.expenseType));
    this.claimAmount.set(emptyIfDash(detail.claimAmount).replace(/\D/g, ''));
    this.expenseFromDate.set(formatDateForInput(emptyIfDash(detail.fromDate)));
    this.expenseToDate.set(formatDateForInput(emptyIfDash(detail.toDate)));
    this.claimDate.set(formatDateOfBirthFromApi(emptyIfDash(detail.claimDate)).replace(/-/g, '/'));
    this.approvalStatus.set(emptyIfDash(detail.approvalStatus) || 'Pending');
    this.expenseRemarks.set(emptyIfDash(detail.remarks));
    this.preservedTravel.set({ ...record.Travel });
  }
}
