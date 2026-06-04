import { CommonModule } from '@angular/common';

import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';

import { AlertService } from '../../../../../services/alert.service';
import {
  MachineSearchOption,
  resolveMachineIdentity,
  SAP_MACHINE_MASTER,
} from '../../plant-maintenance-machine.model';
import { SubComponentDefinitionService } from '../../sub-component-definition/sub-component-definition.service';
import {
  MaintenanceActivityComponent,
  MaintenanceActivityDefinitionService,
  MaintenanceActivityInspectionLine,
  MaintenanceActivityMachineRecord,
} from '../maintenance-activity-definition.service';



type InspectionLineField = keyof MaintenanceActivityInspectionLine;



function createEmptyInspectionLine(): MaintenanceActivityInspectionLine {

  return {

    itemsToBeInspected: '',

    whatToCheck: '',

    instructions: '',

  };

}



function createEmptyComponent(): MaintenanceActivityComponent {

  return {

    name: '',

    inspectionLines: [createEmptyInspectionLine()],

  };

}



@Component({

  selector: 'app-add-maintenance-activity-definition',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './add-maintenance-activity-definition.html',

  styleUrls: [
    '../../../../HR-Portal/payroll-master/tax-computation/tax-computation.css',
    '../../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../../plant-maintenance-setup-form.css',
  ],

})

export class AddMaintenanceActivityDefinitionComponent implements OnInit {
  private readonly activityService = inject(MaintenanceActivityDefinitionService);

  private readonly subComponentService = inject(SubComponentDefinitionService);

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

  readonly components = signal<MaintenanceActivityComponent[]>([]);

  readonly idSuggestionsOpen = signal(false);

  readonly nameSuggestionsOpen = signal(false);

  private readonly isSaving = signal(false);



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

    const record = this.activityService.getById(id);

    if (!record) {

      this.alertService.validation('Machine record not found.');

      void this.router.navigate(['/plant-maintenance/setup-form/maintenance-activity-definition']);

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

    void this.router.navigate(['/plant-maintenance/setup-form/maintenance-activity-definition']);

  }



  onMachineIdInput(value: string): void {

    this.machineId.set(value);

    this.idSuggestionsOpen.set(value.trim().length > 0);

    this.closeNameSuggestions();

  }



  onMachineNameInput(value: string): void {

    this.machineName.set(value);

    this.nameSuggestionsOpen.set(value.trim().length > 0);

    this.closeIdSuggestions();

  }



  onMachineTypeInput(value: string): void {

    this.machineType.set(value);

  }



  onMaintenanceNatureInput(value: string): void {

    this.maintenanceNature.set(value);

  }



  onPlantMaintenanceFrequencyInput(value: string): void {

    this.plantMaintenanceFrequency.set(value);

  }



  onPlantMaintenanceTypeInput(value: string): void {

    this.plantMaintenanceType.set(value);

  }



  updateComponentName(componentIndex: number, value: string): void {

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

    this.components.update((list) => [...list, createEmptyComponent()]);

  }



  removeComponent(componentIndex: number): void {

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

    if (this.isCreateMode() && this.isMachineAlreadyDefined(machine.machineId, machine.machineName)) {

      this.alertService.validation(this.duplicateMachineMessage);

      return;

    }

    this.populateFromMachine(machine);

  }



  resetForm(): void {

    if (this.editingRecordId()) {

      const record = this.activityService.getById(this.editingRecordId()!);

      if (record) {

        this.machineId.set(record.machineId);

        this.machineName.set(record.machineName);

        this.machineType.set(record.machineType);

        this.maintenanceNature.set(record.maintenanceNature);

        this.plantMaintenanceFrequency.set(record.plantMaintenanceFrequency);

        this.plantMaintenanceType.set(record.plantMaintenanceType);

        this.components.set(this.cloneComponents(record));

      }

      return;

    }

    this.machineId.set('');

    this.machineName.set('');

    this.machineType.set('');

    this.maintenanceNature.set('');

    this.plantMaintenanceFrequency.set('');

    this.plantMaintenanceType.set('');

    this.components.set([]);

    this.closeIdSuggestions();

    this.closeNameSuggestions();

  }



  async saveForm(): Promise<void> {

    if (this.isSaving()) {

      return;

    }

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

        ? 'No components found for this machine. Define them in Sub Component Definition first.'

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



    const duplicateComponentNames = this.findDuplicateComponentNames(components);

    if (duplicateComponentNames.length > 0) {

      this.alertService.validation(

        `Duplicate component name(s): ${duplicateComponentNames.join(', ')}. Each component must be unique for this machine.`,

      );

      return;

    }



    const resolved = resolveMachineIdentity(machineId, machineName);

    const excludeId = this.editingRecordId() ?? undefined;

    if (this.activityService.hasDuplicateMachine(resolved.machineId, resolved.machineName, excludeId)) {

      this.alertService.validation(this.duplicateMachineMessage);

      return;

    }



    const payload = {

      machineId: resolved.machineId,

      machineName: resolved.machineName,

      machineType,

      maintenanceNature,

      plantMaintenanceFrequency,

      plantMaintenanceType,

      components,

    };



    this.isSaving.set(true);

    try {

      if (this.editingRecordId()) {

        const updated = this.activityService.updateRecord(this.editingRecordId()!, payload);

        if (!updated) {

          this.alertService.validation(this.duplicateMachineMessage);

          return;

        }

      } else {

        const added = this.activityService.addRecord(payload);

        if (!added) {

          this.alertService.validation(this.duplicateMachineMessage);

          return;

        }

      }

      const successMessage = this.editingRecordId()

        ? 'Maintenance Activity Defination updated successfully.'

        : 'Maintenance Activity Defination saved successfully.';

      await this.alertService.successAndWait('Success', successMessage);

      void this.router.navigate(['/plant-maintenance/setup-form/maintenance-activity-definition']);

    } finally {

      this.isSaving.set(false);

    }

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

      .filter((m) => !this.isMachineAlreadyDefined(m.machineId, m.machineName))

      .slice(0, 10);

  }



  private readonly duplicateMachineMessage =

    'This machine is already in Maintenance Activity Defination. Each machine can only be added once.';



  private isMachineAlreadyDefined(machineId: string, machineName: string): boolean {

    if (!this.isCreateMode()) {

      return false;

    }

    const resolved = resolveMachineIdentity(machineId, machineName);

    return this.activityService.hasDuplicateMachine(resolved.machineId, resolved.machineName);

  }



  private findDuplicateComponentNames(

    components: Array<{ name: string }>,

  ): string[] {

    const seen = new Set<string>();

    const duplicates = new Set<string>();

    for (const component of components) {

      const key = component.name.toLowerCase();

      if (seen.has(key)) {

        duplicates.add(component.name);

      } else {

        seen.add(key);

      }

    }

    return [...duplicates];

  }



  private populateFromMachine(machine: MachineSearchOption): void {

    this.machineId.set(machine.machineId);

    this.machineName.set(machine.machineName);

    this.machineType.set(machine.defaultMachineType);

    this.applyComponentsFromSubComponentDefinition(machine.machineId);

  }



  private applyComponentsFromSubComponentDefinition(machineId: string): void {

    if (this.editingRecordId()) {

      return;

    }



    const subComponentRecord = this.subComponentService.getByMachineId(machineId);

    const definedComponents = this.uniqueComponentNames(

      subComponentRecord?.subComponents.map((s) => s.trim()).filter(Boolean) ?? [],

    );



    if (definedComponents.length > 0) {

      this.components.set(

        definedComponents.map((name) => ({

          name,

          inspectionLines: [createEmptyInspectionLine()],

        })),

      );

      return;

    }



    this.components.set([]);

  }



  private uniqueComponentNames(names: string[]): string[] {

    const seen = new Set<string>();

    const unique: string[] = [];

    for (const name of names) {

      const key = name.toLowerCase();

      if (seen.has(key)) {

        continue;

      }

      seen.add(key);

      unique.push(name);

    }

    return unique;

  }



  private cloneComponents(record: MaintenanceActivityMachineRecord): MaintenanceActivityComponent[] {

    if (record.components?.length) {

      return record.components.map((component) => this.normalizeComponent(component));

    }



    return [createEmptyComponent()];

  }



  private normalizeComponent(

    component: MaintenanceActivityComponent & {

      itemsToBeInspected?: string;

      whatToCheck?: string;

      instructions?: string;

      subComponents?: string[];

    },

  ): MaintenanceActivityComponent {

    if (component.inspectionLines?.length) {

      return {

        name: component.name ?? '',

        inspectionLines: component.inspectionLines.map((line) => ({

          itemsToBeInspected: line.itemsToBeInspected ?? '',

          whatToCheck: line.whatToCheck ?? '',

          instructions: line.instructions ?? '',

        })),

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

          {

            itemsToBeInspected: component.itemsToBeInspected ?? '',

            whatToCheck: component.whatToCheck ?? '',

            instructions: component.instructions ?? '',

          },

        ],

      };

    }



    return {

      name: component.name ?? '',

      inspectionLines: [createEmptyInspectionLine()],

    };

  }

}


