import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OitmItem } from '../../constants/oitm-items';
import { OitmItemsService } from '../../services/oitm-items.service';

type ItemSortColumn = 'itemCode' | 'itemName' | 'uom';

@Component({
  selector: 'app-oitm-item-picker-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oitm-item-picker-dialog.html',
  styleUrls: ['./miscellaneous-form.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OitmItemPickerDialogComponent implements OnChanges, OnInit {
  private readonly oitmItemsService = inject(OitmItemsService);

  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @Output() selected = new EventEmitter<OitmItem[]>();

  readonly items = signal<OitmItem[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly sortColumn = signal<ItemSortColumn>('itemCode');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 20, 50];
  readonly selectedCodes = signal<Set<string>>(new Set());
  readonly Math = Math;

  readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const column = this.sortColumn();
    const direction = this.sortDirection();
    let list = this.items();

    if (term) {
      list = list.filter(
        (item) =>
          item.itemCode.toLowerCase().includes(term) || item.itemName.toLowerCase().includes(term),
      );
    }

    if (column === 'itemCode' && direction === 'asc' && !term) {
      return list;
    }

    return [...list].sort((left, right) => {
      const valA = String(left[column] ?? '').toLowerCase();
      const valB = String(right[column] ?? '').toLowerCase();
      const comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return direction === 'asc' ? comparison : -comparison;
    });
  });

  readonly paginatedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredItems().length / this.pageSize())),
  );

  readonly allVisibleSelected = computed(() => {
    const visible = this.paginatedItems();
    const selected = this.selectedCodes();
    return visible.length > 0 && visible.every((item) => selected.has(item.itemCode));
  });

  ngOnInit(): void {
    this.oitmItemsService.ensureLoaded().subscribe({ error: () => undefined });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.resetState();
      this.loadItems();
    }
  }

  close(): void {
    this.openChange.emit(false);
  }

  loadItems(forceReload = false): void {
    if (!forceReload && this.oitmItemsService.isLoaded()) {
      this.items.set([...this.oitmItemsService.getCatalog()]);
      this.loading.set(false);
      this.loadError.set(null);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);

    const request = forceReload
      ? this.oitmItemsService.reload()
      : this.oitmItemsService.ensureLoaded();

    request.subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
        this.loadError.set(rows.length === 0 ? 'No items returned from AHCP.' : null);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
        this.loadError.set('Could not load items from AHCP.');
      },
    });
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  sortData(column: ItemSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortColumn.set(column);
    this.sortDirection.set('asc');
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  isSelected(item: OitmItem): boolean {
    return this.selectedCodes().has(item.itemCode);
  }

  toggleSelection(item: OitmItem, event?: Event): void {
    event?.stopPropagation();
    this.selectedCodes.update((codes) => {
      const next = new Set(codes);
      if (next.has(item.itemCode)) {
        next.delete(item.itemCode);
      } else {
        next.add(item.itemCode);
      }
      return next;
    });
  }

  toggleSelectAll(event: Event): void {
    event.stopPropagation();
    const visible = this.paginatedItems();
    const allSelected = this.allVisibleSelected();

    this.selectedCodes.update((codes) => {
      const next = new Set(codes);
      if (allSelected) {
        visible.forEach((item) => next.delete(item.itemCode));
      } else {
        visible.forEach((item) => next.add(item.itemCode));
      }
      return next;
    });
  }

  selectedCount(): number {
    return this.selectedCodes().size;
  }

  confirm(): void {
    const selected = this.selectedCodes();
    const picked = this.items().filter((item) => selected.has(item.itemCode));
    if (picked.length === 0) {
      return;
    }
    this.selected.emit(picked);
    this.close();
  }

  private resetState(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
    this.pageSize.set(10);
    this.sortColumn.set('itemCode');
    this.sortDirection.set('asc');
    this.selectedCodes.set(new Set());
  }
}
