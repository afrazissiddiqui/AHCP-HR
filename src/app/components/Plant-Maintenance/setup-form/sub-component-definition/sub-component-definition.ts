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
export class SubComponentDefinitionComponent implements OnInit {
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
  detailLoading = false;
  selectedRecord: SubComponentMachineRecord | null = null;
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  ngOnInit(): void {
    this.subComponentService.fetchMachines().subscribe({
      error: (error: unknown) => {
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load machines.'),
        );
      },
    });
  }

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
    if (!item.id) {
      void this.alertService.warning('View', 'Unable to view this row: missing machine id.');
      return;
    }

    this.showViewDialog = true;
    this.selectedRecord = null;
    this.detailLoading = true;

    this.subComponentService.fetchMachineDetail(item.id).subscribe({
      next: (detail) => {
        this.selectedRecord = detail;
        this.detailLoading = false;
      },
      error: (error: unknown) => {
        this.detailLoading = false;
        this.showViewDialog = false;
        void this.alertService.error(
          'Load Failed',
          formatApiErrorMessage(error, 'Failed to load machine details.'),
        );
      },
    });
  }

  closeViewDialog(): void {
    this.showViewDialog = false;
    this.selectedRecord = null;
    this.detailLoading = false;
  }

  updateRecord(item: SubComponentMachineRecord): void {
    if (!item.id) {
      void this.alertService.warning('Update', 'Unable to update this row: missing machine id.');
      return;
    }
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

    if (!item.id) {
      void this.alertService.warning('Delete', 'Unable to delete this row: missing machine id.');
      return;
    }

    this.subComponentService.deleteMachine(item.id).subscribe({
      next: () => {
        this.subComponentService.removeMachineRecord(item);
        if (this.paginatedList.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        void this.alertService.success('Deleted', 'Machine removed successfully.');
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Delete Failed',
          formatApiErrorMessage(error, 'Failed to delete machine.'),
        );
      },
    });
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
