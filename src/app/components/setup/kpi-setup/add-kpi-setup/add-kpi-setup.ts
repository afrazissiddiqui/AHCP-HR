import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

@Component({
  selector: 'app-add-kpi-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-kpi-setup.html',
  styleUrls: ['./add-kpi-setup.css'],
})
export class AddKpiSetupComponent {
  private readonly alertService = inject(AlertService);
  private readonly kpiSetupService = inject(KpiSetupService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  department = 'Production';
  employmentNature = 'Technical';
  workLevel = '2-A';
  employmentCategory = 'Executive';
  employmentStatus = 'Perminant';
  designation = 'Plant Manager';
  kpiRows: KpiItemForm[] = [
    {
      kpi: 'Overall Production Target Achievement',
      weight: '20',
      weight_percentage: '≥98%',
      defination_measurement: 'Achievement of monthly production plan across all production lines and grammages.',
    },
  ];

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

    this.loading.set(true);
    this.kpiSetupService
      .createKpi(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          void this.alertService.success('Success', 'KPI added successfully.');
          void this.router.navigate(['/setup/kpi-setup']);
        },
        error: (error: unknown) => {
          void this.alertService.error('Save Failed', formatApiErrorMessage(error, 'Could not add KPI.'));
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/setup/kpi-setup']);
  }
}
