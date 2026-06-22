import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../../column-resize';
import { AlertService } from '../../../../services/alert.service';
import { formatApiErrorMessage } from '../../../../utils/api-error.util';
import { PageToolbarComponent } from '../../../page-toolbar/page-toolbar';
import { PlantMaintenanceSetupLayoutService } from '../plant-maintenance-setup-layout.service';
import {
  MaintenanceActivityDefinitionService,
  MaintenanceActivityMachineRecord,
} from './maintenance-activity-definition.service';

type MachineTableColumnKey =
  | 'machineId'
  | 'machineName'
  | 'machineType'
  | 'maintenanceNature'
  | 'plantMaintenanceFrequency'
  | 'plantMaintenanceType';

type RowActionKey = 'view' | 'update' | 'delete';

@Component({
  selector: 'app-maintenance-activity-definition',
  standalone: true,
  imports: [CommonModule, FormsModule, PageToolbarComponent, ColumnResizeDirective],
  templateUrl: './maintenance-activity-definition.html',
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
export class MaintenanceActivityDefinitionComponent implements OnInit {
  private readonly layout = inject(PlantMaintenanceSetupLayoutService);
  private readonly activityService = inject(MaintenanceActivityDefinitionService);
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
  detailLoading = false;
  selectedRecord: MaintenanceActivityMachineRecord | null = null;
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  ngOnInit(): void {
    this.activityService.fetchMaintenanceActivityDefinitions().subscribe({
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load maintenance activity definitions.'),
        );
      },
    });
  }

  readonly rowActions: RowActionKey[] = ['view', 'update', 'delete'];

  readonly columns: Array<{ key: MachineTableColumnKey; label: string; visible: boolean }> = [
    { key: 'machineId', label: 'Machine ID', visible: true },
    { key: 'machineName', label: 'Machine Name', visible: true },
    { key: 'machineType', label: 'Machine Type', visible: true },
    { key: 'maintenanceNature', label: 'Maintenance Nature', visible: true },
    { key: 'plantMaintenanceFrequency', label: 'Plant Maint. Frequency', visible: true },
    { key: 'plantMaintenanceType', label: 'Plant Maint. Type', visible: true },
  ];

  get visibleColumns(): Array<{ key: MachineTableColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((col) => col.visible);
  }

  get showActionsColumn(): boolean {
    return this.rowActions.length > 0;
  }

  hasRowAction(action: RowActionKey): boolean {
    return this.rowActions.includes(action);
  }

  get machineList(): MaintenanceActivityMachineRecord[] {
    return this.activityService.records();
  }

  get filteredList(): MaintenanceActivityMachineRecord[] {
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
          item.plantMaintenanceType.toLowerCase().includes(search),
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

  get paginatedList(): MaintenanceActivityMachineRecord[] {
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
    let count = this.visibleColumns.length + 1;
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
      '/plant-maintenance/setup-form/maintenance-activity-definition/create',
    ]);
  }

  viewRecord(item: MaintenanceActivityMachineRecord): void {
    if (!item.id) {
      void this.alertService.warning('View', 'Unable to view this row: missing record id.');
      return;
    }

    this.showViewDialog = true;
    this.selectedRecord = null;
    this.detailLoading = true;

    this.activityService.fetchMaintenanceActivityDefinitionDetail(item.id).subscribe({
      next: (detail) => {
        this.selectedRecord = detail;
        this.detailLoading = false;
      },
      error: (error: unknown) => {
        this.detailLoading = false;
        this.showViewDialog = false;
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load maintenance activity definition details.'),
        );
      },
    });
  }

  closeViewDialog(): void {
    this.showViewDialog = false;
    this.selectedRecord = null;
    this.detailLoading = false;
  }

  updateRecord(item: MaintenanceActivityMachineRecord): void {
    if (!item.id) {
      void this.alertService.warning('Update', 'Unable to update this row: missing record id.');
      return;
    }
    void this.router.navigate([
      '/plant-maintenance/setup-form/maintenance-activity-definition/edit',
      item.id,
    ]);
  }

  async deleteRecord(item: MaintenanceActivityMachineRecord): Promise<void> {
    const result = await this.alertService.confirm(
      'Delete machine?',
      `Remove ${item.machineId} — ${item.machineName} from the list?`,
    );
    if (!result.isConfirmed) {
      return;
    }

    if (!item.id) {
      void this.alertService.warning('Delete', 'Unable to delete this row: missing record id.');
      return;
    }

    this.activityService.deleteMaintenanceActivityDefinition(item.id).subscribe({
      next: () => {
        this.activityService.removeMaintenanceActivityRecord(item);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        void this.alertService.success('Deleted', 'Maintenance activity definition removed successfully.');
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete maintenance activity definition.'),
        );
      },
    });
  }

  getCellValue(item: MaintenanceActivityMachineRecord, columnKey: MachineTableColumnKey): string {
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
    this.activityService.setAllSelected(checked, ids);
  }

  isAllSelected(): boolean {
    return (
      this.filteredList.length > 0 && this.filteredList.every((item) => item.selected)
    );
  }

  onRowSelectChange(item: MaintenanceActivityMachineRecord, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.activityService.updateSelection(item.id, checked);
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
