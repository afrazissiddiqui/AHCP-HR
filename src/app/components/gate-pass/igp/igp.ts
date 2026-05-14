import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../column-resize';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../sidebar/sidebar';
import { IgpService, IgpRecord } from './igp.service';

type IgpSortableKey = Exclude<keyof IgpRecord, 'lines' | 'selected'>;

interface ColumnConfig {
  key: IgpSortableKey;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-igp',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, SidebarComponent],
  templateUrl: './igp.html',
  styleUrl: './igp.css',
})
export class IgpComponent {
  constructor(private readonly router: Router, private readonly igpService: IgpService) {}

  Math = Math;

  sidebarItems: SidebarItem[] = [{ id: 'igp-registry', label: 'IGP registry', route: '/gate-pass/igp' }];

  sidebarSections: SidebarSection[] = [
    {
      id: 'gate-pass-actions',
      title: 'Gate pass',
      items: [
        { id: 'igp-list', label: 'IGP (inward)', route: '/gate-pass/igp' },
        { id: 'ogp-list', label: 'OGP (outward)', route: '/gate-pass/ogp' },
      ],
    },
  ];

  activeSidebarItemId = 'igp-list';
  sidebarCollapsed = signal(false);

  columns: ColumnConfig[] = [
    { key: 'Id', label: 'ID', visible: true },
    { key: 'referenceNo', label: 'IGP no.', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'submittedDate', label: 'Date', visible: true },
    { key: 'businessPartnerName', label: 'Business partner', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'vehicleNo', label: 'Vehicle no.', visible: true },
    { key: 'location', label: 'Location', visible: true },
    { key: 'totalQty', label: 'Total qty', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ];

  get rows(): IgpRecord[] {
    return this.igpService.records();
  }

  searchText = '';
  sortColumn: IgpSortableKey = 'Id';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showDialog = false;
  showDetailDialog = false;
  selectedRow: IgpRecord | null = null;
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  viewDetails(record: IgpRecord): void {
    this.selectedRow = record;
    this.showDetailDialog = true;
  }

  closeDetailDialog(): void {
    this.selectedRow = null;
    this.showDetailDialog = false;
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredList.forEach(s => (s.selected = checked));
  }

  isAllSelected(): boolean {
    return this.filteredList.length > 0 && this.filteredList.every(s => s.selected);
  }

  getSelectedCount(): number {
    return this.rows.filter(x => x.selected).length;
  }

  get filteredList(): IgpRecord[] {
    let list = [...this.rows];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter(item => {
        const hay = [
          item.title,
          item.department,
          item.referenceNo,
          item.status,
          item.type,
          item.businessPartnerName,
          item.businessPartnerCode,
          item.baseDocNo,
          item.vehicleNo,
          item.location,
          String(item.Id),
          String(item.totalQty ?? ''),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(search);
      });
    }

    list.sort((a, b) => {
      const valA = a[this.sortColumn];
      const valB = b[this.sortColumn];
      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const sa = String(valA);
      const sb = String(valB);
      let comparison = 0;
      if (sa > sb) comparison = 1;
      else if (sa < sb) comparison = -1;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }

  get paginatedList(): IgpRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredList.length / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  sortData(column: IgpSortableKey): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  createNew(): void {
    void this.router.navigateByUrl('/gate-pass/igp/create');
  }

  onFolderSelected(folder: string): void {
    this.activeSidebarItemId = folder;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(s => !s);
  }
}
