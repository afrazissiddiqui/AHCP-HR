import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../../services/alert.service';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PlantMaintenanceSetupLayoutService } from '../plant-maintenance-setup-layout.service';
import { MachineSearchOption, SAP_MACHINE_MASTER } from '../plant-maintenance-machine.model';
import { SubComponentDefinitionService } from './sub-component-definition.service';

@Component({
  selector: 'app-add-sub-component-definition',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent],
  templateUrl: './add-sub-component-definition.html',
  styleUrls: [
    '../../../HR-Portal/payroll-master/tax-computation/tax-computation.css',
    '../../../HR-Portal/Application-Form/create-job-requisition/create-job-requisition.css',
    '../plant-maintenance-setup-form.css',
  ],
})
export class AddSubComponentDefinitionComponent implements OnInit {
  private readonly layout = inject(PlantMaintenanceSetupLayoutService);
  private readonly subComponentService = inject(SubComponentDefinitionService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editingRecordId = signal<string | null>(null);
  readonly pageTitle = computed(() =>
    this.editingRecordId() ? 'Update Machine' : 'Add Machine',
  );

  readonly machineId = signal('');
  readonly machineName = signal('');
  readonly machineType = signal('');
  readonly subComponents = signal<string[]>(['']);
  readonly idSuggestionsOpen = signal(false);
  readonly nameSuggestionsOpen = signal(false);

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
    const record = this.subComponentService.getById(id);
    if (!record) {
      this.alertService.validation('Machine record not found.');
      void this.router.navigate(['/plant-maintenance/setup-form/sub-component-definition']);
      return;
    }
    this.editingRecordId.set(id);
    this.machineId.set(record.machineId);
    this.machineName.set(record.machineName);
    this.machineType.set(record.machineType);
    this.subComponents.set(
      record.subComponents.length ? [...record.subComponents] : [''],
    );
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  back(): void {
    void this.router.navigate(['/plant-maintenance/setup-form/sub-component-definition']);
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
      const record = this.subComponentService.getById(this.editingRecordId()!);
      if (record) {
        this.machineId.set(record.machineId);
        this.machineName.set(record.machineName);
        this.machineType.set(record.machineType);
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
    this.closeIdSuggestions();
    this.closeNameSuggestions();
  }

  async saveForm(): Promise<void> {
    const machineId = this.machineId().trim();
    const machineName = this.machineName().trim();
    const machineType = this.machineType().trim();
    const subComponents = this.subComponents()
      .map((s) => s.trim())
      .filter(Boolean);

    if (!machineId || !machineName || !machineType) {
      this.alertService.validation(
        'Machine ID, Machine Name, and Machine Type are required.',
      );
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

    const payload = { machineId, machineName, machineType, subComponents };

    if (this.editingRecordId()) {
      this.subComponentService.updateRecord(this.editingRecordId()!, payload);
    } else {
      this.subComponentService.addRecord(payload);
    }

    const successMessage = this.editingRecordId()
      ? 'Sub Component Defination updated successfully.'
      : 'Sub Component Defination saved successfully.';

    await this.alertService.successAndWait('Success', successMessage);

    void this.router.navigate(['/plant-maintenance/setup-form/sub-component-definition']);
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
    this.machineType.set(machine.defaultMachineType);
    if (!this.editingRecordId()) {
      this.subComponents.set(['']);
    }
  }
}
