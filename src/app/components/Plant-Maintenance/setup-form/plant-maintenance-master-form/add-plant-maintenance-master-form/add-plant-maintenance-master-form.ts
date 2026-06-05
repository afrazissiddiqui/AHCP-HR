import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../../services/alert.service';
import {
  MachineSearchOption,
  resolveSparePartIdentity,
  SAP_MACHINE_MASTER,
  SAP_SPARE_PARTS_MASTER,
  SAP_UOM_MASTER,
  SAP_WAREHOUSE_MASTER,
  SparePartSearchOption,
} from '../../plant-maintenance-machine.model';
import {
  MaintenanceActivityDefinitionService,
  MaintenanceActivityMachineRecord,
} from '../../maintenance-activity-definition/maintenance-activity-definition.service';
import {
  PlantMaintenanceMasterComponent,
  PlantMaintenanceMasterFormService,
  PlantMaintenanceMasterInspectionLine,
  PlantMaintenanceMasterRecord,
  PlantMaintenanceMasterSparePartLine,
} from '../plant-maintenance-master-form.service';

type InspectionLineField = keyof PlantMaintenanceMasterInspectionLine;

function createEmptyInspectionLine(): PlantMaintenanceMasterInspectionLine {
  return {
    itemsToBeInspected: '',
    whatToCheck: '',
    instructions: '',
    status: '',
    recommendation: '',
    attachments: [],
  };
}

function createEmptyComponent(): PlantMaintenanceMasterComponent {
  return {
    name: '',
    inspectionLines: [createEmptyInspectionLine()],
  };
}

function createEmptySparePartLine(): PlantMaintenanceMasterSparePartLine {
  return {
    sparePartId: '',
    sparePartDescription: '',
    quantity: null,
    warehouseCode: '',
    uomCode: '',
  };
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): Date | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDaysToDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function inclusiveDurationDays(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 86_400_000) + 1;
}

function todayDateValue(): string {
  return formatDateValue(new Date());
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
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly durationDays = signal<number | null>(null);
  readonly spareParts = signal<PlantMaintenanceMasterSparePartLine[]>([]);
  readonly components = signal<PlantMaintenanceMasterComponent[]>([]);
  readonly availableActivityRecords = signal<MaintenanceActivityMachineRecord[]>([]);
  readonly hasLoadedActivityData = signal(false);
  readonly hasActivityDefinitionsForMachine = computed(
    () => this.availableActivityRecords().length > 0,
  );
  readonly idSuggestionsOpen = signal(false);
  readonly nameSuggestionsOpen = signal(false);

  readonly machineTypeSelectOptions = computed(() =>
    this.getProfileSelectOptions('machineType', []),
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
  readonly sparePartIdSuggestionsRow = signal<number | null>(null);
  readonly sparePartDescSuggestionsRow = signal<number | null>(null);

  readonly sapWarehouseOptions = SAP_WAREHOUSE_MASTER;
  readonly sapUomOptions = SAP_UOM_MASTER;

  private get machineOptions(): MachineSearchOption[] {
    return SAP_MACHINE_MASTER;
  }

  private get sparePartOptions(): SparePartSearchOption[] {
    return SAP_SPARE_PARTS_MASTER;
  }

  private syncingScheduleFields = false;

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
    this.startDate.set(record.startDate ?? '');
    this.endDate.set(record.endDate ?? '');
    this.durationDays.set(record.duration ?? null);
    this.spareParts.set(this.cloneSpareParts(record));
    this.components.set(this.cloneComponents(record));
  }

  hasLoadedComponents(): boolean {
    return this.components().some((c) => c.name.trim());
  }

  getComponentHeaderStatusClass(component: PlantMaintenanceMasterComponent): string {
    const status = this.resolveComponentHeaderStatus(component);
    return status ? `mad-component-card__header--${status}` : '';
  }

  getLineStatusSelectClass(status: string): string {
    switch (status.trim()) {
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

  onStartDateInput(value: string): void {
    this.startDate.set(value);
    this.syncScheduleFromStartDate();
  }

  onEndDateInput(value: string): void {
    this.endDate.set(value);
    this.syncScheduleFromEndDate();
  }

  getSparePartIdSuggestions(rowIndex: number): SparePartSearchOption[] {
    const row = this.spareParts()[rowIndex];
    return row ? this.filterSparePartSuggestions(row.sparePartId) : [];
  }

  getSparePartDescSuggestions(rowIndex: number): SparePartSearchOption[] {
    const row = this.spareParts()[rowIndex];
    return row ? this.filterSparePartSuggestions(row.sparePartDescription) : [];
  }

  isSparePartIdSuggestionsOpen(rowIndex: number): boolean {
    return (
      this.sparePartIdSuggestionsRow() === rowIndex &&
      (this.spareParts()[rowIndex]?.sparePartId.trim() ?? '').length > 0
    );
  }

  isSparePartDescSuggestionsOpen(rowIndex: number): boolean {
    return (
      this.sparePartDescSuggestionsRow() === rowIndex &&
      (this.spareParts()[rowIndex]?.sparePartDescription.trim() ?? '').length > 0
    );
  }

  onSparePartIdInput(rowIndex: number, value: string): void {
    this.updateSparePartRow(rowIndex, { sparePartId: value });
    this.sparePartIdSuggestionsRow.set(value.trim() ? rowIndex : null);
    this.sparePartDescSuggestionsRow.set(null);
  }

  onSparePartDescriptionInput(rowIndex: number, value: string): void {
    this.updateSparePartRow(rowIndex, { sparePartDescription: value });
    this.sparePartDescSuggestionsRow.set(value.trim() ? rowIndex : null);
    this.sparePartIdSuggestionsRow.set(null);
  }

  onSparePartQuantityInput(rowIndex: number, value: number | string | null): void {
    if (value === null || value === '') {
      this.updateSparePartRow(rowIndex, { quantity: null });
      return;
    }
    const quantity = typeof value === 'number' ? value : Number.parseFloat(String(value));
    if (!Number.isFinite(quantity) || quantity < 0) {
      return;
    }
    this.updateSparePartRow(rowIndex, { quantity });
  }

  onSparePartWarehouseInput(rowIndex: number, warehouseCode: string): void {
    this.updateSparePartRow(rowIndex, { warehouseCode });
  }

  onSparePartUomInput(rowIndex: number, uomCode: string): void {
    this.updateSparePartRow(rowIndex, { uomCode });
  }

  openSparePartIdSuggestions(rowIndex: number): void {
    if (this.spareParts()[rowIndex]?.sparePartId.trim()) {
      this.sparePartIdSuggestionsRow.set(rowIndex);
      this.sparePartDescSuggestionsRow.set(null);
    }
  }

  openSparePartDescSuggestions(rowIndex: number): void {
    if (this.spareParts()[rowIndex]?.sparePartDescription.trim()) {
      this.sparePartDescSuggestionsRow.set(rowIndex);
      this.sparePartIdSuggestionsRow.set(null);
    }
  }

  onSparePartIdBlur(): void {
    setTimeout(() => this.sparePartIdSuggestionsRow.set(null), 150);
  }

  onSparePartDescBlur(): void {
    setTimeout(() => this.sparePartDescSuggestionsRow.set(null), 150);
  }

  selectSparePartFromSuggestion(rowIndex: number, part: SparePartSearchOption): void {
    this.sparePartIdSuggestionsRow.set(null);
    this.sparePartDescSuggestionsRow.set(null);
    this.updateSparePartRow(rowIndex, {
      sparePartId: part.sparePartId,
      sparePartDescription: part.sparePartDescription,
      uomCode: this.spareParts()[rowIndex]?.uomCode.trim()
        ? this.spareParts()[rowIndex].uomCode
        : part.defaultUomCode,
    });
  }

  addSparePartRow(): void {
    this.spareParts.update((list) => [...list, createEmptySparePartLine()]);
  }

  removeSparePartRow(rowIndex: number): void {
    this.spareParts.update((list) => list.filter((_, i) => i !== rowIndex));
    if (this.sparePartIdSuggestionsRow() === rowIndex) {
      this.sparePartIdSuggestionsRow.set(null);
    } else if (
      this.sparePartIdSuggestionsRow() !== null &&
      this.sparePartIdSuggestionsRow()! > rowIndex
    ) {
      this.sparePartIdSuggestionsRow.update((i) => (i === null ? null : i - 1));
    }
    if (this.sparePartDescSuggestionsRow() === rowIndex) {
      this.sparePartDescSuggestionsRow.set(null);
    } else if (
      this.sparePartDescSuggestionsRow() !== null &&
      this.sparePartDescSuggestionsRow()! > rowIndex
    ) {
      this.sparePartDescSuggestionsRow.update((i) => (i === null ? null : i - 1));
    }
  }

  onDurationInput(value: number | string | null): void {
    if (value === null || value === '') {
      this.durationDays.set(null);
      return;
    }

    const days = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(days) || days < 1) {
      return;
    }

    this.syncScheduleFromDuration(days);
  }

  updateComponentName(componentIndex: number, value: string): void {
    if (this.hasLoadedActivityData()) {
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
    if (
      field !== 'status' &&
      field !== 'recommendation' &&
      this.hasLoadedActivityData()
    ) {
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
    if (this.hasLoadedActivityData()) {
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
    if (this.hasLoadedActivityData()) {
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
    if (this.hasLoadedActivityData()) {
      return;
    }
    this.components.update((list) => [...list, createEmptyComponent()]);
  }

  removeComponent(componentIndex: number): void {
    if (this.hasLoadedActivityData()) {
      return;
    }
    this.components.update((list) =>
      list.length > 1 ? list.filter((_, i) => i !== componentIndex) : [createEmptyComponent()],
    );
  }

  trackByIndex(index: number): number {
    return index;
  }

  onLineAttachmentChange(componentIndex: number, lineIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.alertService.validation('Please upload an image file.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        return;
      }

      this.components.update((list) =>
        list.map((component, ci) => {
          if (ci !== componentIndex) {
            return component;
          }
          const inspectionLines = component.inspectionLines.map((line, li) =>
            li === lineIndex
              ? {
                  ...line,
                  attachments: [
                    ...line.attachments,
                    { fileName: file.name, dataUrl },
                  ],
                }
              : line,
          );
          return { ...component, inspectionLines };
        }),
      );
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  removeLineAttachment(
    componentIndex: number,
    lineIndex: number,
    attachmentIndex: number,
  ): void {
    this.components.update((list) =>
      list.map((component, ci) => {
        if (ci !== componentIndex) {
          return component;
        }
        const inspectionLines = component.inspectionLines.map((line, li) =>
          li === lineIndex
            ? {
                ...line,
                attachments: line.attachments.filter((_, ai) => ai !== attachmentIndex),
              }
            : line,
        );
        return { ...component, inspectionLines };
      }),
    );
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
        this.startDate.set(record.startDate ?? '');
        this.endDate.set(record.endDate ?? '');
        this.durationDays.set(record.duration ?? null);
        this.spareParts.set(this.cloneSpareParts(record));
        this.components.set(this.cloneComponents(record));
        this.hasLoadedActivityData.set(false);
      }
      return;
    }
    this.hasLoadedActivityData.set(false);
    this.machineId.set('');
    this.machineName.set('');
    this.machineType.set('');
    this.maintenanceNature.set('');
    this.plantMaintenanceFrequency.set('');
    this.plantMaintenanceType.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.durationDays.set(null);
    this.spareParts.set([]);
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
            recommendation: line.recommendation.trim(),
            attachments: line.attachments.map((attachment) => ({
              fileName: attachment.fileName.trim(),
              dataUrl: attachment.dataUrl,
            })),
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
    const { spareParts, sparePartsError } = this.normalizeSparePartsForSave();
    if (sparePartsError) {
      this.alertService.validation(sparePartsError);
      return;
    }

    const payload = {
      machineId,
      machineName,
      machineType,
      maintenanceNature,
      plantMaintenanceFrequency,
      plantMaintenanceType,
      startDate: this.startDate().trim(),
      endDate: this.endDate().trim(),
      duration: this.durationDays(),
      spareParts,
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

  private syncScheduleFromDuration(days: number): void {
    if (this.syncingScheduleFields) {
      return;
    }

    this.syncingScheduleFields = true;
    try {
      const start = parseDateValue(todayDateValue());
      if (!start) {
        return;
      }

      const end = addDaysToDate(start, days - 1);
      this.durationDays.set(days);
      this.startDate.set(formatDateValue(start));
      this.endDate.set(formatDateValue(end));
    } finally {
      this.syncingScheduleFields = false;
    }
  }

  private syncScheduleFromStartDate(): void {
    if (this.syncingScheduleFields) {
      return;
    }

    const start = parseDateValue(this.startDate());
    if (!start) {
      return;
    }

    this.syncingScheduleFields = true;
    try {
      const end = parseDateValue(this.endDate());
      const duration = this.durationDays();

      if (end && end >= start) {
        this.durationDays.set(inclusiveDurationDays(start, end));
        return;
      }

      if (duration && duration > 0) {
        this.endDate.set(formatDateValue(addDaysToDate(start, duration - 1)));
      }
    } finally {
      this.syncingScheduleFields = false;
    }
  }

  private syncScheduleFromEndDate(): void {
    if (this.syncingScheduleFields) {
      return;
    }

    const start = parseDateValue(this.startDate());
    const end = parseDateValue(this.endDate());
    if (!start || !end) {
      return;
    }

    this.syncingScheduleFields = true;
    try {
      if (end >= start) {
        this.durationDays.set(inclusiveDurationDays(start, end));
      } else {
        this.durationDays.set(null);
      }
    } finally {
      this.syncingScheduleFields = false;
    }
  }

  private resolveComponentHeaderStatus(
    component: PlantMaintenanceMasterComponent,
  ): 'pass' | 'fail' | 'na' | '' {
    const statuses = component.inspectionLines
      .map((line) => line.status.trim())
      .filter(Boolean);

    if (!statuses.length) {
      return '';
    }

    if (statuses.some((status) => status === 'Fail')) {
      return 'fail';
    }

    if (statuses.some((status) => status === 'N/A')) {
      return 'na';
    }

    if (statuses.every((status) => status === 'Pass')) {
      return 'pass';
    }

    return '';
  }

  private updateSparePartRow(
    rowIndex: number,
    patch: Partial<PlantMaintenanceMasterSparePartLine>,
  ): void {
    this.spareParts.update((list) =>
      list.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row)),
    );
  }

  private normalizeSparePartsForSave(): {
    spareParts: PlantMaintenanceMasterSparePartLine[];
    sparePartsError?: string;
  } {
    const filledRows = this.spareParts().filter(
      (row) =>
        row.sparePartId.trim() ||
        row.sparePartDescription.trim() ||
        row.quantity !== null ||
        row.warehouseCode.trim() ||
        row.uomCode.trim(),
    );

    if (filledRows.length === 0) {
      return { spareParts: [] };
    }

    const spareParts: PlantMaintenanceMasterSparePartLine[] = [];

    for (let index = 0; index < filledRows.length; index++) {
      const row = filledRows[index];
      const identity = resolveSparePartIdentity(row.sparePartId, row.sparePartDescription);
      const sparePartId = identity.sparePartId;
      const sparePartDescription = identity.sparePartDescription;
      const warehouseCode = row.warehouseCode.trim();
      const uomCode = row.uomCode.trim();
      const quantity = row.quantity;

      if (!sparePartId || !sparePartDescription) {
        return {
          spareParts: [],
          sparePartsError: `Spare Parts row ${index + 1}: enter Spare Part ID and Description from SAP.`,
        };
      }

      if (quantity === null || quantity <= 0) {
        return {
          spareParts: [],
          sparePartsError: `Spare Parts row ${index + 1}: enter a valid Quantity.`,
        };
      }

      if (!warehouseCode) {
        return {
          spareParts: [],
          sparePartsError: `Spare Parts row ${index + 1}: select a Warehouse.`,
        };
      }

      if (!uomCode) {
        return {
          spareParts: [],
          sparePartsError: `Spare Parts row ${index + 1}: select a UOM.`,
        };
      }

      spareParts.push({
        sparePartId,
        sparePartDescription,
        quantity,
        warehouseCode,
        uomCode,
      });
    }

    return { spareParts };
  }

  private cloneSpareParts(record: PlantMaintenanceMasterRecord): PlantMaintenanceMasterSparePartLine[] {
    if (record.spareParts?.length) {
      return record.spareParts.map((row) => ({
        sparePartId: row.sparePartId ?? '',
        sparePartDescription: row.sparePartDescription ?? '',
        quantity: row.quantity ?? null,
        warehouseCode: row.warehouseCode ?? '',
        uomCode: row.uomCode ?? '',
      }));
    }
    return [];
  }

  private filterSparePartSuggestions(query: string): SparePartSearchOption[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return this.sparePartOptions
      .filter(
        (p) =>
          p.sparePartId.toLowerCase().includes(q) ||
          p.sparePartDescription.toLowerCase().includes(q),
      )
      .slice(0, 10);
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
      this.clearLoadedComponents();
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
      this.clearLoadedComponents();
      return;
    }

    this.applyActivityProfile(activityRecord);
  }

  private applyActivityProfile(activityRecord: MaintenanceActivityMachineRecord): void {
    this.hasLoadedActivityData.set(true);
    this.components.set(this.cloneComponentsFromActivity(activityRecord));
  }

  private clearLoadedComponents(): void {
    this.hasLoadedActivityData.set(false);
    this.components.set([]);
  }

  private clearActivityProfileFields(): void {
    this.hasLoadedActivityData.set(false);
    this.availableActivityRecords.set([]);
    this.machineType.set('');
    this.maintenanceNature.set('');
    this.plantMaintenanceFrequency.set('');
    this.plantMaintenanceType.set('');
    this.components.set([]);
  }

  private getProfileSelectOptions<T extends string>(
    field: 'machineType' | 'maintenanceNature' | 'plantMaintenanceFrequency' | 'plantMaintenanceType',
    fallback: readonly T[],
  ): T[] {
    if (!this.isCreateMode() || this.availableActivityRecords().length === 0) {
      return [...fallback];
    }

    return this.activityService.getProfileFieldValues(
      this.availableActivityRecords(),
      field,
      {},
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
      recommendation: line.recommendation ?? '',
      attachments: (line.attachments ?? []).map((attachment) => ({
        fileName: attachment.fileName ?? '',
        dataUrl: attachment.dataUrl ?? '',
      })),
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
