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

  readonly machineOptions = computed(() => {
    this.machineItemService.records(SUB_COMPONENT_MACHINE_ITEM_TYPE)();
    return this.machineItemService.getAll(SUB_COMPONENT_MACHINE_ITEM_TYPE);
  });

  ngOnInit(): void {
    this.machineItemService.ensureLoaded(SUB_COMPONENT_MACHINE_ITEM_TYPE).subscribe({ error: () => {} });

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
        this.machineType.set(record.machineType === '—' ? '' : record.machineType);
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
      this.alertService.validation('Machine type could not be resolved for the selected machine.');
      return;
    }

    if (subComponents.length === 0) {
      this.alertService.validation('Enter at least one sub-component for this machine.');
      return;
    }

    const excludeId = this.editingRecordId() ?? undefined;
    if (this.subComponentService.hasDuplicateMachineId(machineId, excludeId)) {
      this.alertService.validation('This Machine ID is already in the list.');
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
    this.machineType.set(record.machineType === '—' ? '' : record.machineType);
    this.subComponents.set(
      record.subComponents.length ? [...record.subComponents] : [''],
    );
  }

  private populateFromMachine(machine: MachineSearchOption): void {
    this.machineId.set(machine.machineId);
    this.machineName.set(machine.machineName);
    this.machineType.set(machine.defaultMachineType.trim());
    if (!this.editingRecordId()) {
      this.subComponents.set(['']);
    }
  }
}
