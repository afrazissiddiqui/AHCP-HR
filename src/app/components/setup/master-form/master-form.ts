import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { AlertService } from '../../../services/alert.service';
import { MasterFormRecord, MasterFormService } from '../../../services/master-form.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { formatTableCellValue } from '../../../utils/date-format.util';

@Component({
  selector: 'app-master-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-form.html',
  styleUrl: './master-form.css',
})
export class MasterFormComponent implements OnInit {
  private readonly masterFormService = inject(MasterFormService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly records = signal<MasterFormRecord[]>([]);
  readonly columns = signal<string[]>([]);
  readonly searchText = signal('');

  readonly totalRecords = computed(() => this.records().length);

  readonly filteredRecords = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    if (!query) {
      return this.records();
    }

    return this.records().filter((record) =>
      Object.entries(record).some(([key, value]) => {
        if (this.isHiddenColumn(key)) {
          return false;
        }
        return this.cellValue(record, key).toLowerCase().includes(query);
      }),
    );
  });

  ngOnInit(): void {
    this.loadMasterForms();
  }

  loadMasterForms(): void {
    this.loading.set(true);
    this.masterFormService
      .fetchMasterForms()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (records) => {
          this.records.set(records);
          this.columns.set(this.deriveColumns(records));
        },
        error: (error: unknown) => {
          this.records.set([]);
          this.columns.set([]);
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load submitted master forms.'),
          );
        },
      });
  }

  viewRecord(record: MasterFormRecord): void {
    const id = this.resolveRecordId(record);
    if (!id) {
      this.showDetailModal(record);
      return;
    }

    this.detailLoading.set(true);
    this.masterFormService
      .fetchMasterFormDetail(id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (detail) => this.showDetailModal(detail),
        error: (error: unknown) => {
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load master form details.'),
          );
        },
      });
  }

  columnLabel(column: string): string {
    return column
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  cellValue(record: MasterFormRecord, column: string): string {
    const value = record[column];
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return formatTableCellValue(column, value as string | number);
  }

  isStatusColumn(column: string): boolean {
    return column.toLowerCase() === 'status';
  }

  statusClass(record: MasterFormRecord, column: string): string {
    const value = String(record[column] ?? '').trim().toLowerCase();
    if (!value || value === '—') {
      return 'status-pill status-pill--neutral';
    }
    if (['1', 'active', 'approved', 'submitted', 'yes', 'true'].includes(value)) {
      return 'status-pill status-pill--success';
    }
    if (['0', 'inactive', 'rejected', 'cancelled', 'no', 'false', '3'].includes(value)) {
      return 'status-pill status-pill--danger';
    }
    if (['pending', 'draft', 'in progress', 'processing'].includes(value)) {
      return 'status-pill status-pill--warning';
    }
    return 'status-pill status-pill--neutral';
  }

  trackByColumn(_index: number, column: string): string {
    return column;
  }

  trackByRecord(index: number, record: MasterFormRecord): string | number {
    return this.resolveRecordId(record) ?? index;
  }

  private deriveColumns(records: MasterFormRecord[]): string[] {
    const priority = [
      'employeeId',
      'employee_id',
      'EmployeeId',
      'employeeName',
      'employee_name',
      'EmployeeName',
      'department',
      'Department',
      'designation',
      'Designation',
      'branch',
      'Branch',
      'status',
      'Status',
      'created_at',
      'createdAt',
      'submitted_at',
      'submittedAt',
    ];

    const discovered = new Set<string>();
    for (const record of records) {
      Object.keys(record).forEach((key) => {
        if (!this.isHiddenColumn(key)) {
          discovered.add(key);
        }
      });
    }

    const ordered = priority.filter((key) => discovered.has(key));
    const remaining = [...discovered].filter((key) => !priority.includes(key)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remaining];
  }

  private isHiddenColumn(column: string): boolean {
    const normalized = column.toLowerCase();
    return ['id', 'created_at', 'updated_at', 'deleted_at'].includes(normalized);
  }

  private resolveRecordId(record: MasterFormRecord): string | number | null {
    const candidates = ['id', 'Id', 'ID', 'master_form_id', 'masterFormId'];
    for (const key of candidates) {
      const value = record[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        return value as string | number;
      }
    }
    return null;
  }

  private showDetailModal(detail: MasterFormRecord): void {
    const rows = Object.entries(detail)
      .filter(([key]) => !this.isHiddenColumn(key))
      .map(
        ([key, value]) =>
          `<div style="display:grid;grid-template-columns:180px 1fr;gap:8px 12px;padding:8px 0;border-bottom:1px solid #edf2ff;font-size:13px;">
            <strong style="color:#173e78;">${this.columnLabel(key)}</strong>
            <span style="color:#334155;">${this.escapeHtml(this.cellValue(detail, key))}</span>
          </div>`,
      )
      .join('');

    void Swal.fire({
      title: '<strong>Master Form Details</strong>',
      html: `<div style="text-align:left;max-height:60vh;overflow-y:auto;">${rows || '<p style="color:#64748b;">No details available.</p>'}</div>`,
      icon: 'info',
      confirmButtonColor: '#0a6ed1',
      width: '760px',
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
