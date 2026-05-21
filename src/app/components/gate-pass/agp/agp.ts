import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColumnResizeDirective } from '../../../column-resize';
import { PageToolbarComponent } from '../../page-toolbar/page-toolbar';
import { GatePassLayoutService } from '../gate-pass-layout.service';
import { AgpRecord, AgpService } from './agp.service';

type AgpSortableKey = Exclude<keyof AgpRecord, 'lines' | 'selected'>;

interface ColumnConfig {
  key: AgpSortableKey;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-agp',
  standalone: true,
  imports: [CommonModule, FormsModule, ColumnResizeDirective, PageToolbarComponent],
  templateUrl: './agp.html',
  styleUrl: '../igp/igp.css',
})
export class AgpComponent {
  constructor(
    private readonly router: Router,
    private readonly agpService: AgpService,
    private readonly layout: GatePassLayoutService,
  ) {}

  Math = Math;

  columns: ColumnConfig[] = [
    { key: 'Id', label: 'ID', visible: true },
    { key: 'referenceNo', label: 'AGP no.', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'submittedDate', label: 'Date', visible: true },
    { key: 'businessPartnerName', label: 'Business partner', visible: true },
    { key: 'requestingDepartment', label: 'Department', visible: true },
    { key: 'vehicleNo', label: 'Vehicle no.', visible: true },
    { key: 'totalQtySent', label: 'Qty sent', visible: true },
    { key: 'totalQtyReceived', label: 'Qty received', visible: true },
    { key: 'status', label: 'Status', visible: true },
  ];

  get rows(): AgpRecord[] {
    return this.agpService.records();
  }

  searchText = '';
  sortColumn: AgpSortableKey = 'Id';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  showDialog = false;
  showDetailDialog = false;
  selectedRow: AgpRecord | null = null;
  activeTab: 'sort' | 'filter' | 'group' = 'filter';

  openDialog(): void {
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  viewDetails(record: AgpRecord): void {
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

  get filteredList(): AgpRecord[] {
    let list = [...this.rows];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter(item => {
        const hay = [
          item.title,
          item.requestingDepartment,
          item.department,
          item.referenceNo,
          item.status,
          item.type,
          item.businessPartnerName,
          item.businessPartnerCode,
          item.baseDocNo,
          item.vehicleNo,
          String(item.Id),
          String(item.totalQtySent ?? ''),
          String(item.totalQtyReceived ?? ''),
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

  get paginatedList(): AgpRecord[] {
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

  sortData(column: AgpSortableKey): void {
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
    void this.router.navigateByUrl('/gate-pass/agp/create');
  }

  toggleSidebar(): void {
    this.layout.toggleSidebar();
  }
}
