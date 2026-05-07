import { Component, signal, ChangeDetectionStrategy, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SidebarItem {
  id: string;
  label: string;
  route?: string;
  icon?: string; // Optional icon
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
