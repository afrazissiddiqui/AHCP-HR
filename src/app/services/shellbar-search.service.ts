import { Injectable, signal } from '@angular/core';

export interface ShellbarSearchConsumer {
  getSearchText: () => string;
  setSearchText: (value: string) => void;
  onSearchChange: () => void;
}

@Injectable({ providedIn: 'root' })
export class ShellbarSearchService {
  readonly query = signal('');
  readonly placeholder = signal('Search current list');
  readonly enabled = signal(false);
  /** Incremented when shellbar query changes so list pages can refresh. */
  readonly revision = signal(0);

  private consumer: ShellbarSearchConsumer | null = null;

  register(consumer: ShellbarSearchConsumer): void {
    this.consumer = consumer;
    this.enabled.set(true);
    this.query.set(consumer.getSearchText());
    this.revision.update((v) => v + 1);
  }

  unregister(): void {
    this.consumer = null;
    this.enabled.set(false);
    this.query.set('');
    this.revision.update((v) => v + 1);
  }

  setPlaceholder(placeholder: string): void {
    this.placeholder.set(placeholder);
  }

  updateFromShellbar(value: string): void {
    this.query.set(value);
    this.revision.update((v) => v + 1);
    if (!this.consumer) {
      return;
    }
    this.consumer.setSearchText(value);
  }

  /** Keeps shellbar input in sync when the page toolbar search changes. */
  syncQuery(value: string): void {
    this.query.set(value);
    this.revision.update((v) => v + 1);
  }

  /** Combined search term for list pages (toolbar + shellbar stay in sync). */
  activeTerm(localSearchText: string): string {
    this.revision();
    return (localSearchText.trim() || this.query().trim());
  }
}
