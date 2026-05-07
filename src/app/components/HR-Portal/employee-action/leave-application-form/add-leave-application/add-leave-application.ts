import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../../../services/alert.service';

@Component({
  selector: 'app-add-leave-application',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-leave-application.html',
  styleUrls: [
    '../../../Application-Form/create-job-requisition/create-job-requisition.css',
    '../../probation-evaluation-form/add-probation-evaluation/add-probation-evaluation.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddLeaveApplicationComponent implements AfterViewInit, OnDestroy {
  private readonly sectionIds = [
    'header-info-section',
    'leave-detail-section',
    'leave-balance-information-section'
  ] as const;
  private sectionObserver: IntersectionObserver | null = null;

  constructor(
    private readonly router: Router,
    private readonly alertService: AlertService
  ) {}

  protected readonly activeSection = signal('header-info-section');
  protected readonly formNumber = signal('');
  protected readonly employeeId = signal('');
  protected readonly employeeName = signal('');
  protected readonly employeeCategory = signal('');
  protected readonly employmentNature = signal('');
  protected readonly employmentType = signal('');
  protected readonly workGradeLevel = signal('');
  protected readonly department = signal('');
  protected readonly jobTitle = signal('');
  protected readonly location = signal('');
  protected readonly requestDate = signal('');
  protected readonly leaveType = signal('');
  protected readonly causeOfLeave = signal('');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly totalLeaveDaysRequested = signal('');
  protected readonly totalLeaves = signal('');
  protected readonly leavesAvailed = signal('');
  protected readonly remainingLeaves = signal('');
  protected readonly requestStatus = signal<'Submitted' | 'Approved' | 'Rejected' | ''>('');
  protected readonly remarks = signal('');

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

  protected async save(): Promise<void> {
    console.log('Leave application payload:', {
      headerInfo: {
        formNumber: this.formNumber(),
        employeeId: this.employeeId(),
        employeeName: this.employeeName(),
        employeeCategory: this.employeeCategory(),
        employmentNature: this.employmentNature(),
        employmentType: this.employmentType(),
        workGradeLevel: this.workGradeLevel(),
        department: this.department(),
        jobTitle: this.jobTitle(),
        location: this.location()
      },
      leaveDetail: {
        requestDate: this.requestDate(),
        leaveType: this.leaveType(),
        causeOfLeave: this.causeOfLeave(),
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        totalLeaveDaysRequested: this.totalLeaveDaysRequested(),
        requestStatus: this.requestStatus(),
        remarks: this.remarks()
      },
      leaveBalanceInformation: {
        totalLeaves: this.totalLeaves(),
        leavesAvailed: this.leavesAvailed(),
        remainingLeaves: this.remainingLeaves()
      }
    });

    await this.alertService.successAndWait('Saved', 'Leave request submitted successfully.');
    void this.router.navigateByUrl('/employee-action/leave-application-form');
  }
}
