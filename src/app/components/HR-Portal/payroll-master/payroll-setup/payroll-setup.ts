import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import { PAYROLL_MASTER_SIDEBAR_ITEMS, PAYROLL_MASTER_SIDEBAR_SECTIONS } from '../payroll-master-sidebar';
import {
  PAYROLL_SETUP_TABLE_COLUMNS,
  PayrollSetupColumnKey,
  PayrollSetupRecord,
  PayrollSetupService,
} from './payroll-setup.service';

@Component({
  selector: 'app-payroll-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './payroll-setup.html',
  styleUrl: '../../Application-Form/Application-Form.css',
})
export class PayrollSetupComponent {
  constructor(
    private readonly payrollSetupService: PayrollSetupService,
    private readonly router: Router,
  ) {}

  sidebarItems: SidebarItem[] = PAYROLL_MASTER_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = PAYROLL_MASTER_SIDEBAR_SECTIONS;
  activeSidebarItemId = 'payroll-setup';
  sidebarCollapsed = signal(false);
  searchText = '';
  selectedDepartment = '';
  showDialog = false;
  activeTab: 'filter' = 'filter';

  readonly columns = PAYROLL_SETUP_TABLE_COLUMNS.map((col) => ({ ...col, visible: true }));

  get payrollSetupList(): PayrollSetupRecord[] {
    return this.payrollSetupService.records();
  }

  get departmentOptions(): string[] {
    const seen = new Set<string>();
    for (const row of this.payrollSetupList) {
      const d = row.department?.trim() ?? '';
      if (d) {
        seen.add(d);
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get filteredPayrollRows(): PayrollSetupRecord[] {
    let list = this.payrollSetupList;

    if (this.selectedDepartment) {
      list = list.filter((row) => (row.department?.trim() ?? '') === this.selectedDepartment);
    }

    if (!this.searchText.trim()) {
      return list;
    }

    const search = this.searchText.toLowerCase();
    return list.filter((row) =>
      PAYROLL_SETUP_TABLE_COLUMNS.some((col) => {
        const value = row[col.key];
        return String(value ?? '')
          .toLowerCase()
          .includes(search);
      }),
    );
  }

  get visibleColumns(): Array<{ key: PayrollSetupColumnKey; label: string; visible: boolean }> {
    return this.columns.filter((column) => column.visible);
  }

  getCellValue(row: PayrollSetupRecord, key: PayrollSetupColumnKey): string | number {
    return row[key];
  }

  onSearchChange(): void {}

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId = folderId;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((state) => !state);
  }

  createNew(): void {
    void this.router.navigateByUrl('/payroll-master/payroll-setup/create');
  }
}
