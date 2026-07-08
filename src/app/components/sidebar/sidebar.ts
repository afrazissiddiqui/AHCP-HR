import { Component, signal, ChangeDetectionStrategy, Input, Output, EventEmitter, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '../../services/permission.service';
import { AccessRequirement } from '../../utils/access-requirement.util';

export interface SidebarItem {
  id: string;
  label: string;
  route?: string;
  icon?: string; // Optional icon
  access?: AccessRequirement;
}

export interface SidebarSection {
  id: string;
  title: string;
  items: SidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private readonly permissionService = inject(PermissionService);
  // Input: Configure sidebar items
  @Input() items: SidebarItem[] = [];
  @Input() sections: SidebarSection[] = [];
  @Input() title = 'My Forms';
  @Input() showManageButton = true;
  @Input() manageButtonLabel = 'Manage Folders';

  @Output() folderSelected = new EventEmitter<string>();
  @Output() manageFoldersClick = new EventEmitter<void>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  private readonly _isCollapsed = signal<boolean>(false);
  @Input() set isCollapsed(value: boolean) {
    this._isCollapsed.set(value);
  }
  @HostBinding('class.collapsed')
  get isCollapsedState() {
    return this._isCollapsed();
  }

  protected readonly selected = signal<string | null>(null);

  protected readonly expanded = signal<Record<string, boolean>>({});

  get visibleItems(): SidebarItem[] {
    return this.items.filter((item) => this.permissionService.canAccess(item.access));
  }

  get visibleSections(): SidebarSection[] {
    return this.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => this.permissionService.canAccess(item.access)),
      }))
      .filter((section) => section.items.length > 0);
  }

  @Input() set activeItemId(value: string | null) {
    this.selected.set(value);
  }

  toggle(sectionId: string): void {
    this.expanded.update(state => ({
      ...state,
      [sectionId]: !state[sectionId]
    }));
  }

  isExpanded(sectionId: string): boolean {
    const state = this.expanded();
    return state[sectionId] ?? true;
  }

  selectFolder(item: SidebarItem): void {
    this.selected.set(item.id);
    this.folderSelected.emit(item.id);
  }

  manageFolders(): void {
    this.manageFoldersClick.emit();
  }

  toggleCollapse(): void {
    const newState = !this._isCollapsed();
    this._isCollapsed.set(newState);
    this.collapsedChange.emit(newState);
  }
}
