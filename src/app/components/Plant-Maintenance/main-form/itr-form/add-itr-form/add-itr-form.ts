import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import { ApplicationFormService } from '../../../../../services/application-form.service';
import { AuthService } from '../../../../../services/auth.service';
import { MachineSearchOption } from '../../../setup-form/plant-maintenance-machine.model';
import {
  extractItrEligibleMachines,
  extractReplacementLineGroupsForMachine,
  PlantMaintenanceMasterFormService,
  PlantMaintenanceMasterRecord,
  PlantMaintenanceMasterReplacementLineGroup,
} from '../../../setup-form/plant-maintenance-master-form/plant-maintenance-master-form.service';
import {
  createEmptyItrCycleTimeComparison,
  createEmptyItrHydraulicCheckpoints,
  createEmptyItrKpiRows,
  createEmptyItrLevelParallelism,
  createEmptyItrMeasurements,
  createEmptyItrMechanicalCheckpoints,
  createEmptyItrRobotCheckpoints,
  createEmptyItrSafetyCheckpoints,
  ITR_HYDRAULIC_CHECKPOINT_DEFINITIONS,
  ITR_MECHANICAL_CHECKPOINT_DEFINITIONS,
  ITR_ROBOT_CHECKPOINT_DEFINITIONS,
  ITR_SAFETY_CHECKPOINT_DEFINITIONS,
  ItrFormRecord,
  ItrFormService,
  ItrInspectorUser,
  ItrHydraulicCheckpoint,
  ItrKpiRow,
  ItrMechanicalCheckpoint,
  ItrReplacementLineGroup,
  ItrRobotCheckpoint,
  ItrSafetyCheckpoint,
  mergeItrCheckpoints,
  mergeItrCycleTimeComparison,
  mergeItrLevelParallelism,
  mergeItrMeasurements,
} from '../itr-form.service';

@Component({
  selector: 'app-add-itr-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-itr-form.html',
  styleUrls: [
    '../../../../HR-Portal/payroll-master/tax-computation/tax-computation.css',
    '../../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../../../setup-form/plant-maintenance-setup-form.css',
    '../../../setup-form/plant-maintenance-master-form/add-plant-maintenance-master-form/plant-maintenance-master-form-add.css',
    './add-itr-form.css',
  ],
})
export class AddItrFormComponent implements OnInit {
  private readonly itrService = inject(ItrFormService);
  private readonly plantMaintenanceMasterFormService = inject(PlantMaintenanceMasterFormService);
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
  readonly isSaving = signal(false);
  readonly inspectorUsers = signal<ItrInspectorUser[]>([]);
  readonly eligibleMachines = signal<MachineSearchOption[]>([]);
  readonly replacementLineGroups = signal<ItrReplacementLineGroup[]>([]);
  readonly machineOptions = computed(() => {
    const machines = [...this.eligibleMachines()];
    const currentId = this.machineId().trim();
    const currentName = this.machineName().trim();

    if (
      currentId &&
      !machines.some((machine) => machine.machineId === currentId)
    ) {
      machines.unshift({
        machineId: currentId,
        machineName: currentName || currentId,
        defaultMachineType: '',
      });
    }

    return machines;
  });

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

  private kpiRows = createEmptyItrKpiRows();
  private safetyCheckpoints = createEmptyItrSafetyCheckpoints();
  private hydraulicCheckpoints = createEmptyItrHydraulicCheckpoints();
  private mechanicalCheckpoints = createEmptyItrMechanicalCheckpoints();
  private robotCheckpoints = createEmptyItrRobotCheckpoints();
  private measurements = createEmptyItrMeasurements();
  private levelParallelism = createEmptyItrLevelParallelism();
  private cycleTimeComparison = createEmptyItrCycleTimeComparison();
  private recommendations = '';
  private performedBy = '';
  private performedByEmployeeId = '';
  private plantMaintenanceMasterRecords = signal<PlantMaintenanceMasterRecord[]>([]);
  private pendingReplacementLineGroups: ItrReplacementLineGroup[] | null = null;

  ngOnInit(): void {
    this.plantMaintenanceMasterFormService.fetchPlantMaintenanceMasterForms().subscribe({
      next: (records) => {
        this.plantMaintenanceMasterRecords.set(records);
        this.eligibleMachines.set(extractItrEligibleMachines(records));
        this.syncReplacementLinesForMachine(this.machineId());
      },
      error: () => {
        this.eligibleMachines.set([]);
      },
    });

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

  back(): void {
    void this.router.navigate(['/plant-maintenance/main-form/itr-form']);
  }

  onMachineIdChange(value: string): void {
    this.machineId.set(value);
    const machine = this.machineOptions().find((m) => m.machineId === value);
    this.machineName.set(machine?.machineName ?? '');
    this.pendingReplacementLineGroups = null;
    this.syncReplacementLinesForMachine(value);
  }

  updateReplacementQuantity(
    groupIndex: number,
    itemIndex: number,
    value: string | number | null,
  ): void {
    this.replacementLineGroups.update((groups) =>
      groups.map((group, gi) => {
        if (gi !== groupIndex) {
          return group;
        }

        return {
          ...group,
          items: group.items.map((item, ii) => {
            if (ii !== itemIndex) {
              return item;
            }

            if (value === null || value === '') {
              return { ...item, quantity: null };
            }

            const quantity =
              typeof value === 'number' ? value : Number.parseFloat(String(value));
            if (!Number.isFinite(quantity) || quantity < 0) {
              return item;
            }

            return { ...item, quantity };
          }),
        };
      }),
    );
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

  trackByIndex(index: number): number {
    return index;
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
    if (
      this.isCreateMode() &&
      !this.eligibleMachines().some((machine) => machine.machineId === machineId)
    ) {
      this.alertService.validation(
        'This machine is not eligible for ITR. Only machines with Replacement = Yes in Plant Maintenance Master Form can be used.',
      );
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

    const invalidReplacementQuantity = this.replacementLineGroups().some((group) =>
      group.items.some(
        (item) =>
          (item.itemCode.trim() || item.itemName.trim()) &&
          (item.quantity === null || item.quantity <= 0),
      ),
    );
    if (invalidReplacementQuantity) {
      this.alertService.validation(
        'Please enter a valid Quantity greater than 0 for each replacement item.',
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
      kpiRows: this.cloneKpiRows(this.kpiRows),
      safetyCheckpoints: this.cloneSafetyCheckpoints(this.safetyCheckpoints),
      hydraulicCheckpoints: this.cloneHydraulicCheckpoints(this.hydraulicCheckpoints),
      mechanicalCheckpoints: this.cloneMechanicalCheckpoints(this.mechanicalCheckpoints),
      robotCheckpoints: this.cloneRobotCheckpoints(this.robotCheckpoints),
      measurements: mergeItrMeasurements(this.measurements),
      levelParallelism: mergeItrLevelParallelism(this.levelParallelism),
      replacementLineGroups: this.cloneReplacementLineGroups(this.replacementLineGroups()),
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
    this.kpiRows = this.cloneKpiRows(record.kpiRows);
    this.safetyCheckpoints = this.cloneSafetyCheckpoints(record.safetyCheckpoints);
    this.hydraulicCheckpoints = this.cloneHydraulicCheckpoints(record.hydraulicCheckpoints);
    this.mechanicalCheckpoints = this.cloneMechanicalCheckpoints(record.mechanicalCheckpoints);
    this.robotCheckpoints = this.cloneRobotCheckpoints(record.robotCheckpoints);
    this.measurements = mergeItrMeasurements(record.measurements);
    this.levelParallelism = mergeItrLevelParallelism(record.levelParallelism);
    this.cycleTimeComparison = mergeItrCycleTimeComparison(record.cycleTimeComparison);
    this.recommendations = record.recommendations ?? '';
    this.performedBy = record.performedBy || this.resolvePerformedByLabel();
    this.performedByEmployeeId =
      record.performedByEmployeeId || this.resolvePerformedByEmployeeId();
    this.pendingReplacementLineGroups = this.cloneReplacementLineGroups(
      record.replacementLineGroups ?? [],
    );
    this.syncReplacementLinesForMachine(record.machineId);
  }

  private syncReplacementLinesForMachine(machineId: string): void {
    const trimmedMachineId = machineId.trim();
    if (!trimmedMachineId) {
      this.replacementLineGroups.set([]);
      return;
    }

    const masterGroups = this.toItrReplacementLineGroups(
      extractReplacementLineGroupsForMachine(
        this.plantMaintenanceMasterRecords(),
        trimmedMachineId,
      ),
    );

    if (
      this.plantMaintenanceMasterRecords().length === 0 &&
      this.pendingReplacementLineGroups
    ) {
      return;
    }

    if (this.pendingReplacementLineGroups?.length) {
      this.replacementLineGroups.set(
        this.mergeReplacementLineGroups(masterGroups, this.pendingReplacementLineGroups),
      );
      this.pendingReplacementLineGroups = null;
      return;
    }

    this.replacementLineGroups.set(masterGroups);
  }

  private toItrReplacementLineGroups(
    groups: PlantMaintenanceMasterReplacementLineGroup[],
  ): ItrReplacementLineGroup[] {
    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item })),
    }));
  }

  private mergeReplacementLineGroups(
    masterGroups: ItrReplacementLineGroup[],
    savedGroups: ItrReplacementLineGroup[],
  ): ItrReplacementLineGroup[] {
    return masterGroups.map((group) => {
      const saved = savedGroups.find(
        (entry) =>
          entry.lineKey === group.lineKey ||
          (entry.componentName === group.componentName &&
            entry.itemsToBeInspected === group.itemsToBeInspected &&
            entry.whatToCheck === group.whatToCheck),
      );
      if (!saved) {
        return group;
      }

      return {
        ...group,
        items: group.items.map((item, index) => {
          const savedItem =
            saved.items.find(
              (entry) =>
                entry.itemCode.trim() &&
                entry.itemCode.trim() === item.itemCode.trim(),
            ) ?? saved.items[index];
          if (!savedItem) {
            return item;
          }
          return {
            ...item,
            quantity: savedItem.quantity ?? item.quantity,
          };
        }),
      };
    });
  }

  private cloneReplacementLineGroups(
    groups: ItrReplacementLineGroup[],
  ): ItrReplacementLineGroup[] {
    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item })),
    }));
  }

  private cloneKpiRows(rows: ItrKpiRow[] | undefined): ItrKpiRow[] {
    const source = rows?.length ? rows : createEmptyItrKpiRows();
    return source.map((row) => ({ ...row }));
  }

  private cloneSafetyCheckpoints(
    rows: ItrSafetyCheckpoint[] | undefined,
  ): ItrSafetyCheckpoint[] {
    return mergeItrCheckpoints(rows, ITR_SAFETY_CHECKPOINT_DEFINITIONS);
  }

  private cloneHydraulicCheckpoints(
    rows: ItrHydraulicCheckpoint[] | undefined,
  ): ItrHydraulicCheckpoint[] {
    return mergeItrCheckpoints(rows, ITR_HYDRAULIC_CHECKPOINT_DEFINITIONS);
  }

  private cloneMechanicalCheckpoints(
    rows: ItrMechanicalCheckpoint[] | undefined,
  ): ItrMechanicalCheckpoint[] {
    return mergeItrCheckpoints(rows, ITR_MECHANICAL_CHECKPOINT_DEFINITIONS);
  }

  private cloneRobotCheckpoints(
    rows: ItrRobotCheckpoint[] | undefined,
  ): ItrRobotCheckpoint[] {
    return mergeItrCheckpoints(rows, ITR_ROBOT_CHECKPOINT_DEFINITIONS);
  }

  private setPerformedByFromLogin(): void {
    this.performedBy = this.resolvePerformedByLabel();
    this.performedByEmployeeId = this.resolvePerformedByEmployeeId();
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
