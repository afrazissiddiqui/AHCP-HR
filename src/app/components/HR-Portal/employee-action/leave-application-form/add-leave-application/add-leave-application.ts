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
  LeaveApplicationAddPayload,
  LeaveApplicationRecord,
  LeaveApplicationService,
} from '../../../../../services/leave-application.service';
import { ApplicationFormService, ApplicationFormRecord } from '../../../../../services/application-form.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';

interface LeaveEmployeeOption {
  employeeId: string;
  employeeName: string;
  employeeCategory: string;
  employmentNature: string;
  employmentType: string;
  workGradeLevel: string;
  department: string;
  jobTitle: string;
  location: string;
}

@Component({
  selector: 'app-add-leave-application',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-leave-application.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddLeaveApplicationComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly sectionIds = [
    'header-info-section',
    'leave-detail-section',
    'leave-balance-information-section',
  ] as const;
  private sectionObserver: IntersectionObserver | null = null;

  protected editingId: string | null = null;
  protected pageTitle = 'Add Leave Request';
  protected submitButtonLabel = 'Save Leave Request';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly alertService: AlertService,
    private readonly leaveService: LeaveApplicationService,
    private readonly applicationFormService: ApplicationFormService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  private readonly employeeOptions = signal<LeaveEmployeeOption[]>([]);

  protected readonly activeSection = signal('header-info-section');
  protected readonly formNumber = signal(this.generateFormNumber());
  protected readonly employeeId = signal('');
  protected readonly employeeName = signal('');
  protected readonly employeeCategory = signal('');
  protected readonly employmentNature = signal('');
  protected readonly employmentType = signal('');
  protected readonly workGradeLevel = signal('');
  protected readonly department = signal('');
  protected readonly jobTitle = signal('');
  protected readonly location = signal('');
  protected readonly requestDate = signal(this.getTodayDate());
  protected readonly leaveType = signal('');
  protected readonly causeOfLeave = signal('');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly totalLeaveDaysRequested = signal<number | null>(null);
  protected readonly totalLeaves = signal<number | null>(null);
  protected readonly leavesAvailed = signal<number | null>(null);
  protected readonly remainingLeaves = signal<number | null>(null);
  protected readonly requestStatus = signal<'Submitted' | 'Approved' | 'Rejected' | ''>('Submitted');
  protected readonly remarks = signal('');

  protected readonly codeSuggestionsOpen = signal(false);
  protected readonly nameSuggestionsOpen = signal(false);
  protected readonly codeSuggestions = computed(() => this.filterEmployeeSuggestions(this.employeeId()));
  protected readonly nameSuggestions = computed(() => this.filterEmployeeSuggestions(this.employeeName()));

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
    this.pageTitle = 'Update Leave Request';
    this.submitButtonLabel = 'Update Leave Request';

    this.leaveService.fetchLeaveApplicationDetail(editId).subscribe({
      next: (record) => {
        this.populateFromRecord(record);
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load leave application for edit.'),
        );
      },
    });
  }

  ngAfterViewInit(): void {
    this.initializeSectionObserver();
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.sectionObserver = null;
  }

  protected back(): void {
    void this.router.navigateByUrl('/employee-action/leave-application-form');
  }

  protected onEmployeeIdInput(value: string): void {
    this.employeeId.set(value);
    if (this.editingId) {
      return;
    }
    this.codeSuggestionsOpen.set(value.trim().length > 0);
    this.closeNameSuggestions();
  }

  protected onEmployeeNameInput(value: string): void {
    this.employeeName.set(value);
    if (this.editingId) {
      return;
    }
    this.nameSuggestionsOpen.set(value.trim().length > 0);
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

  protected selectEmployee(employee: LeaveEmployeeOption): void {
    this.closeCodeSuggestions();
    this.closeNameSuggestions();
    this.populateFromEmployeeOption(employee);
    this.cdr.markForCheck();
  }

  protected onFromDateChange(value: string): void {
    this.fromDate.set(value);
    this.syncTotalLeaveDays();
  }

  protected onToDateChange(value: string): void {
    this.toDate.set(value);
    this.syncTotalLeaveDays();
  }

  protected onTotalLeavesChange(value: number | string | null): void {
    this.totalLeaves.set(this.parseNumber(value));
    this.syncRemainingLeaves();
  }

  protected onLeavesAvailedChange(value: number | string | null): void {
    this.leavesAvailed.set(this.parseNumber(value));
    this.syncRemainingLeaves();
  }

  protected onTotalLeaveDaysChange(value: number | string | null): void {
    this.totalLeaveDaysRequested.set(this.parseNumber(value));
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

  protected save(): void {
    if (!this.formNumber().trim()) {
      void this.alertService.warning('Validation', 'Form Number is required.');
      return;
    }

    if (!this.employeeId().trim() || !this.employeeName().trim()) {
      void this.alertService.warning('Validation', 'Employee ID and Employee Name are required.');
      return;
    }

    if (!this.leaveType().trim() || !this.fromDate().trim() || !this.toDate().trim()) {
      void this.alertService.warning('Validation', 'Leave Type, From Date, and To Date are required.');
      return;
    }

    const totalDays = this.totalLeaveDaysRequested();
    if (totalDays === null || totalDays <= 0) {
      void this.alertService.warning('Validation', 'Enter valid Total Leave Days Requested.');
      return;
    }

    const payload = this.buildPayload();
    const request$ = this.editingId
      ? this.leaveService.updateLeaveApplication(this.editingId, payload)
      : this.leaveService.addLeaveApplication(payload);

    request$.subscribe({
      next: async () => {
        const message = this.editingId
          ? 'Leave request updated successfully.'
          : 'Leave request submitted successfully.';
        await this.alertService.successAndWait(this.editingId ? 'Updated' : 'Saved', message);
        this.leaveService.fetchLeaveApplications().subscribe();
        void this.router.navigateByUrl('/employee-action/leave-application-form');
      },
      error: (error: unknown) => {
        const fallback = this.editingId
          ? 'Failed to update leave request.'
          : 'Failed to submit leave request.';
        void this.alertService.error(
          this.editingId ? 'Update Failed' : 'Save Failed',
          formatApiErrorMessage(error, fallback),
        );
      },
    });
  }

  private populateFromRecord(record: LeaveApplicationRecord): void {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);
    const header = record.HeaderInfo;
    const leave = record.LeaveRequest;
    const balance = record.LeaveBalanceInformation;

    this.formNumber.set(emptyIfDash(header.formNumber));
    this.employeeId.set(emptyIfDash(header.employeeId));
    this.employeeName.set(emptyIfDash(header.employeeName));
    this.employeeCategory.set(emptyIfDash(header.employeeCategory));
    this.employmentNature.set(emptyIfDash(header.employmentNature));
    this.employmentType.set(emptyIfDash(header.employmentType));
    this.workGradeLevel.set(emptyIfDash(header.workGradeLevel));
    this.department.set(emptyIfDash(header.department));
    this.jobTitle.set(emptyIfDash(header.jobTitle));
    this.location.set(emptyIfDash(header.location));

    this.requestDate.set(emptyIfDash(leave.requestDate) || this.getTodayDate());
    this.leaveType.set(emptyIfDash(leave.leaveType));
    this.causeOfLeave.set(emptyIfDash(leave.causeOfLeave));
    this.fromDate.set(emptyIfDash(leave.fromDate));
    this.toDate.set(emptyIfDash(leave.toDate));
    this.totalLeaveDaysRequested.set(
      leave.totalLeaveDaysRequested > 0 ? leave.totalLeaveDaysRequested : null,
    );
    this.requestStatus.set(
      leave.requestStatus === 'Approved' || leave.requestStatus === 'Rejected'
        ? leave.requestStatus
        : 'Submitted',
    );
    this.remarks.set(emptyIfDash(leave.remarks));

    this.totalLeaves.set(balance.totalLeaves > 0 ? balance.totalLeaves : null);
    this.leavesAvailed.set(balance.leavesAvailed > 0 ? balance.leavesAvailed : null);
    this.remainingLeaves.set(balance.remainingLeaves > 0 ? balance.remainingLeaves : null);
  }

  private buildPayload(): LeaveApplicationAddPayload {
    return {
      headerInfo: {
        formNumber: this.formNumber().trim(),
        employeeId: this.employeeId().trim(),
        employeeName: this.employeeName().trim(),
        employeeCategory: this.employeeCategory().trim(),
        employmentNature: this.employmentNature().trim(),
        employmentType: this.employmentType().trim(),
        workGradeLevel: this.workGradeLevel().trim(),
        department: this.department().trim(),
        jobTitle: this.jobTitle().trim(),
        location: this.location().trim(),
      },
      leaveRequest: {
        requestDate: this.requestDate().trim() || this.getTodayDate(),
        leaveType: this.leaveType().trim(),
        causeOfLeave: this.causeOfLeave().trim(),
        fromDate: this.fromDate().trim(),
        toDate: this.toDate().trim(),
        totalLeaveDaysRequested: this.totalLeaveDaysRequested() ?? 0,
        requestStatus: this.requestStatus() || 'Submitted',
        remarks: this.remarks().trim(),
      },
      leaveBalanceInformation: {
        totalLeaves: this.totalLeaves() ?? 0,
        leavesAvailed: this.leavesAvailed() ?? 0,
        remainingLeaves: this.remainingLeaves() ?? 0,
      },
    };
  }

  private buildEmployeeOptions(): LeaveEmployeeOption[] {
    return this.applicationFormService
      .getApplicationRecords()
      .map((record) => this.toEmployeeOption(record))
      .filter((option) => option.employeeId || option.employeeName);
  }

  private toEmployeeOption(record: ApplicationFormRecord): LeaveEmployeeOption {
    const emptyIfDash = (value: string): string => (value === '—' ? '' : value);

    return {
      employeeId: this.resolveEmployeeId(record),
      employeeName: emptyIfDash(record.EmployeeName),
      employeeCategory: emptyIfDash(record.EmploymentCategory),
      employmentNature: emptyIfDash(record.EmployeeNature),
      employmentType: emptyIfDash(record.EmploymentType),
      workGradeLevel: emptyIfDash(record.detail?.requisition.costCenter ?? ''),
      department: emptyIfDash(record.Department),
      jobTitle:
        emptyIfDash(record.detail?.requisition.internalJobTitle ?? '') ||
        emptyIfDash(record.Designation),
      location:
        emptyIfDash(record.detail?.requisition.location ?? '') ||
        emptyIfDash(record.detail?.personalInfo.city ?? ''),
    };
  }

  private resolveEmployeeId(record: ApplicationFormRecord): string {
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

  private filterEmployeeSuggestions(query: string): LeaveEmployeeOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return this.employeeOptions()
      .filter(
        (employee) =>
          employee.employeeId.toLowerCase().includes(q) ||
          employee.employeeName.toLowerCase().includes(q) ||
          employee.department.toLowerCase().includes(q) ||
          employee.jobTitle.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }

  private populateFromEmployeeOption(employee: LeaveEmployeeOption): void {
    this.employeeId.set(employee.employeeId);
    this.employeeName.set(employee.employeeName);
    this.employeeCategory.set(employee.employeeCategory);
    this.employmentNature.set(employee.employmentNature);
    this.employmentType.set(employee.employmentType);
    this.workGradeLevel.set(employee.workGradeLevel);
    this.department.set(employee.department);
    this.jobTitle.set(employee.jobTitle);
    this.location.set(employee.location);
  }

  private syncTotalLeaveDays(): void {
    const from = this.parseDate(this.fromDate());
    const to = this.parseDate(this.toDate());
    if (!from || !to || to < from) {
      return;
    }
    const diffMs = to.getTime() - from.getTime();
    this.totalLeaveDaysRequested.set(Math.floor(diffMs / 86_400_000) + 1);
  }

  private syncRemainingLeaves(): void {
    const total = this.totalLeaves();
    const availed = this.leavesAvailed();
    if (total === null || availed === null) {
      return;
    }
    this.remainingLeaves.set(Math.max(total - availed, 0));
  }

  private parseNumber(value: number | string | null): number | null {
    if (value === null || value === '') {
      return null;
    }
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseDate(value: string): Date | null {
    if (!value.trim()) {
      return null;
    }
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private generateFormNumber(): string {
    const year = new Date().getFullYear();
    const suffix = String(Date.now()).slice(-4);
    return `LR-${year}-${suffix}`;
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
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
        threshold: [0.2, 0.35, 0.5, 0.7],
      },
    );

    for (const section of sections) {
      this.sectionObserver.observe(section);
    }
  }
}
