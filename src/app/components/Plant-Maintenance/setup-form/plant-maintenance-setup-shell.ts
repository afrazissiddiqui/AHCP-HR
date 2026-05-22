import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../../sidebar/sidebar';
import { PlantMaintenanceSetupLayoutService } from './plant-maintenance-setup-layout.service';
import {
  PLANT_MAINTENANCE_SETUP_SIDEBAR_ITEMS,
  PLANT_MAINTENANCE_SETUP_SIDEBAR_SECTIONS,
  plantMaintenanceSetupActiveItemFromUrl,
} from './plant-maintenance-setup-sidebar';

@Component({
  selector: 'app-plant-maintenance-setup-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './plant-maintenance-setup-shell.html',
  styleUrl: './plant-maintenance-setup-shell.css',
})
export class PlantMaintenanceSetupShellComponent {
  protected readonly layout = inject(PlantMaintenanceSetupLayoutService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarItems = PLANT_MAINTENANCE_SETUP_SIDEBAR_ITEMS;
  readonly sidebarSections = PLANT_MAINTENANCE_SETUP_SIDEBAR_SECTIONS;

  readonly activeSidebarItemId = signal('sub-component-definition');
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
    this.showSidebar.set(!url.includes('/create') && !url.includes('/edit/'));
    this.activeSidebarItemId.set(plantMaintenanceSetupActiveItemFromUrl(url));
  }
}
