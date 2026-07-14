import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../../utils/api-error.util';
import { MachineSearchOption } from '../../plant-maintenance-machine.model';
import { PlantMaintenanceMachineItemService } from '../../plant-maintenance-machine-item.service';
import { SubComponentDefinitionService, SubComponentMachineRecord, MachineInput } from '../sub-component-definition.service';

const SUB_COMPONENT_MACHINE_ITEM_TYPE = 'F';

const MACHINE_TYPE_OPTIONS = ['Blowing', 'Injection', 'Other'] as const;

@Component({
  selector: 'app-add-sub-component-definition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-sub-component-definition.html',
  styleUrls: ['./add-sub-component-definition.css'],
})
export class AddSubComponentDefinitionComponent implements OnInit {
  private readonly subComponentService = inject(SubComponentDefinitionService);
  private readonly machineItemService = inject(PlantMaintenanceMachineItemService);
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
  readonly subComponents = signal<string[]>(['']);
  readonly isSaving = signal(false);
  readonly machineTypeOptions = MACHINE_TYPE_OPTIONS;

  readonly machineOptions = computed(() => {
    this.machineItemService.records(SUB_COMPONENT_MACHINE_ITEM_TYPE)();
    return this.machineItemService.getAll(SUB_COMPONENT_MACHINE_ITEM_TYPE);
  });

  readonly idSuggestionsOpen = signal(false);

  readonly idSuggestions = computed(() => {
    // ensure cache is read for the specific item type
    this.machineItemService.records(SUB_COMPONENT_MACHINE_ITEM_TYPE)();
    return this.machineItemService.searchByMachineId(this.machineId(), SUB_COMPONENT_MACHINE_ITEM_TYPE);
  });

  openIdSuggestions(): void {
    if (this.machineId().trim()) {
      this.idSuggestionsOpen.set(true);
    }
  }

  closeIdSuggestions(): void {
    this.idSuggestionsOpen.set(false);
  }

  onIdInputBlur(): void {
    setTimeout(() => this.closeIdSuggestions(), 150);
  }

  onMachineIdInput(value: string): void {
    this.machineId.set(value);
    this.idSuggestionsOpen.set(value.trim().length > 0);
  }

  selectMachineFromSuggestion(machine: MachineSearchOption): void {
    this.closeIdSuggestions();
    this.populateFromMachine(machine);
  }

  // --- Name suggestions and keyboard navigation ---
  readonly nameSuggestionsOpen = signal(false);

  readonly nameSuggestions = computed(() => {
    this.machineItemService.records(SUB_COMPONENT_MACHINE_ITEM_TYPE)();
    return this.machineItemService.searchByMachineName(this.machineName(), SUB_COMPONENT_MACHINE_ITEM_TYPE);
  });

  readonly idActiveIndex = signal<number>(-1);
  readonly nameActiveIndex = signal<number>(-1);

  openNameSuggestions(): void {
    if (this.machineName().trim()) {
      this.nameSuggestionsOpen.set(true);
      this.closeIdSuggestions();
    }
  }

  closeNameSuggestions(): void {
    this.nameSuggestionsOpen.set(false);
  }

  onNameInputBlur(): void {
    setTimeout(() => this.closeNameSuggestions(), 150);
  }

  onMachineNameInput(value: string): void {
    this.machineName.set(value);
    this.nameSuggestionsOpen.set(value.trim().length > 0);
  }

  onIdKeydown(event: KeyboardEvent): void {
    const list = this.idSuggestions();
    if (!list || list.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(this.idActiveIndex() + 1, list.length - 1);
      this.idActiveIndex.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = Math.max(this.idActiveIndex() - 1, 0);
      this.idActiveIndex.set(prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.idActiveIndex();
      if (idx >= 0 && idx < list.length) {
        this.selectMachineFromSuggestion(list[idx]);
      }
    } else if (event.key === 'Escape') {
      this.closeIdSuggestions();
    }
  }

  onNameKeydown(event: KeyboardEvent): void {
    const list = this.nameSuggestions();
    if (!list || list.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(this.nameActiveIndex() + 1, list.length - 1);
      this.nameActiveIndex.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = Math.max(this.nameActiveIndex() - 1, 0);
      this.nameActiveIndex.set(prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.nameActiveIndex();
      if (idx >= 0 && idx < list.length) {
        this.selectMachineFromSuggestion(list[idx]);
      }
    } else if (event.key === 'Escape') {
      this.closeNameSuggestions();
    }
  }

  ngOnInit(): void {
    this.machineItemService.ensureLoaded(SUB_COMPONENT_MACHINE_ITEM_TYPE).subscribe({ error: () => {} });
    this.subComponentService.fetchMachines().subscribe({ error: () => {} });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.editingRecordId.set(id);

    const cached = this.subComponentService.getById(id);
    if (cached) {
      this.populateFromRecord(cached);
      return;
    }

    this.subComponentService.fetchMachineDetail(id).subscribe({
      next: (record) => this.populateFromRecord(record),
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load machine for edit.'),
        );
        void this.router.navigate(['/plant-maintenance/setup-form/sub-component-definition']);
      },
    });
  }

  back(): void {
    void this.router.navigate(['/plant-maintenance/setup-form/sub-component-definition']);
  }

  onMachineIdChange(value: string): void {
    this.machineId.set(value);
    const machine = this.machineOptions().find((item) => item.machineId === value);
    if (machine) {
      this.populateFromMachine(machine);
      return;
    }

    this.machineName.set('');
    this.machineType.set('');
  }

  onMachineTypeChange(value: string): void {
    this.machineType.set(value);
  }

  updateSubComponent(index: number, value: string): void {
    this.subComponents.update((list) => {
      const next = [...list];
      next[index] = value;
      return next;
    });
  }

  addSubComponent(): void {
    this.subComponents.update((list) => [...list, '']);
  }

  removeSubComponent(index: number): void {
    this.subComponents.update((list) =>
      list.length > 1 ? list.filter((_, i) => i !== index) : [''],
    );
  }

  trackByIndex(index: number): number {
    return index;
  }

  resetForm(): void {
    if (this.editingRecordId()) {
      const record = this.subComponentService.getById(this.editingRecordId()!);
      if (record) {
        this.machineId.set(record.machineId);
        this.machineName.set(record.machineName);
        this.machineType.set(this.normalizeMachineType(record.machineType));
        this.subComponents.set(
          record.subComponents.length ? [...record.subComponents] : [''],
        );
      }
      return;
    }
    this.machineId.set('');
    this.machineName.set('');
    this.machineType.set('');
    this.subComponents.set(['']);
  }

  async saveForm(): Promise<void> {
    const machineId = this.machineId().trim();
    const machineName = this.machineName().trim();
    const machineType = this.machineType().trim();
    const subComponents = this.subComponents()
      .map((s) => s.trim())
      .filter(Boolean);

    if (!machineId || !machineName) {
      this.alertService.validation(
        'Machine ID and Machine Name are required.',
      );
      return;
    }

    if (!machineType) {
      this.alertService.validation('Select Machine Type.');
      return;
    }

    if (subComponents.length === 0) {
      this.alertService.validation('Enter at least one sub-component for this machine.');
      return;
    }

    const excludeId = this.editingRecordId() ?? undefined;

    try {
      await firstValueFrom(this.subComponentService.fetchMachines());
    } catch {
      // Continue with the last known active list if refresh fails.
    }

    if (this.subComponentService.hasDuplicateMachineId(machineId, excludeId)) {
      this.alertService.validation(
        'This Machine ID already exists in Sub Component Definition.',
      );
      return;
    }

    const payload: MachineInput = {
      machineId,
      machineName,
      machineType,
      subComponents,
    };
    const editingId = this.editingRecordId();

    if (editingId) {
      this.isSaving.set(true);
      try {
        await firstValueFrom(this.subComponentService.updateMachine(editingId, payload));
        await this.alertService.successAndWait(
          'Success',
          'Sub Component Defination updated successfully.',
        );
      } catch (error) {
        void this.alertService.error(
          'Update Failed',
          formatApiErrorMessage(error, 'Failed to update machine.'),
        );
        return;
      } finally {
        this.isSaving.set(false);
      }
    } else {
      this.isSaving.set(true);
      try {
        await firstValueFrom(this.subComponentService.addMachine(payload));
        await this.alertService.successAndWait(
          'Success',
          'Sub Component Defination saved successfully.',
        );
      } catch (error) {
        void this.alertService.error(
          'Save Failed',
          formatApiErrorMessage(error, 'Failed to save machine.'),
        );
        return;
      } finally {
        this.isSaving.set(false);
      }
    }

    void this.router.navigate(['/plant-maintenance/setup-form/sub-component-definition']);
  }

  private populateFromRecord(record: SubComponentMachineRecord): void {
    this.machineId.set(record.machineId === '—' ? '' : record.machineId);
    this.machineName.set(record.machineName === '—' ? '' : record.machineName);
    this.machineType.set(this.normalizeMachineType(record.machineType));
    this.subComponents.set(
      record.subComponents.length ? [...record.subComponents] : [''],
    );
  }

  private populateFromMachine(machine: MachineSearchOption): void {
    this.machineId.set(machine.machineId);
    this.machineName.set(machine.machineName);
    if (!this.editingRecordId()) {
      this.subComponents.set(['']);
    }
  }

  private normalizeMachineType(value: string): string {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '—') {
      return '';
    }
    return (MACHINE_TYPE_OPTIONS as readonly string[]).includes(trimmed) ? trimmed : '';
  }
}
