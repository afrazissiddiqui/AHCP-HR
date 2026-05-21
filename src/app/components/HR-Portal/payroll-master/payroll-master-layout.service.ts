import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PayrollMasterLayoutService {
  readonly sidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update((state) => !state);
  }
}
