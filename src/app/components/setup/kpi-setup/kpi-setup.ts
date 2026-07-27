import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
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
  private readonly router = inject(Router);

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

  goToAddKpi(): void {
    void this.router.navigate(['/setup/kpi-setup/add']);
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

  viewKpi(record: KpiSetupRecord): void {
    const id = record.id;
    console.log('View KPI clicked for:', record, 'ID:', id);
    if (id) {
      this.kpiSetupService.fetchKpiDetail(id).subscribe({
        next: (detail) => {
          console.log('KPI Detail fetched successfully:', detail);
          this.showDetailModal(detail);
        },
        error: (error: unknown) => {
          console.error('Error fetching KPI detail:', error);
          void this.alertService.error('Load Failed', formatApiErrorMessage(error, 'Failed to load KPI details.'));
        },
      });
    } else {
      console.warn('No ID found for KPI record');
    }
  }

  private showDetailModal(detail: KpiSetupRecord & Record<string, unknown>): void {
    console.log('🎯 showDetailModal called with:', detail);
    console.log('🎯 All detail keys:', Object.keys(detail));
    console.log('🎯 department:', detail.department);
    console.log('🎯 work_level:', detail.work_level);
    console.log('🎯 designation:', detail.designation);
    const kpis = Array.isArray(detail['kpis']) ? (detail['kpis'] as any[]) : [];
    console.log('🎯 KPIs array:', kpis);

    const kpiRows = kpis
      .map(
        (k: any, idx: number) =>
          `<tr style="border-bottom: 1px solid #edf2ff;">
        <td style="padding: 10px;">${idx + 1}</td>
        <td style="padding: 10px;">${k.kpi || '—'}</td>
        <td style="padding: 10px;">${k.weight || '—'}</td>
        <td style="padding: 10px;">${k.weight_percentage || '—'}</td>
        <td style="padding: 10px;">${k.defination_measurement || '—'}</td>
      </tr>`,
      )
      .join('');

    const htmlContent = `
      <div style="text-align: left; max-height: 60vh; overflow-y: auto;">
        <div style="margin-bottom: 20px;">
          <h5 style="margin: 0 0 12px 0; color: #173e78; font-size: 14px;">Department Information</h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
            <div><strong>Department:</strong> <span style="color: #555;">${detail.department || '—'}</span></div>
            <div><strong>Employment Nature:</strong> <span style="color: #555;">${(detail['Employement_Nature'] as string) || '—'}</span></div>
            <div><strong>Work Level:</strong> <span style="color: #555;">${detail.work_level || '—'}</span></div>
            <div><strong>Employment Category:</strong> <span style="color: #555;">${(detail['Employement_Category'] as string) || '—'}</span></div>
            <div><strong>Employment Status:</strong> <span style="color: #555;">${(detail['Employement_Status'] as string) || '—'}</span></div>
            <div><strong>Designation:</strong> <span style="color: #555;">${detail.designation || '—'}</span></div>
          </div>
        </div>

        <div>
          <h5 style="margin: 20px 0 12px 0; color: #173e78; font-size: 14px;">KPI Rows</h5>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e0e7ff;">
            <thead>
              <tr style="background: #f0f4ff; border-bottom: 1px solid #dde6f5;">
                <th style="padding: 10px; text-align: left; color: #173e78; font-weight: 600; width: 40px;">SR</th>
                <th style="padding: 10px; text-align: left; color: #173e78; font-weight: 600;">KPI</th>
                <th style="padding: 10px; text-align: left; color: #173e78; font-weight: 600; width: 80px;">Weight</th>
                <th style="padding: 10px; text-align: left; color: #173e78; font-weight: 600; width: 100px;">Weight %</th>
                <th style="padding: 10px; text-align: left; color: #173e78; font-weight: 600;">Definition</th>
              </tr>
            </thead>
            <tbody>
              ${kpiRows || '<tr><td colspan="5" style="padding: 10px; text-align: center; color: #999;">No KPI data available</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    console.log('About to show modal with HTML content');
    void Swal.fire({
      title: `<strong>KPI Details - ${detail.department}</strong>`,
      html: htmlContent,
      icon: 'info',
      confirmButtonColor: '#0052cc',
      width: '800px',
      didOpen: () => {
        console.log('Modal opened successfully');
      },
      didClose: () => {
        console.log('Modal closed');
      },
    }).then(() => {
      console.log('Modal promise resolved');
    });
  }

  updateKpi(record: KpiSetupRecord): void {
    const id = record.id;
    if (id) {
      // TODO: Navigate to edit page and load the detail data
      void this.router.navigate(['/setup/kpi-setup', id, 'edit']);
    }
  }

  deleteKpi(record: KpiSetupRecord): void {
    void this.alertService.confirm('Delete KPI', `Are you sure you want to delete the KPI for ${this.displayValue(record.department)}?`).then((result) => {
      if (result.isConfirmed) {
        const id = record.id;
        if (id) {
          this.kpiSetupService.deleteKpi(id).subscribe({
            next: () => {
              void this.alertService.success('Success', 'KPI deleted successfully.');
              this.loadKpiList();
            },
            error: (error: unknown) => {
              void this.alertService.error('Delete Failed', formatApiErrorMessage(error, 'Failed to delete KPI.'));
            },
          });
        }
      }
    });
  }
}
