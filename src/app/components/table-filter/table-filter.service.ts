import { Injectable, signal } from '@angular/core';
import {
  cloneFilterValues,
  createEmptyFilterValues,
  filterTableItems,
  hasActiveFilterValues,
  normalizeFilterValues,
} from './table-filter.util';
import { TableFilterConfig, TableFilterValues } from './table-filter.types';

interface TableFilterState {
  applied: TableFilterValues;
  draft: TableFilterValues;
  dialogOpen: boolean;
}

@Injectable({ providedIn: 'root' })
export class TableFilterService {
  /** Bumped when any filter is applied or cleared — bind in list getters to refresh. */
  readonly revision = signal(0);

  private readonly states = new Map<string, TableFilterState>();

  private ensureState(config: TableFilterConfig): TableFilterState {
    let state = this.states.get(config.id);
    if (!state) {
      const empty = createEmptyFilterValues(config);
      state = {
        applied: cloneFilterValues(empty),
        draft: cloneFilterValues(empty),
        dialogOpen: false,
      };
      this.states.set(config.id, state);
    }
    return state;
  }

  isDialogOpen(config: TableFilterConfig): boolean {
    return this.ensureState(config).dialogOpen;
  }

  openDialog(config: TableFilterConfig): void {
    const state = this.ensureState(config);
    state.draft = cloneFilterValues(state.applied);
    state.dialogOpen = true;
  }

  closeDialog(config: TableFilterConfig): void {
    this.ensureState(config).dialogOpen = false;
  }

  getDraft(config: TableFilterConfig): TableFilterValues {
    return this.ensureState(config).draft;
  }

  getApplied(config: TableFilterConfig): TableFilterValues {
    return this.ensureState(config).applied;
  }

  hasActive(config: TableFilterConfig): boolean {
    return hasActiveFilterValues(config, this.getApplied(config));
  }

  setDraftField(
    config: TableFilterConfig,
    key: string,
    value: TableFilterValues[string]
  ): void {
    this.ensureState(config).draft[key] = value;
  }

  apply(config: TableFilterConfig): void {
    const state = this.ensureState(config);
    state.applied = normalizeFilterValues(config, state.draft);
    state.draft = cloneFilterValues(state.applied);
    state.dialogOpen = false;
    this.revision.update((v) => v + 1);
  }

  clear(config: TableFilterConfig): void {
    const empty = createEmptyFilterValues(config);
    const state = this.ensureState(config);
    state.applied = cloneFilterValues(empty);
    state.draft = cloneFilterValues(empty);
    this.revision.update((v) => v + 1);
  }

  filterItems<T>(items: T[], config: TableFilterConfig): T[] {
    this.revision();
    return filterTableItems(items, config, this.getApplied(config));
  }
}
