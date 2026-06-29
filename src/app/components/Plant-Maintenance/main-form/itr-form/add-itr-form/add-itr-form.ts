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
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import { ApplicationFormService } from '../../../../../services/application-form.service';
import { AuthService } from '../../../../../services/auth.service';
import { toMachineSearchOptions } from '../../../setup-form/plant-maintenance-machine.model';
import { SubComponentDefinitionService } from '../../../setup-form/sub-component-definition/sub-component-definition.service';
import {
  calculateItrCycleTimeDeviation,
  calculateItrKpiPercentage,
  createEmptyItrCycleTimeComparison,
  createEmptyItrKpiRows,
  createEmptyItrHydraulicCheckpoints,
  createEmptyItrLevelParallelism,
  createEmptyItrMeasurements,
  createEmptyItrMechanicalCheckpoints,
  createEmptyItrRobotCheckpoints,
  createEmptyItrSafetyCheckpoints,
  ITR_HYDRAULIC_CHECKPOINT_DEFINITIONS,
  ITR_MECHANICAL_CHECKPOINT_DEFINITIONS,
  ITR_ROBOT_CHECKPOINT_DEFINITIONS,
  ITR_SAFETY_CHECKPOINT_DEFINITIONS,
  ItrCheckpointEvaluation,
  ItrCycleTimeComparisonData,
  ItrFormRecord,
  ItrFormService,
  ItrInspectorUser,
  ItrHydraulicCheckpoint,
  ItrKpiRow,
  ItrKpiStatus,
  ItrLevelParallelismData,
  ItrLevelPointRow,
  ItrLevelStatus,
  ItrMeasurementsData,
  ItrMechanicalCheckpoint,
  ItrRobotCheckpoint,
  ItrSafetyCheckpoint,
  mergeItrCheckpoints,
  mergeItrCycleTimeComparison,
  mergeItrLevelParallelism,
  mergeItrMeasurements,
  resolveItrKpiStatus,
} from '../itr-form.service';

export interface ItrSectionNavItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-add-itr-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-itr-form.html',
  styleUrls: [
    '../../../../HR-Portal/payroll-master/tax-computation/tax-computation.css',
    '../../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../../../setup-form/plant-maintenance-setup-form.css',
    './add-itr-form.css',
  ],
})
export class AddItrFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly itrService = inject(ItrFormService);
  private readonly subComponentService = inject(SubComponentDefinitionService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly applicationFormService = inject(ApplicationFormService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editingRecordId = signal<string | null>(null);
  readonly isCreateMode = computed(() => !this.editingRecordId());
  readonly pageTitle = computed(() =>
    this.editingRecordId() ? 'Update ITR Form' : 'Add ITR Form',
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
  readonly kpiRows = signal<ItrKpiRow[]>(createEmptyItrKpiRows());
  readonly safetyCheckpoints = signal<ItrSafetyCheckpoint[]>(createEmptyItrSafetyCheckpoints());
  readonly hydraulicCheckpoints = signal<ItrHydraulicCheckpoint[]>(
    createEmptyItrHydraulicCheckpoints(),
  );
  readonly mechanicalCheckpoints = signal<ItrMechanicalCheckpoint[]>(
    createEmptyItrMechanicalCheckpoints(),
  );
  readonly robotCheckpoints = signal<ItrRobotCheckpoint[]>(createEmptyItrRobotCheckpoints());
  readonly measurements = signal<ItrMeasurementsData>(createEmptyItrMeasurements());
  readonly levelParallelism = signal<ItrLevelParallelismData>(createEmptyItrLevelParallelism());
  readonly cycleTimeComparison = signal<ItrCycleTimeComparisonData>(
    createEmptyItrCycleTimeComparison(),
  );
  readonly recommendations = signal('');
  readonly performedBy = signal('');
  readonly performedByEmployeeId = signal('');
  readonly isSaving = signal(false);

  readonly evaluationOptions = ['Pass', 'Fail', 'N/A'] as const;
  readonly levelStatusOptions = ['Pass', 'Fail'] as const;
  readonly inspectorUsers = signal<ItrInspectorUser[]>([]);

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

  readonly sectionNavItems: ItrSectionNavItem[] = [
    { id: 'husky-kpi-section', label: 'Key Performance Indicators (KPI)' },
    { id: 'husky-safety-section', label: 'Safety' },
    { id: 'husky-hydraulic-section', label: 'Hydraulic and Hydraulic Manifolds' },
    {
      id: 'husky-mechanical-section',
      label: 'Mechanical / Pneumatic / Water / Electrical / Software',
    },
    { id: 'husky-measurements-section', label: 'Calibration Measurements' },
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
    this.subComponentService.fetchMachines().subscribe({ error: () => {} });
    this.applicationFormService.fetchEmployeeProfiles().subscribe({
      next: (profiles) => {
        this.inspectorUsers.set(
          profiles
            .filter((profile) => profile.EmployeeName?.trim())
            .map((profile) => ({
              userId: profile.apiId ?? String(profile.EmployeeCode),
              displayName: profile.EmployeeName.trim(),
            })),
        );
      },
      error: () => {},
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.setPerformedByFromLogin();
      return;
    }

    this.editingRecordId.set(id);

    const cached = this.itrService.getById(id);
    if (cached) {
      this.populateFromRecord(cached);
      return;
    }

    this.itrService.fetchItrFormDetail(id).subscribe({
      next: (record) => this.populateFromRecord(record),
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load ITR Form for edit.'),
        );
        void this.router.navigate(['/plant-maintenance/main-form/itr-form']);
      },
    });
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
        const navElement = scrollRoot.querySelector<HTMLElement>('.husky-section-nav');
        const navHeight = navElement?.offsetHeight ?? 0;
        const top =
          element.getBoundingClientRect().top -
          scrollRoot.getBoundingClientRect().top +
          scrollRoot.scrollTop;
        scrollRoot.scrollTo({
          top: Math.max(0, top - navHeight - 8),
          behavior: 'smooth',
        });
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
    void this.router.navigate(['/plant-maintenance/main-form/itr-form']);
  }

  onMachineIdChange(value: string): void {
    this.machineId.set(value);
    const machine = this.machineOptions.find((m) => m.machineId === value);
    this.machineName.set(machine?.machineName ?? '');
  }

  get machineOptions() {
    return toMachineSearchOptions(this.subComponentService.records());
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

  getKpiPercentage(row: ItrKpiRow): number | null {
    return calculateItrKpiPercentage(row.issuesScore, row.maxPossibleScore);
  }

  getKpiStatus(row: ItrKpiRow): ItrKpiStatus {
    return resolveItrKpiStatus(this.getKpiPercentage(row));
  }

  getKpiStatusLabel(status: ItrKpiStatus): string {
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

  getKpiStatusClass(status: ItrKpiStatus): string {
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

  getEvaluationSelectClass(evaluation: ItrCheckpointEvaluation): string {
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
      evaluation: value as ItrCheckpointEvaluation,
    });
  }

  updateSafetyRecommendation(key: string, value: string): void {
    this.updateSafetyCheckpoint(key, { recommendation: value });
  }

  updateHydraulicEvaluation(key: string, value: string): void {
    this.updateHydraulicCheckpoint(key, {
      evaluation: value as ItrCheckpointEvaluation,
    });
  }

  updateHydraulicRecommendation(key: string, value: string): void {
    this.updateHydraulicCheckpoint(key, { recommendation: value });
  }

  updateMechanicalEvaluation(key: string, value: string): void {
    this.updateMechanicalCheckpoint(key, {
      evaluation: value as ItrCheckpointEvaluation,
    });
  }

  updateMechanicalRecommendation(key: string, value: string): void {
    this.updateMechanicalCheckpoint(key, { recommendation: value });
  }

  updateRobotEvaluation(key: string, value: string): void {
    this.updateRobotCheckpoint(key, {
      evaluation: value as ItrCheckpointEvaluation,
    });
  }

  updateRobotRecommendation(key: string, value: string): void {
    this.updateRobotCheckpoint(key, { recommendation: value });
  }

  updateAccumulatorActual(key: string, value: string): void {
    this.updateRequiredActualRow('accumulatorNitrogen', key, value);
  }

  updatePumpPressureActual(key: string, value: string): void {
    this.updateRequiredActualRow('pumpPressure', key, value);
  }

  updateExtruderSpeedActual(key: string, value: string): void {
    this.updateExtruderSpeedRow(key, { actualValue: value });
  }

  updateExtruderSpeedPressure(key: string, value: string): void {
    this.updateExtruderSpeedRow(key, { pressureValue: value });
  }

  updateTonnageActualLoss(key: string, value: string): void {
    this.measurements.update((data) => ({
      ...data,
      tonnageTest: data.tonnageTest.map((row) =>
        row.key === key ? { ...row, actualLossTons: value } : row,
      ),
    }));
  }

  updateLevelOpsValue(
    group: 'levelPoints' | 'columnGuideBushing' | 'injectionLevel',
    key: string,
    value: string,
  ): void {
    this.updateLevelPointRow(group, key, { opsValue: value });
  }

  updateLevelNopsValue(
    group: 'levelPoints' | 'columnGuideBushing' | 'injectionLevel',
    key: string,
    value: string,
  ): void {
    this.updateLevelPointRow(group, key, { nopsValue: value });
  }

  updateRobotLevelMeasured(key: string, value: string): void {
    this.updateRobotLevelRow(key, { measuredValue: value });
  }

  updateRobotLevelStatus(key: string, value: string): void {
    this.updateRobotLevelRow(key, { status: value as ItrLevelStatus });
  }

  getCycleTimeDeviation(standardSeconds: number, actualValue: string): string {
    return calculateItrCycleTimeDeviation(standardSeconds, actualValue) ?? '—';
  }

  updateDryCycleActual(key: string, value: string): void {
    this.updateCycleTimeRow('nonProcessTimeDryCycle', key, value);
  }

  updateProcessTimeActual(key: string, value: string): void {
    this.updateCycleTimeRow('processTime', key, value);
  }

  updateProductionDataValue(key: string, value: string): void {
    this.cycleTimeComparison.update((data) => ({
      ...data,
      productionData: data.productionData.map((row) =>
        row.key === key ? { ...row, value } : row,
      ),
    }));
  }

  getLevelStatusSelectClass(status: ItrLevelStatus): string {
    switch (status) {
      case 'Pass':
        return 'mad-select--status-pass';
      case 'Fail':
        return 'mad-select--status-fail';
      default:
        return 'mad-select--status-empty';
    }
  }

  async save(): Promise<void> {
    if (this.isSaving()) {
      return;
    }

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

    const recommendations = this.recommendations().trim();
    if (!recommendations) {
      this.alertService.validation(
        'Please enter Recommendations before submitting the ITR Form.',
      );
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
      submitDate: this.submitDate().trim(),
      documentNo: this.documentNo().trim(),
      status: this.status().trim() || 'Draft',
      kpiRows: this.cloneKpiRows(this.kpiRows()),
      safetyCheckpoints: this.cloneSafetyCheckpoints(this.safetyCheckpoints()),
      hydraulicCheckpoints: this.cloneHydraulicCheckpoints(this.hydraulicCheckpoints()),
      mechanicalCheckpoints: this.cloneMechanicalCheckpoints(this.mechanicalCheckpoints()),
      robotCheckpoints: this.cloneRobotCheckpoints(this.robotCheckpoints()),
      measurements: mergeItrMeasurements(this.measurements()),
      levelParallelism: mergeItrLevelParallelism(this.levelParallelism()),
    };

    const editingId = this.editingRecordId();

    this.isSaving.set(true);

    try {
      if (editingId) {
        await firstValueFrom(this.itrService.updateItrForm(editingId, payload));
        await this.alertService.successAndWait('Success', 'ITR Form updated successfully.');
      } else {
        await firstValueFrom(this.itrService.addItrForm(payload));
        await this.alertService.successAndWait('Success', 'ITR Form submitted successfully.');
      }

      void this.router.navigate(['/plant-maintenance/main-form/itr-form']);
    } catch (error) {
      void this.alertService.error(
        editingId ? 'Update Failed' : 'Save Failed',
        formatApiErrorMessage(
          error,
          editingId ? 'Failed to update ITR Form.' : 'Failed to submit ITR Form.',
        ),
      );
    } finally {
      this.isSaving.set(false);
    }
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

  private updateKpiRow(key: string, patch: Partial<Pick<ItrKpiRow, 'issuesScore' | 'maxPossibleScore' | 'notes'>>): void {
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

  private populateFromRecord(record: ItrFormRecord): void {
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
    this.mechanicalCheckpoints.set(
      this.cloneMechanicalCheckpoints(record.mechanicalCheckpoints),
    );
    this.robotCheckpoints.set(this.cloneRobotCheckpoints(record.robotCheckpoints));
    this.measurements.set(mergeItrMeasurements(record.measurements));
    this.levelParallelism.set(mergeItrLevelParallelism(record.levelParallelism));
    this.cycleTimeComparison.set(mergeItrCycleTimeComparison(record.cycleTimeComparison));
    this.recommendations.set(record.recommendations ?? '');
    this.performedBy.set(record.performedBy || this.resolvePerformedByLabel());
    this.performedByEmployeeId.set(
      record.performedByEmployeeId || this.resolvePerformedByEmployeeId(),
    );
  }

  private cloneKpiRows(rows: ItrKpiRow[] | undefined): ItrKpiRow[] {
    const source = rows?.length ? rows : createEmptyItrKpiRows();
    return source.map((row) => ({ ...row }));
  }

  private updateSafetyCheckpoint(
    key: string,
    patch: Partial<Pick<ItrSafetyCheckpoint, 'evaluation' | 'recommendation'>>,
  ): void {
    this.safetyCheckpoints.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  private cloneSafetyCheckpoints(
    rows: ItrSafetyCheckpoint[] | undefined,
  ): ItrSafetyCheckpoint[] {
    return mergeItrCheckpoints(rows, ITR_SAFETY_CHECKPOINT_DEFINITIONS);
  }

  private updateHydraulicCheckpoint(
    key: string,
    patch: Partial<Pick<ItrHydraulicCheckpoint, 'evaluation' | 'recommendation'>>,
  ): void {
    this.hydraulicCheckpoints.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  private cloneHydraulicCheckpoints(
    rows: ItrHydraulicCheckpoint[] | undefined,
  ): ItrHydraulicCheckpoint[] {
    return mergeItrCheckpoints(rows, ITR_HYDRAULIC_CHECKPOINT_DEFINITIONS);
  }

  private updateMechanicalCheckpoint(
    key: string,
    patch: Partial<Pick<ItrMechanicalCheckpoint, 'evaluation' | 'recommendation'>>,
  ): void {
    this.mechanicalCheckpoints.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  private cloneMechanicalCheckpoints(
    rows: ItrMechanicalCheckpoint[] | undefined,
  ): ItrMechanicalCheckpoint[] {
    return mergeItrCheckpoints(rows, ITR_MECHANICAL_CHECKPOINT_DEFINITIONS);
  }

  private updateRobotCheckpoint(
    key: string,
    patch: Partial<Pick<ItrRobotCheckpoint, 'evaluation' | 'recommendation'>>,
  ): void {
    this.robotCheckpoints.update((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  private cloneRobotCheckpoints(
    rows: ItrRobotCheckpoint[] | undefined,
  ): ItrRobotCheckpoint[] {
    return mergeItrCheckpoints(rows, ITR_ROBOT_CHECKPOINT_DEFINITIONS);
  }

  private updateRequiredActualRow(
    group: 'accumulatorNitrogen' | 'pumpPressure',
    key: string,
    actualValue: string,
  ): void {
    this.measurements.update((data) => ({
      ...data,
      [group]: data[group].map((row) =>
        row.key === key ? { ...row, actualValue } : row,
      ),
    }));
  }

  private updateExtruderSpeedRow(
    key: string,
    patch: Partial<{ actualValue: string; pressureValue: string }>,
  ): void {
    this.measurements.update((data) => ({
      ...data,
      extruderSpeedControl: data.extruderSpeedControl.map((row) =>
        row.key === key ? { ...row, ...patch } : row,
      ),
    }));
  }

  private updateLevelPointRow(
    group: 'levelPoints' | 'columnGuideBushing' | 'injectionLevel',
    key: string,
    patch: Partial<Pick<ItrLevelPointRow, 'opsValue' | 'nopsValue'>>,
  ): void {
    this.levelParallelism.update((data) => ({
      ...data,
      [group]: data[group].map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));
  }

  private updateRobotLevelRow(
    key: string,
    patch: Partial<{ measuredValue: string; status: ItrLevelStatus }>,
  ): void {
    this.levelParallelism.update((data) => ({
      ...data,
      robotLevel: data.robotLevel.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));
  }

  private updateCycleTimeRow(
    group: 'nonProcessTimeDryCycle' | 'processTime',
    key: string,
    actualValue: string,
  ): void {
    this.cycleTimeComparison.update((data) => ({
      ...data,
      [group]: data[group].map((row) => (row.key === key ? { ...row, actualValue } : row)),
    }));
  }

  private setPerformedByFromLogin(): void {
    this.performedBy.set(this.resolvePerformedByLabel());
    this.performedByEmployeeId.set(this.resolvePerformedByEmployeeId());
  }

  private resolvePerformedByLabel(): string {
    const employeeRecord = this.applicationFormService.getSignedInUserRecord(
      this.authService.getSessionUserId(),
    );
    if (employeeRecord) {
      const name = employeeRecord.EmployeeName?.trim() ?? '';
      const employeeId = employeeRecord.EmployeeCode
        ? String(employeeRecord.EmployeeCode)
        : '';
      if (name && employeeId) {
        return `${name} / ${employeeId}`;
      }
      return name || employeeId || '—';
    }

    const sessionUser = this.authService.getSessionUser();
    if (sessionUser?.name?.trim()) {
      const idPart = sessionUser.id ? String(sessionUser.id) : '';
      return idPart
        ? `${sessionUser.name.trim()} / ${idPart}`
        : sessionUser.name.trim();
    }

    const sessionUserId = this.authService.getSessionUserId()?.trim();
    return sessionUserId || '—';
  }

  private resolvePerformedByEmployeeId(): string {
    const employeeRecord = this.applicationFormService.getSignedInUserRecord(
      this.authService.getSessionUserId(),
    );
    if (employeeRecord?.EmployeeCode) {
      return String(employeeRecord.EmployeeCode);
    }

    const sessionUser = this.authService.getSessionUser();
    return sessionUser?.id ? String(sessionUser.id) : '';
  }
}