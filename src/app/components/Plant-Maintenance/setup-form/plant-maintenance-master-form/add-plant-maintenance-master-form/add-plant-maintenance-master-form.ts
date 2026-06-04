import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../../services/alert.service';
import { MachineSearchOption, SAP_MACHINE_MASTER } from '../../plant-maintenance-machine.model';
import {
  MaintenanceActivityDefinitionService,
  MaintenanceActivityMachineRecord,
} from '../../maintenance-activity-definition/maintenance-activity-definition.service';
import {
  PlantMaintenanceMasterComponent,
  PlantMaintenanceMasterFormService,
  PlantMaintenanceMasterInspectionLine,
  PlantMaintenanceMasterRecord,
} from '../plant-maintenance-master-form.service';

type InspectionLineField = keyof PlantMaintenanceMasterInspectionLine;

function createEmptyInspectionLine(): PlantMaintenanceMasterInspectionLine {
  return {
    itemsToBeInspected: '',
    whatToCheck: '',
    instructions: '',
    status: '',
  };
}

function createEmptyComponent(): PlantMaintenanceMasterComponent {
  return {
    name: '',
    inspectionLines: [createEmptyInspectionLine()],
  };
}

@Component({
  selector: 'app-add-plant-maintenance-master-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-plant-maintenance-master-form.html',
  styleUrls: [
    '../../../../HR-Portal/payroll-master/tax-computation/tax-computation.css',
    '../../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../../plant-maintenance-setup-form.css',
  ],
})
export class AddPlantMaintenanceMasterFormComponent implements OnInit {
  private readonly masterService = inject(PlantMaintenanceMasterFormService);
  private readonly activityService = inject(MaintenanceActivityDefinitionService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editingRecordId = signal<string | null>(null);
  readonly isCreateMode = computed(() => !this.editingRecordId());
  readonly pageTitle = computed(() =>
    this.editingRecordId() ? 'Update Machine' : 'Add Machine',
  );

  readonly machineId = signal('');
  readonly machineName = signal('');
  readonly machineType = signal('');
  readonly maintenanceNature = signal('');
  readonly plantMaintenanceFrequency = signal('');
  readonly plantMaintenanceType = signal('');
  readonly components = signal<PlantMaintenanceMasterComponent[]>([]);
  readonly availableActivityRecords = signal<MaintenanceActivityMachineRecord[]>([]);
  readonly populatedFromActivityDefinition = signal(false);
  readonly isPopulatedFieldsReadOnly = computed(() => this.populatedFromActivityDefinition());
  readonly hasActivityDefinitionsForMachine = computed(
    () => this.availableActivityRecords().length > 0,
  );
  readonly idSuggestionsOpen = signal(false);
  readonly nameSuggestionsOpen = signal(false);

  readonly machineTypeOptions = computed(() =>
    this.activityService.getProfileFieldValues(this.availableActivityRecords(), 'machineType', {
      maintenanceNature: this.maintenanceNature(),
      plantMaintenanceFrequency: this.plantMaintenanceFrequency(),
      plantMaintenanceType: this.plantMaintenanceType(),
    }),
  );

  readonly maintenanceNatureSelectOptions = computed(() =>
    this.getProfileSelectOptions('maintenanceNature', this.maintenanceNatureOptions),
  );

  readonly plantMaintenanceFrequencySelectOptions = computed(() =>
    this.getProfileSelectOptions('plantMaintenanceFrequency', this.plantMaintenanceFrequencyOptions),
  );

  readonly plantMaintenanceTypeSelectOptions = computed(() =>
    this.getProfileSelectOptions('plantMaintenanceType', this.plantMaintenanceTypeOptions),
  );

  readonly maintenanceNatureOptions = ['Electrical', 'Mechanical'] as const;
  readonly plantMaintenanceFrequencyOptions = [
    'Daily',
    'Weekly',
    'ForthNight',
    'Monthly',
    'Quatterly',
    'Semi-annually',
  ] as const;
  readonly plantMaintenanceTypeOptions = [
    'Preventive',
    'Corrective',
    'Breakdown',
    'Pre-Cautionary',
  ] as const;
  readonly lineStatusOptions = ['Pass', 'Fail', 'N/A'] as const;

  readonly idSuggestions = computed(() => this.filterMachineSuggestions(this.machineId()));
  readonly nameSuggestions = computed(() => this.filterMachineSuggestions(this.machineName()));

  private get machineOptions(): MachineSearchOption[] {
    return SAP_MACHINE_MASTER;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    const record = this.masterService.getById(id);
    if (!record) {
      this.alertService.validation('Machine record not found.');
      void this.router.navigate(['/plant-maintenance/setup-form/plant-maintenance-master-form']);
      return;
    }
    this.editingRecordId.set(id);
    this.machineId.set(record.machineId);
    this.machineName.set(record.machineName);
    this.machineType.set(record.machineType);
    this.maintenanceNature.set(record.maintenanceNature);
    this.plantMaintenanceFrequency.set(record.plantMaintenanceFrequency);
    this.plantMaintenanceType.set(record.plantMaintenanceType);
    this.components.set(this.cloneComponents(record));
  }

  hasLoadedComponents(): boolean {
    return this.components().some((c) => c.name.trim());
  }

  back(): void {
    void this.router.navigate(['/plant-maintenance/setup-form/plant-maintenance-master-form']);
  }

  onMachineIdInput(value: string): void {
    if (this.machineId() !== value) {
      this.clearActivityProfileFields();
    }
    this.machineId.set(value);
    this.idSuggestionsOpen.set(value.trim().length > 0);
    this.closeNameSuggestions();
  }

  onMachineNameInput(value: string): void {
    if (this.machineName() !== value) {
      this.clearActivityProfileFields();
    }
    this.machineName.set(value);
    this.nameSuggestionsOpen.set(value.trim().length > 0);
    this.closeIdSuggestions();
  }

  onMachineTypeInput(value: string): void {
    this.machineType.set(value);
    this.tryApplyMatchingActivityDefinition();
  }

  onMaintenanceNatureInput(value: string): void {
    this.maintenanceNature.set(value);
    this.tryApplyMatchingActivityDefinition();
  }

  onPlantMaintenanceFrequencyInput(value: string): void {
    this.plantMaintenanceFrequency.set(value);
    this.tryApplyMatchingActivityDefinition();
  }

  onPlantMaintenanceTypeInput(value: string): void {
    this.plantMaintenanceType.set(value);
    this.tryApplyMatchingActivityDefinition();
  }

  updateComponentName(componentIndex: number, value: string): void {
    if (this.isPopulatedFieldsReadOnly()) {
      return;
    }
    this.components.update((list) => {
      const next = [...list];
      next[componentIndex] = { ...next[componentIndex], name: value };
      return next;
    });
  }

  updateInspectionLine(
    componentIndex: number,
    lineIndex: number,
    field: InspectionLineField,
    value: string,
  ): void {
    if (field !== 'status' && this.isPopulatedFieldsReadOnly()) {
      return;
    }
    this.components.update((list) =>
      list.map((component, ci) => {
        if (ci !== componentIndex) {
          return component;
        }
        const inspectionLines = component.inspectionLines.map((line, li) =>
          li === lineIndex ? { ...line, [field]: value } : line,
        );
        return { ...component, inspectionLines };
      }),
    );
  }

  addInspectionLine(componentIndex: number): void {
    if (this.isPopulatedFieldsReadOnly()) {
      return;
    }
    this.components.update((list) =>
      list.map((component, i) =>
        i === componentIndex
          ? {
              ...component,
              inspectionLines: [...component.inspectionLines, createEmptyInspectionLine()],
            }
          : component,
      ),
    );
  }

  removeInspectionLine(componentIndex: number, lineIndex: number): void {
    if (this.isPopulatedFieldsReadOnly()) {
      return;
    }
    this.components.update((list) =>
      list.map((component, i) => {
        if (i !== componentIndex) {
          return component;
        }
        const inspectionLines =
          component.inspectionLines.length > 1
            ? component.inspectionLines.filter((_, li) => li !== lineIndex)
            : [createEmptyInspectionLine()];
        return { ...component, inspectionLines };
      }),
    );
  }

  addComponent(): void {
    if (this.isPopulatedFieldsReadOnly()) {
      return;
    }
    this.components.update((list) => [...list, createEmptyComponent()]);
  }

  removeComponent(componentIndex: number): void {
    if (this.isPopulatedFieldsReadOnly()) {
      return;
    }
    this.components.update((list) =>
      list.length > 1 ? list.filter((_, i) => i !== componentIndex) : [createEmptyComponent()],
    );
  }

  trackByIndex(index: number): number {
    return index;
  }

  openIdSuggestions(): void {
    if (this.machineId().trim()) {
      this.idSuggestionsOpen.set(true);
      this.closeNameSuggestions();
    }
  }

  openNameSuggestions(): void {
    if (this.machineName().trim()) {
      this.nameSuggestionsOpen.set(true);
      this.closeIdSuggestions();
    }
  }

  closeIdSuggestions(): void {
    this.idSuggestionsOpen.set(false);
  }

  closeNameSuggestions(): void {
    this.nameSuggestionsOpen.set(false);
  }

  onIdInputBlur(): void {
    setTimeout(() => this.closeIdSuggestions(), 150);
  }

  onNameInputBlur(): void {
    setTimeout(() => this.closeNameSuggestions(), 150);
  }

  selectMachineFromSuggestion(machine: MachineSearchOption): void {
    this.closeIdSuggestions();
    this.closeNameSuggestions();
    this.populateFromMachine(machine);
  }

  resetForm(): void {
    if (this.editingRecordId()) {
      const record = this.masterService.getById(this.editingRecordId()!);
      if (record) {
        this.machineId.set(record.machineId);
        this.machineName.set(record.machineName);
        this.machineType.set(record.machineType);
        this.maintenanceNature.set(record.maintenanceNature);
        this.plantMaintenanceFrequency.set(record.plantMaintenanceFrequency);
        this.plantMaintenanceType.set(record.plantMaintenanceType);
        this.components.set(this.cloneComponents(record));
        this.populatedFromActivityDefinition.set(false);
      }
      return;
    }
    this.populatedFromActivityDefinition.set(false);
    this.machineId.set('');
    this.machineName.set('');
    this.machineType.set('');
    this.maintenanceNature.set('');
    this.plantMaintenanceFrequency.set('');
    this.plantMaintenanceType.set('');
    this.components.set([]);
    this.availableActivityRecords.set([]);
    this.closeIdSuggestions();
    this.closeNameSuggestions();
  }

  async saveForm(): Promise<void> {
    const machineId = this.machineId().trim();
    const machineName = this.machineName().trim();
    const machineType = this.machineType().trim();
    const maintenanceNature = this.maintenanceNature().trim();
    const plantMaintenanceFrequency = this.plantMaintenanceFrequency().trim();
    const plantMaintenanceType = this.plantMaintenanceType().trim();

    const components = this.components()
      .map((component) => ({
        name: component.name.trim(),
        inspectionLines: component.inspectionLines
          .map((line) => ({
            itemsToBeInspected: line.itemsToBeInspected.trim(),
            whatToCheck: line.whatToCheck.trim(),
            instructions: line.instructions.trim(),
            status: line.status.trim(),
          }))
          .filter(
            (line) => line.itemsToBeInspected || line.whatToCheck || line.instructions,
          ),
      }))
      .filter((component) => component.name);

    if (!machineId || !machineName || !machineType) {
      this.alertService.validation(
        'Machine ID, Machine Name, and Machine Type are required.',
      );
      return;
    }

    if (!maintenanceNature || !plantMaintenanceFrequency || !plantMaintenanceType) {
      this.alertService.validation(
        'Select Maintenance Nature, Plant Maintenance Frequency, and Plant Maintenance Type.',
      );
      return;
    }

    if (components.length === 0) {
      const message = this.isCreateMode()
        ? 'No matching Maintenance Activity Defination found. Select Machine Type, Maintenance Nature, Plant Maintenance Frequency, and Plant Maintenance Type that match an existing activity definition.'
        : 'Enter at least one component for this machine.';
      this.alertService.validation(message);
      return;
    }

    const incompleteInspection = components.some(
      (component) =>
        component.inspectionLines.length === 0 ||
        component.inspectionLines.some(
          (line) => !line.itemsToBeInspected || !line.whatToCheck || !line.instructions,
        ),
    );
    if (incompleteInspection) {
      this.alertService.validation(
        'Each inspection line must have Items to be inspected, What to check, and Instructions.',
      );
      return;
    }

    const missingLineStatus = components.some((component) =>
      component.inspectionLines.some((line) => !line.status),
    );
    if (missingLineStatus) {
      this.alertService.validation('Select Status for each line.');
      return;
    }

    const excludeId = this.editingRecordId() ?? undefined;
    const payload = {
      machineId,
      machineName,
      machineType,
      maintenanceNature,
      plantMaintenanceFrequency,
      plantMaintenanceType,
      remarks: '',
      components,
    };

    if (this.masterService.hasDuplicateProfile(payload, excludeId)) {
      this.alertService.validation(
        'A master form entry with this machine and maintenance profile already exists.',
      );
      return;
    }

    if (this.editingRecordId()) {
      const existing = this.masterService.getById(this.editingRecordId()!);
      this.masterService.updateRecord(this.editingRecordId()!, {
        ...payload,
        remarks: existing?.remarks ?? '',
      });
    } else {
      this.masterService.addRecord(payload);
    }

    const successMessage = this.editingRecordId()
      ? 'Plant Maintenance Master Form updated successfully.'
      : 'Plant Maintenance Master Form saved successfully.';

    await this.alertService.successAndWait('Success', successMessage);

    void this.router.navigate(['/plant-maintenance/setup-form/plant-maintenance-master-form']);
  }

  private filterMachineSuggestions(query: string): MachineSearchOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return this.machineOptions
      .filter(
        (m) =>
          m.machineId.toLowerCase().includes(q) ||
          m.machineName.toLowerCase().includes(q) ||
          m.defaultMachineType.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }

  private populateFromMachine(machine: MachineSearchOption): void {
    this.machineId.set(machine.machineId);
    this.machineName.set(machine.machineName);
    this.loadActivityProfilesForMachine(machine.machineId, machine.machineName);
  }

  private loadActivityProfilesForMachine(machineId: string, machineName: string): void {
    this.clearActivityProfileFields();

    const records = this.activityService.getAllByMachineId(machineId, machineName);
    this.availableActivityRecords.set(records);

    if (records.length === 0) {
      this.machineType.set(this.getSapDefaultMachineType(machineId, machineName));
      return;
    }

    if (records.length === 1) {
      this.applyActivityProfile(records[0]);
      return;
    }

    this.machineType.set(this.getSapDefaultMachineType(machineId, machineName));
  }

  private tryApplyMatchingActivityDefinition(): void {
    if (!this.isCreateMode() || !this.machineId().trim()) {
      return;
    }

    const machineType = this.machineType().trim();
    const maintenanceNature = this.maintenanceNature().trim();
    const plantMaintenanceFrequency = this.plantMaintenanceFrequency().trim();
    const plantMaintenanceType = this.plantMaintenanceType().trim();

    if (!machineType || !maintenanceNature || !plantMaintenanceFrequency || !plantMaintenanceType) {
      this.populatedFromActivityDefinition.set(false);
      this.components.set([]);
      return;
    }

    const activityRecord = this.activityService.findByCriteria({
      machineId: this.machineId(),
      machineName: this.machineName(),
      machineType,
      maintenanceNature,
      plantMaintenanceFrequency,
      plantMaintenanceType,
    });

    if (!activityRecord) {
      this.populatedFromActivityDefinition.set(false);
      this.components.set([]);
      return;
    }

    this.applyActivityProfile(activityRecord);
  }

  private applyActivityProfile(activityRecord: MaintenanceActivityMachineRecord): void {
    this.machineType.set(activityRecord.machineType);
    this.maintenanceNature.set(activityRecord.maintenanceNature);
    this.plantMaintenanceFrequency.set(activityRecord.plantMaintenanceFrequency);
    this.plantMaintenanceType.set(activityRecord.plantMaintenanceType);
    this.populatedFromActivityDefinition.set(true);
    this.components.set(this.cloneComponentsFromActivity(activityRecord));
  }

  private clearActivityProfileFields(): void {
    this.populatedFromActivityDefinition.set(false);
    this.availableActivityRecords.set([]);
    this.machineType.set('');
    this.maintenanceNature.set('');
    this.plantMaintenanceFrequency.set('');
    this.plantMaintenanceType.set('');
    this.components.set([]);
  }

  private getSapDefaultMachineType(machineId: string, machineName: string): string {
    const sap = this.machineOptions.find(
      (m) =>
        m.machineId.toLowerCase() === machineId.trim().toLowerCase() ||
        m.machineName.toLowerCase() === machineName.trim().toLowerCase(),
    );
    return sap?.defaultMachineType ?? '';
  }

  private getProfileSelectOptions<T extends string>(
    field: 'maintenanceNature' | 'plantMaintenanceFrequency' | 'plantMaintenanceType',
    fallback: readonly T[],
  ): T[] {
    if (!this.isCreateMode() || this.availableActivityRecords().length === 0) {
      return [...fallback];
    }

    return this.activityService.getProfileFieldValues(
      this.availableActivityRecords(),
      field,
      {
        machineType: this.machineType(),
        maintenanceNature: field === 'maintenanceNature' ? '' : this.maintenanceNature(),
        plantMaintenanceFrequency:
          field === 'plantMaintenanceFrequency' ? '' : this.plantMaintenanceFrequency(),
        plantMaintenanceType: field === 'plantMaintenanceType' ? '' : this.plantMaintenanceType(),
      },
    ) as T[];
  }

  private cloneComponentsFromActivity(
    record: MaintenanceActivityMachineRecord,
  ): PlantMaintenanceMasterComponent[] {
    return record.components.map((component) =>
      this.normalizeComponent({
        name: component.name,
        inspectionLines: component.inspectionLines.map((line) =>
          this.normalizeInspectionLine(line),
        ),
      }),
    );
  }

  private cloneComponents(record: PlantMaintenanceMasterRecord): PlantMaintenanceMasterComponent[] {
    if (record.components?.length) {
      return record.components.map((component) => this.normalizeComponent(component));
    }

    return [createEmptyComponent()];
  }

  private normalizeInspectionLine(
    line: Partial<PlantMaintenanceMasterInspectionLine>,
  ): PlantMaintenanceMasterInspectionLine {
    return {
      itemsToBeInspected: line.itemsToBeInspected ?? '',
      whatToCheck: line.whatToCheck ?? '',
      instructions: line.instructions ?? '',
      status: line.status ?? '',
    };
  }

  private normalizeComponent(
    component: PlantMaintenanceMasterComponent & {
      status?: string;
      itemsToBeInspected?: string;
      whatToCheck?: string;
      instructions?: string;
      subComponents?: string[];
    },
  ): PlantMaintenanceMasterComponent {
    if (component.inspectionLines?.length) {
      return {
        name: component.name ?? '',
        inspectionLines: component.inspectionLines.map((line) =>
          this.normalizeInspectionLine(line),
        ),
      };
    }

    if (
      component.itemsToBeInspected !== undefined ||
      component.whatToCheck !== undefined ||
      component.instructions !== undefined
    ) {
      return {
        name: component.name ?? '',
        inspectionLines: [
          this.normalizeInspectionLine({
            itemsToBeInspected: component.itemsToBeInspected,
            whatToCheck: component.whatToCheck,
            instructions: component.instructions,
            status: component.status,
          }),
        ],
      };
    }

    return {
      name: component.name ?? '',
      inspectionLines: [createEmptyInspectionLine()],
    };
  }
}
