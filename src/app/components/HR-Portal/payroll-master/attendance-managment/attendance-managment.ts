import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../../sidebar/sidebar';
import { PAYROLL_MASTER_SIDEBAR_ITEMS, PAYROLL_MASTER_SIDEBAR_SECTIONS } from '../payroll-master-sidebar';

@Component({
  selector: 'app-attendance-managment',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './attendance-managment.html',
  styleUrl: '../../Application-Form/Application-Form.css',
})
export class AttendanceManagmentComponent {
  sidebarItems: SidebarItem[] = PAYROLL_MASTER_SIDEBAR_ITEMS;
  sidebarSections: SidebarSection[] = PAYROLL_MASTER_SIDEBAR_SECTIONS;
  activeSidebarItemId = 'attendance-managment';
  sidebarCollapsed = signal(false);

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId = folderId;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((state) => !state);
  }
}
