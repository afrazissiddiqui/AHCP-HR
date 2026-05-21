import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TableFilterConfig,
  TableFilterField,
  TableFilterNumberRangeValue,
  TableFilterSelectField,
  TableFilterStatusValue,
} from './table-filter.types';
import { resolveSelectOptions } from './table-filter.util';
import { TableFilterService } from './table-filter.service';

@Component({
  selector: 'app-table-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table-filter.component.html',
  styleUrl: './table-filter.component.css',
  host: { class: 'app-table-filter' },
})
export class TableFilterComponent {
  readonly config = input.required<TableFilterConfig>();
  /** Table rows used to build dropdown options when `options` are not set on a field. */
  readonly data = input<unknown[]>([]);

  readonly applied = output<void>();

  constructor(readonly tableFilter: TableFilterService) {}

  get cfg(): TableFilterConfig {
    return this.config();
  }

  get draft() {
    return this.tableFilter.getDraft(this.cfg);
  }

  isOpen(): boolean {
    return this.tableFilter.isDialogOpen(this.cfg);
  }

  hasActive(): boolean {
    return this.tableFilter.hasActive(this.cfg);
  }

  openDialog(): void {
    this.tableFilter.openDialog(this.cfg);
  }

  closeDialog(): void {
    this.tableFilter.closeDialog(this.cfg);
  }

  apply(): void {
    this.tableFilter.apply(this.cfg);
    this.applied.emit();
  }

  clear(): void {
    this.tableFilter.clear(this.cfg);
    this.applied.emit();
  }

  selectOptions(field: TableFilterSelectField): string[] {
    return resolveSelectOptions(field, this.data());
  }

  getSelectValue(field: TableFilterField): string {
    const v = this.draft[field.key];
    return typeof v === 'string' ? v : '';
  }

  setSelectValue(field: TableFilterField, value: string): void {
    this.tableFilter.setDraftField(this.cfg, field.key, value);
  }

  getStatusValue(field: TableFilterField): TableFilterStatusValue {
    const v = this.draft[field.key];
    return v === 'Active' || v === 'NotActive' ? v : '';
  }

  setStatusValue(field: TableFilterField, value: TableFilterStatusValue): void {
    this.tableFilter.setDraftField(this.cfg, field.key, value);
  }

  getRangeValue(field: TableFilterField): TableFilterNumberRangeValue {
    const v = this.draft[field.key];
    if (v && typeof v === 'object' && 'from' in v) {
      return v as TableFilterNumberRangeValue;
    }
    return { from: null, to: null };
  }

  setRangeFrom(field: TableFilterField, value: number | null): void {
    const current = this.getRangeValue(field);
    this.tableFilter.setDraftField(this.cfg, field.key, { ...current, from: value });
  }

  setRangeTo(field: TableFilterField, value: number | null): void {
    const current = this.getRangeValue(field);
    this.tableFilter.setDraftField(this.cfg, field.key, { ...current, to: value });
  }

  fieldDomId(field: TableFilterField, suffix: string): string {
    return `${this.cfg.id}-${field.key}-${suffix}`;
  }
}
