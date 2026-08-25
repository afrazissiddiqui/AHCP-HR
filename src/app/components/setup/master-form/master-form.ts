import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import {
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../services/application-form.service';
import { WorkstationService } from '../../../services/workstation.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-master-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-form.html',
  styleUrl: './master-form.css',
})
export class MasterFormComponent implements OnInit {
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly workstationService = inject(WorkstationService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly records = signal<ApplicationFormRecord[]>([]);
  readonly searchText = signal('');
  readonly shiftSelections = signal<Record<string, string>>({});
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
    return this.records().filter((record) =>
      this.isShiftApplicable(record) &&
      (!query || [record.EmployeeCode, record.EmployeeName, record.ReportingManager].some((value) =>
        value.toLowerCase().includes(query),
      )),
    );
  });

  ngOnInit(): void {
    this.loadMasterForms();
    this.loadShiftOptions();
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

  private isShiftApplicable(record: ApplicationFormRecord): boolean {
    return record.detail?.hrSettings.attendanceShiftManagement.trim().toLowerCase() === 'yes';
  }
}
