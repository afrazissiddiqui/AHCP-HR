import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import {
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../services/application-form.service';
import { GatePassDepartmentService } from '../../gate-pass/gate-pass-department.service';
import { WorkstationService } from '../../../services/workstation.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { resolveBranchNameFromBplId } from '../../../utils/branch-name.util';

@Component({
  selector: 'app-master-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-form.html',
  styleUrl: './master-form.css',
})
export class MasterFormComponent implements OnInit {
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly departmentService = inject(GatePassDepartmentService);
  private readonly workstationService = inject(WorkstationService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly records = signal<ApplicationFormRecord[]>([]);
  readonly searchText = signal('');
  readonly selectedBranch = signal('');
  readonly selectedDepartment = signal('');
  readonly selectedReportingManager = signal('');
  readonly shiftSelections = signal<Record<string, string>>({});
  readonly branchOptions = computed(() => this.getOptions('branch'));
  readonly departmentOptions = computed(() => this.getOptions('department'));
  readonly reportingManagerOptions = computed(() => this.getOptions('reportingManager'));
  readonly shiftOptions = computed(() => {
    const shifts = new Set<string>();
    for (const workstation of this.workstationService.workstations()) {
      const shift = workstation.shift.trim();
      if (shift) {
        shifts.add(shift);
      }
    }
    return [...shifts].sort((first, second) => first.localeCompare(second));
  });

  readonly totalRecords = computed(() => this.records().length);

  readonly filteredRecords = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    const branch = this.selectedBranch();
    const department = this.selectedDepartment();
    const reportingManager = this.selectedReportingManager();
    return this.records().filter((record) =>
      this.isShiftApplicable(record) &&
      (!branch || this.branchValue(record) === branch) &&
      (!department || this.departmentValue(record) === department) &&
      (!reportingManager || record.ReportingManager === reportingManager) &&
      (!query || [record.EmployeeCode, record.EmployeeName, record.ReportingManager].some((value) =>
        value.toLowerCase().includes(query),
      )),
    );
  });

  ngOnInit(): void {
    this.loadMasterForms();
    this.loadShiftOptions();
    this.departmentService.ensureLoaded().subscribe();
  }

  loadMasterForms(): void {
    this.loading.set(true);
    this.applicationFormService
      .fetchEmployeeProfiles()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (records) => {
          this.records.set(records);
        },
        error: (error: unknown) => {
          this.records.set([]);
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load employee shift allocation.'),
          );
        },
      });
  }

  trackByRecord(index: number, record: ApplicationFormRecord): string | number {
    return record.apiId ?? record.EmployeeCode ?? index;
  }

  selectedShift(record: ApplicationFormRecord, index: number): string {
    return this.shiftSelections()[this.employeeKey(record, index)] ?? '';
  }

  setSelectedShift(record: ApplicationFormRecord, index: number, shift: string): void {
    const key = this.employeeKey(record, index);
    this.shiftSelections.update((selections) => ({ ...selections, [key]: shift }));
  }

  private loadShiftOptions(): void {
    this.workstationService.fetchWorkstations().subscribe({
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load workstation shifts.'),
        );
      },
    });
  }

  private employeeKey(record: ApplicationFormRecord, index: number): string {
    return record.apiId ?? record.EmployeeCode ?? String(index);
  }

  private getOptions(field: 'branch' | 'department' | 'reportingManager'): string[] {
    const values = new Set<string>();
    for (const record of this.records()) {
      if (!this.isShiftApplicable(record)) {
        continue;
      }

      const value = field === 'branch'
        ? this.branchValue(record)
        : field === 'department'
          ? this.departmentValue(record)
          : record.ReportingManager;
      const trimmedValue = value.trim();
      if (trimmedValue) {
        values.add(trimmedValue);
      }
    }
    return [...values].sort((first, second) => first.localeCompare(second));
  }

  private branchValue(record: ApplicationFormRecord): string {
    return resolveBranchNameFromBplId(record.detail?.personalInfo.branchLocation);
  }

  private departmentValue(record: ApplicationFormRecord): string {
    return this.departmentService.resolveDepartmentName(record.Department);
  }

  private isShiftApplicable(record: ApplicationFormRecord): boolean {
    return record.detail?.hrSettings.attendanceShiftManagement.trim().toLowerCase() === 'yes';
  }
}
