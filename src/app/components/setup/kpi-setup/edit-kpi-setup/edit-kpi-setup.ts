import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AlertService } from '../../../../services/alert.service';
import { KpiSetupService } from '../../../../services/kpi-setup.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';

interface KpiItemForm {
  kpi: string;
  weight: string;
  weight_percentage: string;
  defination_measurement: string;
}

interface KpiDetailResponse {
  id?: string | number;
  department?: string;
  Employement_Nature?: string;
  Work_Level?: string;
  Employement_Category?: string;
  Employement_Status?: string;
  Designation?: string;
  kpis?: KpiItemForm[];
  [key: string]: unknown;
}

@Component({
  selector: 'app-edit-kpi-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-kpi-setup.html',
  styleUrls: ['./edit-kpi-setup.css'],
})
export class EditKpiSetupComponent implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly kpiSetupService = inject(KpiSetupService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly kpiId = signal<string | number | null>(null);
  
  department = '';
  employmentNature = '';
  workLevel = '';
  employmentCategory = '';
  employmentStatus = '';
  designation = '';
  kpiRows: KpiItemForm[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.kpiId.set(id);
      this.loadKpiDetail(id);
    }
  }

  loadKpiDetail(id: string | number): void {
    this.loading.set(true);
    this.kpiSetupService
      .fetchKpiDetail(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => {
          console.log('KPI Detail loaded for edit:', detail);
          this.populateForm(detail);
        },
        error: (error: unknown) => {
          void this.alertService.error('Load Failed', formatApiErrorMessage(error, 'Failed to load KPI details.'));
          void this.router.navigate(['/setup/kpi-setup']);
        },
      });
  }

  private populateForm(detail: KpiDetailResponse & Record<string, unknown>): void {
    console.log('Populating form with:', detail);
    
    this.department = (detail.department as string) || '';
    this.employmentNature = (detail['Employement_Nature'] as string) || '';
    this.workLevel = (detail['Work_Level'] as string) || '';
    this.employmentCategory = (detail['Employement_Category'] as string) || '';
    this.employmentStatus = (detail['Employement_Status'] as string) || '';
    this.designation = (detail['Designation'] as string) || '';
    
    const kpisData = detail['kpis'];
    console.log('KPIs data from API:', kpisData);
    
    if (Array.isArray(kpisData) && kpisData.length > 0) {
      this.kpiRows = kpisData.map((item: any) => ({
        kpi: (item.kpi as string) || '',
        weight: (item.weight as string) || '',
        weight_percentage: (item.weight_percentage as string) || '',
        defination_measurement: (item.defination_measurement as string) || '',
      }));
      console.log('KPI rows populated:', this.kpiRows);
    } else {
      console.warn('No KPI rows found in API response');
      this.kpiRows = [];
    }
  }

  addKpiRow(): void {
    this.kpiRows = [
      ...this.kpiRows,
      {
        kpi: '',
        weight: '',
        weight_percentage: '',
        defination_measurement: '',
      },
    ];
  }

  removeKpiRow(index: number): void {
    this.kpiRows = this.kpiRows.filter((_, itemIndex) => itemIndex !== index);
  }

  saveKpi(): void {
    const payload = {
      department: this.department,
      Employement_Nature: this.employmentNature,
      Work_Level: this.workLevel,
      Employement_Category: this.employmentCategory,
      Employement_Status: this.employmentStatus,
      Designation: this.designation,
      kpis: this.kpiRows.map((item) => ({
        kpi: item.kpi,
        weight: item.weight,
        weight_percentage: item.weight_percentage,
        defination_measurement: item.defination_measurement,
      })),
    };

    if (!payload.kpis.length || payload.kpis.some((item) => !item.kpi || !item.weight || !item.weight_percentage || !item.defination_measurement)) {
      void this.alertService.validation('Please complete all KPI fields before submitting.');
      return;
    }

    const id = this.kpiId();
    if (!id) {
      void this.alertService.error('Error', 'KPI ID is missing.');
      return;
    }

    this.loading.set(true);
    this.kpiSetupService
      .updateKpi(id, payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          void this.alertService.success('Success', 'KPI updated successfully.');
          void this.router.navigate(['/setup/kpi-setup']);
        },
        error: (error: unknown) => {
          void this.alertService.error('Update Failed', formatApiErrorMessage(error, 'Could not update KPI.'));
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/setup/kpi-setup']);
  }
}
