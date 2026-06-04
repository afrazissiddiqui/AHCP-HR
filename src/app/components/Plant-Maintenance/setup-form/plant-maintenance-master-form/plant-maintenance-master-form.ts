import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { AlertService } from '../../../../services/alert.service';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PlantMaintenanceSetupLayoutService } from '../plant-maintenance-setup-layout.service';
import {
  PlantMaintenanceMasterFormService,
  PlantMaintenanceMasterRecord,
} from './plant-maintenance-master-form.service';

type MasterTableColumnKey =
  | 'machineId'
  | 'machineName'
  | 'machineType'
  | 'maintenanceNature'
  | 'plantMaintenanceFrequency'
  | 'plantMaintenanceType'
  | 'status';

type RowActionKey = 'view' | 'update' | 'delete';

@Component({
  selector: 'app-plant-maintenance-master-form',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent, ColumnResizeDirective],
  templateUrl: './plant-maintenance-master-form.html',
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
export class PlantMaintenanceMasterFormComponent {
  private readonly layout = inject(PlantMaintenanceSetupLayoutService);
  private readonly masterService = inject(PlantMaintenanceMasterFormService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);

  readonly Math = Math;

  searchText = '';
  sortColumn: MasterTableColumnKey = 'machineId';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  showDialog = false;
  showViewDialog = false;
  selectedRecord: PlantMaintenanceMasterRecord | null = null;
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  readonly rowActions: RowActionKey[] = ['view', 'update', 'delete'];

  readonly columns: Array<{ key: MasterTableColumnKey; label: string; visible: boolean }> = [
    { key: 'machineId', label: 'Machine ID', visible: true },
    { key: 'machineName', label: 'Machine Name', visible: true },
    { key: 'machineType', label: 'Machine Type', visible: true },
    { key: 'maintenanceNature', label: 'Maintenance Nature', visible: true },
    { key: 'plantMaintenanceFrequency', label: 'Plant Maintenance Frequency', visible: true },
    { key: 'plantMaintenanceType', label: 'Plant Maintenance Type', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ];

  get showActionsColumn(): boolean {
    return this.rowActions.length > 0;
  }

  hasRowAction(action: RowActionKey): boolean {
    return this.rowActions.includes(action);
  }

  get machineList(): PlantMaintenanceMasterRecord[] {
    return this.masterService.records();
  }

  get filteredList(): PlantMaintenanceMasterRecord[] {
    let list = [...this.machineList];
    const search = this.searchText.trim().toLowerCase();

    if (search) {
      list = list.filter(
        (item) =>
          item.machineId.toLowerCase().includes(search) ||
          item.machineName.toLowerCase().includes(search) ||
          item.machineType.toLowerCase().includes(search) ||
          item.maintenanceNature.toLowerCase().includes(search) ||
          item.plantMaintenanceFrequency.toLowerCase().includes(search) ||
          item.plantMaintenanceType.toLowerCase().includes(search) ||
          item.remarks.toLowerCase().includes(search) ||
          (item.components ?? []).some(
            (c) =>
              c.name.toLowerCase().includes(search) ||
              c.inspectionLines.some(
                (line) =>
                  line.status.toLowerCase().includes(search) ||
                  (line.recommendation ?? '').toLowerCase().includes(search) ||
                  line.itemsToBeInspected.toLowerCase().includes(search) ||
                  line.whatToCheck.toLowerCase().includes(search) ||
                  line.instructions.toLowerCase().includes(search),
              ),
          ),
      );
    }

    list.sort((a, b) => {
      const valueA = this.getCellValue(a, this.sortColumn);
      const valueB = this.getCellValue(b, this.sortColumn);
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

  get paginatedList(): PlantMaintenanceMasterRecord[] {
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
    let count = this.columns.filter((c) => c.visible).length + 1;
    if (this.showActionsColumn) {
      count += 1;
    }
    return count;
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  addMachine(): void {
    void this.router.navigate([
      '/plant-maintenance/setup-form/plant-maintenance-master-form/create',
    ]);
  }

  viewRecord(item: PlantMaintenanceMasterRecord): void {
    this.selectedRecord = item;
    this.showViewDialog = true;
  }

  closeViewDialog(): void {
    this.showViewDialog = false;
    this.selectedRecord = null;
  }

  updateRecord(item: PlantMaintenanceMasterRecord): void {
    void this.router.navigate([
      '/plant-maintenance/setup-form/plant-maintenance-master-form/edit',
      item.id,
    ]);
  }

  async deleteRecord(item: PlantMaintenanceMasterRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete machine?',
      `Remove ${item.machineId} — ${item.machineName} from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }
    this.masterService.deleteRecord(item.id);
    if (this.paginatedList.length === 0 && this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  getCellValue(item: PlantMaintenanceMasterRecord, columnKey: MasterTableColumnKey): string {
    if (columnKey === 'status') {
      const statuses = (item.components ?? []).flatMap((c) =>
        c.inspectionLines.map((line) => line.status?.trim()).filter(Boolean),
      );
      return statuses.length ? statuses.join(', ') : '';
    }
    return item[columnKey] ?? '';
  }

  onHeaderClick(columnKey: MasterTableColumnKey): void {
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
    this.masterService.setAllSelected(checked, ids);
  }

  isAllSelected(): boolean {
    return (
      this.filteredList.length > 0 && this.filteredList.every((item) => item.selected)
    );
  }

  onRowSelectChange(item: PlantMaintenanceMasterRecord, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.masterService.updateSelection(item.id, checked);
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

