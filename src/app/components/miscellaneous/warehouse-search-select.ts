import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WarehouseOption, WarehouseService } from '../../services/warehouse.service';

@Component({
  selector: 'app-warehouse-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse-search-select.html',
  styleUrls: ['./miscellaneous-form.css'],
})
export class WarehouseSearchSelectComponent implements OnInit, OnChanges, OnDestroy {
  private readonly warehouseService = inject(WarehouseService);
  private loadSub?: Subscription;

  @Input() warehouseCode = '';
  @Input() compact = false;
  @Input() displayCodeOnly = false;
  @Input() placeholder = 'Select warehouse';
  @Output() warehouseCodeChange = new EventEmitter<string>();

  options: WarehouseOption[] = [];
  selectedCode = '';
  loading = false;
  loadError: string | null = null;

  ngOnInit(): void {
    this.selectedCode = (this.warehouseCode ?? '').trim();
    this.loadOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['warehouseCode']) {
      this.selectedCode = (this.warehouseCode ?? '').trim();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  onSelect(code: string): void {
    this.selectedCode = code;
    this.warehouseCodeChange.emit(code);
  }

  retryLoad(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.loadError = null;
    this.loadOptions(true);
  }

  optionLabel(warehouse: WarehouseOption): string {
    return this.warehouseService.formatLabel(warehouse);
  }

  private loadOptions(forceReload = false): void {
    this.loading = true;
    this.loadSub?.unsubscribe();
    const request = forceReload
      ? this.warehouseService.reload()
      : this.warehouseService.ensureLoaded();

    this.loadSub = request.subscribe({
      next: (rows) => {
        this.loading = false;
        this.options = [...rows];
        this.loadError = rows.length === 0 ? 'No warehouses returned from API.' : null;

        // Keep a pre-filled PO warehouse visible even if catalog is still catching up.
        const code = this.selectedCode.trim();
        if (code && !this.options.some((row) => row.warehouseCode === code)) {
          this.options = [
            { warehouseCode: code, warehouseName: code },
            ...this.options,
          ];
        }
      },
      error: () => {
        this.loading = false;
        this.options = [];
        this.loadError = 'Could not load warehouses from API.';
      },
    });
  }
}
