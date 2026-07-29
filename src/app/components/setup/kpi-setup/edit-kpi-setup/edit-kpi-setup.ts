import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AlertService } from '../../../../services/alert.service';
import { KpiSetupService } from '../../../../services/kpi-setup.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { GatePassDepartmentService } from '../../../gate-pass/gate-pass-department.service';

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
  kpis?: Record<string, unknown>[];
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
  private readonly departmentService = inject(GatePassDepartmentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly kpiId = signal<string | number | null>(null);
  readonly departmentOptions = signal<string[]>([]);
  readonly departmentLoading = signal(false);
  readonly employmentNatureOptions = ['Technical', 'Non-Technical'];
  readonly employmentCategoryOptions = ['Executive', 'Non-Executive', 'Top Management'];
  readonly employmentStatusOptions = ['Permanent', 'Contractual'];
  readonly workLevelOptions = ['WL 1A', 'WL 1W', 'WL 1S', 'WL 5', 'WL 4', 'WL 3B', 'WL 3A', 'WL 2C', 'WL 2B', 'WL 2A', 'WL 1D', 'WL 1B', 'WL 1C'];
  
  department = '';
  employmentNature = '';
  workLevel = '';
  employmentCategory = '';
  employmentStatus = '';
  designation = '';
  kpiRows: KpiItemForm[] = [];

  ngOnInit(): void {
    this.loadDepartments();
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
    this.department = this.pickField(detail, ['department', 'Department']);
    this.employmentNature = this.pickField(detail, ['Employement_Nature', 'Employment_Nature', 'employment_nature']);
    this.workLevel = this.pickField(detail, ['Work_Level', 'work_level', 'workLevel']);
    this.employmentCategory = this.pickField(detail, ['Employement_Category', 'Employment_Category', 'employment_category']);
    this.employmentStatus = this.pickField(detail, ['Employement_Status', 'Employment_Status', 'employment_status']);
    this.designation = this.pickField(detail, ['Designation', 'designation']);

    const kpisData = detail['kpis'];

    if (Array.isArray(kpisData) && kpisData.length > 0) {
      this.kpiRows = kpisData.map((item) => ({
        kpi: this.pickField(item, ['kpi', 'Kpi', 'KPI', 'kpi_name', 'kpiName', 'Kpi_Name']),
        weight: this.pickField(item, ['weight', 'Weight', 'weightage', 'Weightage']),
        weight_percentage: this.pickField(item, ['weight_percentage', 'weightPercentage', 'Weight_Percentage', 'percentage', 'Percentage']),
        defination_measurement: this.pickField(item, ['defination_measurement', 'definition_measurement', 'Defination_Measurement', 'Definition_Measurement', 'definition', 'Definition']),
      }));
    } else {
      this.kpiRows = [];
    }
  }

  private pickField(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (value === null || value === undefined) {
        continue;
      }
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
    return '';
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

  private loadDepartments(): void {
    this.departmentLoading.set(true);
    this.departmentService.ensureLoaded().subscribe({
      next: (departments) => {
        const options = departments.map((department) => department.name).filter((name): name is string => !!name);
        this.departmentOptions.set(options);
        this.departmentLoading.set(false);
      },
      error: () => {
        this.departmentOptions.set([]);
        this.departmentLoading.set(false);
      },
    });
  }
}
