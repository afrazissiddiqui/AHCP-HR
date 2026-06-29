import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { AlertService } from '../../../../services/alert.service';
import {
  PayrollProcessingListRecord,
  PayrollProcessingRecord,
  PayrollProcessingService,
} from '../../../../services/payroll-processing.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { PayrollMasterLayoutService } from '../payroll-master-layout.service';

type PayrollProcessingColumnKey = Exclude<keyof PayrollProcessingListRecord, never>;

@Component({
  selector: 'app-payroll-processing',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './payroll-processing.html',
  styleUrl: '../../Application-Form/Application-Form.css',
  styles: [`
    .payroll-list-row {
      cursor: pointer;
    }
    .payroll-list-row:hover td {
      background: #f8fafc;
    }
  `],
})
export class PayrollProcessingComponent implements OnInit {
  private readonly layout = inject(PayrollMasterLayoutService);
  private readonly router = inject(Router);
  private readonly payrollProcessingService = inject(PayrollProcessingService);
  private readonly alertService = inject(AlertService);

  readonly loading = signal(false);
  readonly showViewDialog = signal(false);
  readonly viewLoading = signal(false);
  readonly selectedRecord = signal<PayrollProcessingRecord | null>(null);
  searchText = '';
  selectedStatus = '';
  showDialog = false;
  activeTab: 'filter' = 'filter';

  readonly columns: Array<{ key: PayrollProcessingColumnKey; label: string; visible: boolean }> = [
    { key: 'Id', label: 'ID', visible: true },
    { key: 'Month', label: 'Month', visible: true },
    { key: 'Year', label: 'Year', visible: true },
    { key: 'Remarks', label: 'Remarks', visible: true },
    { key: 'Currency', label: 'Currency', visible: true },
    { key: 'Status', label: 'Status', visible: true },
    { key: 'ProcessedBy', label: 'Processed By', visible: false },
    { key: 'ProcessedDate', label: 'Processed Date', visible: true },
    { key: 'EmployeeCount', label: 'Employees', visible: true },
  ];

  ngOnInit(): void {
    this.loadRecords();
  }

  get payrollProcessingList(): PayrollProcessingListRecord[] {
    return this.payrollProcessingService.records();
  }

  get statusOptions(): string[] {
    const seen = new Set<string>();
    for (const row of this.payrollProcessingList) {
      const status = row.Status?.trim();
      if (status) {
        seen.add(status);
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get filteredPayrollRows(): PayrollProcessingListRecord[] {
    let list = this.payrollProcessingList;

    if (this.selectedStatus) {
      list = list.filter((row) => row.Status === this.selectedStatus);
    }

    if (!this.searchText.trim()) {
      return list;
    }

    const search = this.searchText.toLowerCase();
    return list.filter((row) =>
      String(row.Id).includes(search) ||
      this.formatMonth(row.Month).toLowerCase().includes(search) ||
      String(row.Year).includes(search) ||
      row.Remarks.toLowerCase().includes(search) ||
      row.Currency.toLowerCase().includes(search) ||
      row.Status.toLowerCase().includes(search) ||
      row.ProcessedDate.toLowerCase().includes(search) ||
      String(row.EmployeeCount).includes(search),
    );
  }

  get visibleColumns(): Array<{ key: PayrollProcessingColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((column) => column.visible);
  }

  getCellValue(row: PayrollProcessingListRecord, key: PayrollProcessingColumnKey): string | number {
    if (key === 'Month') {
      return this.formatMonth(row.Month);
    }
    return row[key];
  }

  formatMonth(month: number): string {
    const labels = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return labels[month] ?? String(month);
  }

  onSearchChange(): void {
    // Hook for shellbar search parity.
  }

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  createPayrollProcess(): void {
    void this.router.navigateByUrl('/payroll-master/payroll-processing/create');
  }

  formatMoney(value: number, currency = 'PKR'): string {
    return `${currency} ${value.toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  viewRecord(record: PayrollProcessingListRecord): void {
    if (!record.Id) {
      void this.alertService.warning('View', 'Unable to view this row: missing payroll process id.');
      return;
    }

    this.showViewDialog.set(true);
    this.selectedRecord.set(null);
    this.viewLoading.set(true);

    this.payrollProcessingService.fetchPayrollProcessingDetail(record.Id).subscribe({
      next: (detail) => {
        this.selectedRecord.set(detail);
        this.viewLoading.set(false);
      },
      error: (error: unknown) => {
        this.viewLoading.set(false);
        this.showViewDialog.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load payroll process details.'),
        );
      },
    });
  }

  closeViewDialog(): void {
    this.showViewDialog.set(false);
    this.selectedRecord.set(null);
    this.viewLoading.set(false);
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  private loadRecords(): void {
    this.loading.set(true);
    this.payrollProcessingService.fetchPayrollProcessingList().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load payroll processing list.'),
        );
      },
    });
  }
}
