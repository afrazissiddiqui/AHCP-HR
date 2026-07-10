import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { OvertimeListRecord, OvertimeListService } from '../../../services/overtime-list.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';

type OvertimeColumnKey =
  | 'employeeId'
  | 'employeeName'
  | 'overtimeHours'
  | 'overtimeRate'
  | 'overtimeAmount'
  | 'reportingManager'
  | 'status';

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
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly records = signal<OvertimeListRecord[]>([]);
  readonly searchText = signal('');

  readonly columns: OvertimeTableColumn[] = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee Name' },
    { key: 'overtimeHours', label: 'Over Time Hours' },
    { key: 'overtimeRate', label: 'OverTime Rate' },
    { key: 'overtimeAmount', label: 'Overtime Amount' },
    { key: 'reportingManager', label: 'Reporting Manager' },
    { key: 'status', label: 'Status' },
  ];

  readonly totalRecords = computed(() => this.records().length);

  readonly filteredRecords = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    if (!query) {
      return this.records();
    }

    return this.records().filter((record) => {
      const searchable = [
        record.employeeId,
        record.employeeName,
        record.reportingManager,
        record.status,
        this.formatNumber(record.overtimeHours),
        this.formatNumber(record.overtimeRate),
        this.formatNumber(record.overtimeAmount),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  });

  ngOnInit(): void {
    this.loadOvertimeList();
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
      case 'overtimeAmount':
        return this.formatNumber(record[key]);
      case 'status':
        return this.formatStatus(record.status);
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

  private formatStatus(value: string): string {
    if (!value) {
      return '—';
    }
    if (value === '1') {
      return 'Active';
    }
    if (value === '3') {
      return 'Inactive';
    }
    return value;
  }
}
