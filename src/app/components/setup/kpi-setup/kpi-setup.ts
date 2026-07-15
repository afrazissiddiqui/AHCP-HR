import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { KpiSetupRecord, KpiSetupService } from '../../../services/kpi-setup.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-kpi-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kpi-setup.html',
  styleUrls: ['./kpi-setup.css'],
})
export class KpiSetupComponent implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly kpiSetupService = inject(KpiSetupService);

  readonly loading = signal(false);
  readonly kpis = signal<KpiSetupRecord[]>([]);

  ngOnInit(): void {
    this.loadKpiList();
  }

  loadKpiList(): void {
    this.loading.set(true);
    this.kpiSetupService
      .fetchKpis()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (records) => this.kpis.set(records),
        error: (error: unknown) => {
          this.kpis.set([]);
          void this.alertService.error('Load Failed', formatApiErrorMessage(error, 'Failed to load KPI list.'));
        },
      });
  }

  trackById(index: number, record: KpiSetupRecord): string | number {
    return record.id ?? index;
  }

  displayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '—';
    }
    const text = String(value).trim();
    return text === '' ? '—' : text;
  }
}
