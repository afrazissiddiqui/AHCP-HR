import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../../sidebar/sidebar';
import { PayrollMasterLayoutService } from './payroll-master-layout.service';
import {
  PAYROLL_MASTER_SIDEBAR_ITEMS,
  PAYROLL_MASTER_SIDEBAR_SECTIONS,
  payrollMasterActiveItemFromUrl,
} from './payroll-master-sidebar';

@Component({
  selector: 'app-payroll-master-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './payroll-master-shell.html',
  styleUrl: './payroll-master-shell.css',
})
export class PayrollMasterShellComponent {
  protected readonly layout = inject(PayrollMasterLayoutService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarItems = PAYROLL_MASTER_SIDEBAR_ITEMS;
  readonly sidebarSections = PAYROLL_MASTER_SIDEBAR_SECTIONS;

  readonly activeSidebarItemId = signal('payroll-master-list');
  readonly showSidebar = signal(true);

  constructor() {
    this.syncRouteState(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.syncRouteState(e.urlAfterRedirects));
  }

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId.set(folderId);
  }

  private syncRouteState(url: string): void {
    this.showSidebar.set(!url.includes('/create'));
    this.activeSidebarItemId.set(payrollMasterActiveItemFromUrl(url));
  }
}
