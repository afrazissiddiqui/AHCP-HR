import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { AlertService } from '../../../../services/alert.service';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PlantMaintenanceSetupLayoutService } from '../plant-maintenance-setup-layout.service';
import {
  SubComponentDefinitionService,
  SubComponentMachineRecord,
} from './sub-component-definition.service';

type MachineTableColumnKey = 'machineId' | 'machineName' | 'machineType';

@Component({
  selector: 'app-sub-component-definition',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent, ColumnResizeDirective],
  templateUrl: './sub-component-definition.html',
  styleUrls: [
    '../../../HR-Portal/Application-Form/Application-Form.css',
    '../plant-maintenance-setup-form.css',
  ],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
      }
    `,
  ],
})
export class SubComponentDefinitionComponent {
  private readonly layout = inject(PlantMaintenanceSetupLayoutService);
  private readonly subComponentService = inject(SubComponentDefinitionService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);

  readonly Math = Math;

  searchText = '';
  sortColumn: MachineTableColumnKey = 'machineId';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  showDialog = false;
  showViewDialog = false;
  selectedRecord: SubComponentMachineRecord | null = null;
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  readonly columns: Array<{ key: MachineTableColumnKey; label: string; visible: boolean }> = [
    { key: 'machineId', label: 'Machine ID', visible: true },
    { key: 'machineName', label: 'Machine Name', visible: true },
    { key: 'machineType', label: 'Machine Type', visible: true },
  ];

  get machineList(): SubComponentMachineRecord[] {
    return this.subComponentService.records();
  }

  get filteredList(): SubComponentMachineRecord[] {
    let list = [...this.machineList];
    const search = this.searchText.trim().toLowerCase();

    if (search) {
      list = list.filter(
        (item) =>
          item.machineId.toLowerCase().includes(search) ||
          item.machineName.toLowerCase().includes(search) ||
          item.machineType.toLowerCase().includes(search),
      );
    }

    list.sort((a, b) => {
      const valueA = a[this.sortColumn];
      const valueB = b[this.sortColumn];
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      return 0;
    });

    return list;
  }

  get paginatedList(): SubComponentMachineRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get visibleColumnCount(): number {
    return this.columns.filter((c) => c.visible).length + 2;
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  addMachine(): void {
    void this.router.navigate([
      '/plant-maintenance/setup-form/sub-component-definition/create',
    ]);
  }

  viewRecord(item: SubComponentMachineRecord): void {
    this.selectedRecord = item;
    this.showViewDialog = true;
  }

  closeViewDialog(): void {
    this.showViewDialog = false;
    this.selectedRecord = null;
  }

  updateRecord(item: SubComponentMachineRecord): void {
    void this.router.navigate([
      '/plant-maintenance/setup-form/sub-component-definition/edit',
      item.id,
    ]);
  }

  async deleteRecord(item: SubComponentMachineRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete machine?',
      `Remove ${item.machineId} — ${item.machineName} from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }
    this.subComponentService.deleteRecord(item.id);
    if (this.paginatedList.length === 0 && this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  getCellValue(item: SubComponentMachineRecord, columnKey: MachineTableColumnKey): string {
    return item[columnKey] ?? '';
  }

  onHeaderClick(columnKey: MachineTableColumnKey): void {
    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.sortColumn = columnKey;
    this.sortDirection = 'asc';
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const ids = this.filteredList.map((r) => r.id);
    this.subComponentService.setAllSelected(checked, ids);
  }

  isAllSelected(): boolean {
    return (
      this.filteredList.length > 0 && this.filteredList.every((item) => item.selected)
    );
  }

  onRowSelectChange(item: SubComponentMachineRecord, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.subComponentService.updateSelection(item.id, checked);
  }

  getSelectedCount(): number {
    return this.machineList.filter((item) => item.selected).length;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }
}
