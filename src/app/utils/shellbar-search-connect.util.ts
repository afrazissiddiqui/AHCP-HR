import { ChangeDetectorRef, DestroyRef, WritableSignal } from '@angular/core';
import { ShellbarSearchConsumer, ShellbarSearchService } from '../services/shellbar-search.service';

export function connectShellbarSearch(
  service: ShellbarSearchService,
  destroyRef: DestroyRef,
  binding: ShellbarSearchConsumer,
  cdr?: ChangeDetectorRef,
): void {
  const refresh = (): void => {
    binding.onSearchChange();
    cdr?.markForCheck();
  };

  service.register({
    getSearchText: binding.getSearchText,
    setSearchText: (value) => {
      binding.setSearchText(value);
      refresh();
    },
    onSearchChange: refresh,
  });

  destroyRef.onDestroy(() => service.unregister());
}

export function connectShellbarSearchSignal(
  service: ShellbarSearchService,
  destroyRef: DestroyRef,
  searchText: WritableSignal<string>,
  onSearchChange: () => void = () => undefined,
  cdr?: ChangeDetectorRef,
): void {
  connectShellbarSearch(
    service,
    destroyRef,
    {
      getSearchText: () => searchText(),
      setSearchText: (value) => searchText.set(value),
      onSearchChange,
    },
    cdr,
  );
}
