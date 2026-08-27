import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { OvertimeListRecord, OvertimeListService } from '../../../services/overtime-list.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { GatePassDepartmentService } from '../../gate-pass/gate-pass-department.service';
import { resolveBranchNameFromBplId } from '../../../utils/branch-name.util';

type OvertimeColumnKey =
  | 'employeeId'
  | 'employeeName'
  | 'overtimeHours'
  | 'overtimeRate'
  | 'exceptionalOt';

interface OvertimeTableColumn {
  key: OvertimeColumnKey;
  label: string;
}

@Component({
  selector: 'app-overtime-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overtime-list.html',
  styleUrl: './overtime-list.css',
})
export class OvertimeListComponent implements OnInit {
  private readonly overtimeListService = inject(OvertimeListService);
  private readonly departmentService = inject(GatePassDepartmentService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly records = signal<OvertimeListRecord[]>([]);
  readonly searchText = signal('');
  readonly selectedDepartment = signal('');
  readonly selectedBranch = signal('');
  readonly selectedReportingManager = signal('');
  readonly departmentOptions = computed(() => this.getOptions('department'));
  readonly branchOptions = computed(() => this.getOptions('branch'));
  readonly reportingManagerOptions = computed(() => this.getOptions('reportingManager'));

  readonly columns: OvertimeTableColumn[] = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee Name' },
    { key: 'overtimeHours', label: 'Overtime Hours' },
    { key: 'overtimeRate', label: 'Overtime Rate' },
    { key: 'exceptionalOt', label: 'Exceptional OT' },
  ];

  readonly totalRecords = computed(() => this.records().length);

  readonly filteredRecords = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    const department = this.selectedDepartment();
    const branch = this.selectedBranch();
    const reportingManager = this.selectedReportingManager();

    return this.records().filter((record) => {
      if (department && this.departmentValue(record) !== department) {
        return false;
      }
      if (branch && this.branchValue(record) !== branch) {
        return false;
      }
      if (reportingManager && record.reportingManager !== reportingManager) {
        return false;
      }
      if (!query) {
        return true;
      }

      const searchable = [
        record.employeeId,
        record.employeeName,
        this.formatNumber(record.overtimeHours),
        this.formatNumber(record.overtimeRate),
        this.formatNumber(record.exceptionalOt),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  });

  ngOnInit(): void {
    this.loadOvertimeList();
    this.departmentService.ensureLoaded().subscribe();
  }

  loadOvertimeList(): void {
    this.loading.set(true);
    this.overtimeListService
      .fetchOvertimeList()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (records) => this.records.set(records),
        error: (error: unknown) => {
          this.records.set([]);
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load overtime list.'),
          );
        },
      });
  }

  cellValue(record: OvertimeListRecord, key: OvertimeColumnKey): string {
    switch (key) {
      case 'overtimeHours':
      case 'overtimeRate':
      case 'exceptionalOt':
        return this.formatNumber(record[key]);
      default: {
        const value = record[key];
        if (value === null || value === undefined || value === '') {
          return '—';
        }
        return String(value);
      }
    }
  }

  private formatNumber(value: number): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private getOptions(field: 'department' | 'branch' | 'reportingManager'): string[] {
    const values = new Set<string>();
    for (const record of this.records()) {
      const value = field === 'department'
        ? this.departmentValue(record)
        : field === 'branch'
          ? this.branchValue(record)
          : record.reportingManager;
      const trimmedValue = value.trim();
      if (trimmedValue) {
        values.add(trimmedValue);
      }
    }
    return [...values].sort((first, second) => first.localeCompare(second));
  }

  private departmentValue(record: OvertimeListRecord): string {
    return this.departmentService.resolveDepartmentName(record.department);
  }

  private branchValue(record: OvertimeListRecord): string {
    return resolveBranchNameFromBplId(record.branch);
  }

}
