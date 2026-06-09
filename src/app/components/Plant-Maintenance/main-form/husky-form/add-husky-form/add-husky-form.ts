import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../../services/alert.service';
import { SAP_MACHINE_MASTER } from '../../../setup-form/plant-maintenance-machine.model';
import {
  calculateHuskyKpiPercentage,
  createEmptyHuskyKpiRows,
  createEmptyHuskyHydraulicCheckpoints,
  createEmptyHuskySafetyCheckpoints,
  HUSKY_HYDRAULIC_CHECKPOINT_DEFINITIONS,
  HUSKY_INSPECTOR_USERS,
  HUSKY_SAFETY_CHECKPOINT_DEFINITIONS,
  HuskyCheckpointEvaluation,
  HuskyFormService,
  HuskyHydraulicCheckpoint,
  HuskyKpiRow,
  HuskyKpiStatus,
  HuskySafetyCheckpoint,
  mergeHuskyCheckpoints,
  resolveHuskyKpiStatus,
} from '../husky-form.service';

export interface HuskySectionNavItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-add-husky-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-husky-form.html',
  styleUrls: [
    '../../../../HR-Portal/payroll-master/tax-computation/tax-computation.css',
    '../../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../../../setup-form/plant-maintenance-setup-form.css',
    './add-husky-form.css',
  ],
})
export class AddHuskyFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly huskyService = inject(HuskyFormService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editingRecordId = signal<string | null>(null);
  readonly isCreateMode = computed(() => !this.editingRecordId());
  readonly pageTitle = computed(() =>
    this.editingRecordId() ? 'Update Husky Form' : 'Add Husky Form',
  );

  readonly machineId = signal('');
  readonly machineName = signal('');
  readonly maintenanceType = signal('');
  readonly maintenanceFrequency = signal('');
  readonly serialNo = signal('');
  readonly moldNo = signal('');
  readonly hotRunnerJobNo = signal('');
  readonly hourMeterReading = signal('');
  readonly robotSerialNo = signal('');
  readonly inspector = signal('');
  readonly inspectionDate = signal('');
  readonly submitDate = signal('');
  readonly documentNo = signal('');
  readonly status = signal('');
  readonly kpiRows = signal<HuskyKpiRow[]>(createEmptyHuskyKpiRows());
  readonly safetyCheckpoints = signal<HuskySafetyCheckpoint[]>(createEmptyHuskySafetyCheckpoints());
  readonly hydraulicCheckpoints = signal<HuskyHydraulicCheckpoint[]>(
    createEmptyHuskyHydraulicCheckpoints(),
  );

  readonly machineOptions = SAP_MACHINE_MASTER;
  readonly evaluationOptions = ['Pass', 'Fail', 'N/A'] as const;
  readonly inspectorUsers = HUSKY_INSPECTOR_USERS;

  readonly maintenanceTypeOptions = [
    'Preventive',
    'Corrective',
    'Breakdown',
    'Pre-Cautionary',
  ] as const;

  readonly maintenanceFrequencyOptions = [
    'Daily',
    'Weekly',
    'ForthNight',
    'Monthly',
    'Quatterly',
    'Semi-annually',
  ] as const;

  readonly sectionNavItems: HuskySectionNavItem[] = [
    { id: 'husky-kpi-section', label: 'Key Performance Indicators (KPI)' },
    { id: 'husky-safety-section', label: 'Safety' },
    { id: 'husky-hydraulic-section', label: 'Hydraulic and Hydraulic Manifolds' },
    {
      id: 'husky-mechanical-section',
      label: 'Mechanical / Pneumatic / Water / Electrical / Software',
    },
    { id: 'husky-measurements-section', label: 'Measurements / Calibration' },
    { id: 'husky-level-section', label: 'Level / Parallelism' },
    { id: 'husky-robot-section', label: 'Robot and Conveyor' },
    { id: 'husky-cycle-time-section', label: 'Cycle Time Comparison' },
  ];

  readonly activeSection = signal(this.sectionNavItems[0].id);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;

  private intersectionObserver: IntersectionObserver | null = null;
  private pauseSectionObserver = false;
  private sectionObserverResumeTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    const record = this.huskyService.getById(id);
    if (!record) {
      this.alertService.validation('Husky Form record not found.');
      void this.router.navigate(['/plant-maintenance/main-form/husky-form']);
      return;
    }
    this.editingRecordId.set(id);
    this.machineId.set(record.machineId);
    this.machineName.set(record.machineName);
    this.maintenanceType.set(record.maintenanceType);
    this.maintenanceFrequency.set(record.maintenanceFrequency);
    this.serialNo.set(record.serialNo);
    this.moldNo.set(record.moldNo);
    this.hotRunnerJobNo.set(record.hotRunnerJobNo);
    this.hourMeterReading.set(record.hourMeterReading);
    this.robotSerialNo.set(record.robotSerialNo);
    this.inspector.set(record.inspector);
    this.inspectionDate.set(record.inspectionDate);
    this.submitDate.set(record.submitDate);
    this.documentNo.set(record.documentNo);
    this.status.set(record.status);
    this.kpiRows.set(this.cloneKpiRows(record.kpiRows));
    this.safetyCheckpoints.set(this.cloneSafetyCheckpoints(record.safetyCheckpoints));
    this.hydraulicCheckpoints.set(this.cloneHydraulicCheckpoints(record.hydraulicCheckpoints));
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.sectionObserverResumeTimer) {
      clearTimeout(this.sectionObserverResumeTimer);
    }
    this.destroyIntersectionObserver();
  }

  scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    this.pauseSectionObserver = true;
    if (this.sectionObserverResumeTimer) {
      clearTimeout(this.sectionObserverResumeTimer);
    }

    requestAnimationFrame(() => {
      const scrollRoot = this.scrollContainer?.nativeElement;
      const element =
        scrollRoot?.querySelector<HTMLElement>(`#${CSS.escape(sectionId)}`) ??
        document.getElementById(sectionId);

      if (!element) {
        this.resumeSectionObserver();
        return;
      }

      if (scrollRoot?.contains(element)) {
        const top =
          element.getBoundingClientRect().top -
          scrollRoot.getBoundingClientRect().top +
          scrollRoot.scrollTop;
        scrollRoot.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' });
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      this.sectionObserverResumeTimer = setTimeout(() => this.resumeSectionObserver(), 450);
    });
  }

  onSectionNavKeydown(event: KeyboardEvent, sectionId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.scrollToSection(sectionId);
    }
  }

  back(): void {
    void this.router.navigate(['/plant-maintenance/main-form/husky-form']);
  }

  onMachineIdChange(value: string): void {
    this.machineId.set(value);
    const machine = this.machineOptions.find((m) => m.machineId === value);
    this.machineName.set(machine?.machineName ?? '');
  }

  onMaintenanceTypeChange(value: string): void {
    this.maintenanceType.set(value);
  }

  onMaintenanceFrequencyChange(value: string): void {
    this.maintenanceFrequency.set(value);
  }

  onInspectorChange(value: string): void {
    this.inspector.set(value);
  }

  onInspectionDateChange(value: string): void {
    this.inspectionDate.set(value);
  }

  getKpiPercentage(row: HuskyKpiRow): number | null {
    return calculateHuskyKpiPercentage(row.issuesScore, row.maxPossibleScore);
  }

  getKpiStatus(row: HuskyKpiRow): HuskyKpiStatus {
    return resolveHuskyKpiStatus(this.getKpiPercentage(row));
  }

  getKpiStatusLabel(status: HuskyKpiStatus): string {
    switch (status) {
      case 'Pass':
        return 'Green (Pass)';
      case 'Warning':
        return 'Yellow (Warning)';
      case 'Fail':
        return 'Red (Fail)';
      default:
        return '—';
    }
  }

  getKpiStatusClass(status: HuskyKpiStatus): string {
    switch (status) {
      case 'Pass':
        return 'husky-kpi-status--pass';
      case 'Warning':
        return 'husky-kpi-status--warning';
      case 'Fail':
        return 'husky-kpi-status--fail';
      default:
        return 'husky-kpi-status--empty';
    }
  }

  updateKpiIssuesScore(key: string, value: string): void {
    this.updateKpiRow(key, { issuesScore: this.parseScoreValue(value) });
  }

  updateKpiMaxScore(key: string, value: string): void {
    this.updateKpiRow(key, { maxPossibleScore: this.parseScoreValue(value) });
  }

  updateKpiNotes(key: string, value: string): void {
    this.updateKpiRow(key, { notes: value });
  }

  getEvaluationSelectClass(evaluation: HuskyCheckpointEvaluation): string {
    switch (evaluation) {
      case 'Pass':
        return 'mad-select--status-pass';
      case 'Fail':
        return 'mad-select--status-fail';
      case 'N/A':
        return 'mad-select--status-na';
      default:
        return 'mad-select--status-empty';
    }
  }

  updateSafetyEvaluation(key: string, value: string): void {
    this.updateSafetyCheckpoint(key, {
      evaluation: value as HuskyCheckpointEvaluation,
    });
  }

  updateSafetyRecommendation(key: string, value: string): void {
    this.updateSafetyCheckpoint(key, { recommendation: value });
  }

  updateHydraulicEvaluation(key: string, value: string): void {
    this.updateHydraulicCheckpoint(key, {
      evaluation: value as HuskyCheckpointEvaluation,
    });
  }

  updateHydraulicRecommendation(key: string, value: string): void {
    this.updateHydraulicCheckpoint(key, { recommendation: value });
  }

  async save(): Promise<void> {
    const machineId = this.machineId().trim();
    const machineName = this.machineName().trim();
    const maintenanceType = this.maintenanceType().trim();
    const maintenanceFrequency = this.maintenanceFrequency().trim();
    const inspector = this.inspector().trim();
    const inspectionDate = this.inspectionDate().trim();

    if (!machineId) {
      this.alertService.validation('Please select a Machine ID.');
      return;
    }
    if (!maintenanceType) {
      this.alertService.validation('Please select a Maintenance Type.');
      return;
    }
    if (!maintenanceFrequency) {
      this.alertService.validation('Please select a Maintenance Frequency.');
      return;
    }
    if (!inspector) {
      this.alertService.validation('Please select an Inspector.');
      return;
    }
    if (!inspectionDate) {
      this.alertService.validation('Please enter an Inspection Date.');
      return;
    }

    const payload = {
      machineId,
      machineName,
      maintenanceType,
      maintenanceFrequency,
      serialNo: this.serialNo().trim(),
      moldNo: this.moldNo().trim(),
      hotRunnerJobNo: this.hotRunnerJobNo().trim(),
      hourMeterReading: this.hourMeterReading().trim(),
      robotSerialNo: this.robotSerialNo().trim(),
      inspector,
      inspectionDate,
      kpiRows: this.cloneKpiRows(this.kpiRows()),
      safetyCheckpoints: this.cloneSafetyCheckpoints(this.safetyCheckpoints()),
      hydraulicCheckpoints: this.cloneHydraulicCheckpoints(this.hydraulicCheckpoints()),
    };

    const editingId = this.editingRecordId();
    if (editingId) {
      this.huskyService.updateRecord(editingId, payload);
      await this.alertService.successAndWait('Success', 'Husky Form updated successfully.');
    } else {
      this.huskyService.addRecord(payload);
      await this.alertService.successAndWait('Success', 'Husky Form submitted successfully.');
    }

    void this.router.navigate(['/plant-maintenance/main-form/husky-form']);
  }

  private setupIntersectionObserver(): void {
    const scrollRoot = this.scrollContainer?.nativeElement ?? null;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (this.pauseSectionObserver) {
          return;
        }
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          this.activeSection.set(visible[0].target.id);
        }
      },
      {
        root: scrollRoot,
        rootMargin: '-45% 0px -45% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const section of this.sectionNavItems) {
      const element =
        scrollRoot?.querySelector<HTMLElement>(`#${CSS.escape(section.id)}`) ??
        document.getElementById(section.id);
      if (element) {
        this.intersectionObserver.observe(element);
      }
    }
  }

  private resumeSectionObserver(): void {
    this.pauseSectionObserver = false;
    this.sectionObserverResumeTimer = null;
  }

  private destroyIntersectionObserver(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
  }

  private updateKpiRow(key: string, patch: Partial<Pick<HuskyKpiRow, 'issuesScore' | 'maxPossibleScore' | 'notes'>>): void {
    this.kpiRows.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  private parseScoreValue(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private cloneKpiRows(rows: HuskyKpiRow[] | undefined): HuskyKpiRow[] {
    const source = rows?.length ? rows : createEmptyHuskyKpiRows();
    return source.map((row) => ({ ...row }));
  }

  private updateSafetyCheckpoint(
    key: string,
    patch: Partial<Pick<HuskySafetyCheckpoint, 'evaluation' | 'recommendation'>>,
  ): void {
    this.safetyCheckpoints.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  private cloneSafetyCheckpoints(
    rows: HuskySafetyCheckpoint[] | undefined,
  ): HuskySafetyCheckpoint[] {
    return mergeHuskyCheckpoints(rows, HUSKY_SAFETY_CHECKPOINT_DEFINITIONS);
  }

  private updateHydraulicCheckpoint(
    key: string,
    patch: Partial<Pick<HuskyHydraulicCheckpoint, 'evaluation' | 'recommendation'>>,
  ): void {
    this.hydraulicCheckpoints.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  private cloneHydraulicCheckpoints(
    rows: HuskyHydraulicCheckpoint[] | undefined,
  ): HuskyHydraulicCheckpoint[] {
    return mergeHuskyCheckpoints(rows, HUSKY_HYDRAULIC_CHECKPOINT_DEFINITIONS);
  }
}
