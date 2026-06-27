import { ChangeDetectorRef, DestroyRef, inject, WritableSignal } from '@angular/core';
import { ShellbarSearchConsumer, ShellbarSearchService } from '../services/shellbar-search.service';

export function connectShellbarSearch(
  service: ShellbarSearchService,
  destroyRef: DestroyRef,
  binding: ShellbarSearchConsumer,
): void {
  const cdr = inject(ChangeDetectorRef);

  service.register({
    getSearchText: binding.getSearchText,
    setSearchText: (value) => {
      binding.setSearchText(value);
      binding.onSearchChange();
      cdr.markForCheck();
    },
    onSearchChange: () => {
      binding.onSearchChange();
      cdr.markForCheck();
    },
  });

  destroyRef.onDestroy(() => service.unregister());
}

export function connectShellbarSearchSignal(
  service: ShellbarSearchService,
  destroyRef: DestroyRef,
  searchText: WritableSignal<string>,
  onSearchChange: () => void = () => undefined,
): void {
  connectShellbarSearch(service, destroyRef, {
    getSearchText: () => searchText(),
    setSearchText: (value) => searchText.set(value),
    onSearchChange,
  });
}
