import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../../sidebar/sidebar';
import { PlantMaintenanceMainLayoutService } from './plant-maintenance-main-layout.service';
import {
  PLANT_MAINTENANCE_MAIN_SIDEBAR_ITEMS,
  PLANT_MAINTENANCE_MAIN_SIDEBAR_SECTIONS,
  plantMaintenanceMainActiveItemFromUrl,
} from './plant-maintenance-main-sidebar';

@Component({
  selector: 'app-plant-maintenance-main-form',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './plant-maintenance-main-form.html',
  styleUrl: './plant-maintenance-main-form.css',
})
export class PlantMaintenanceMainFormComponent {
  protected readonly layout = inject(PlantMaintenanceMainLayoutService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarItems = PLANT_MAINTENANCE_MAIN_SIDEBAR_ITEMS;
  readonly sidebarSections = PLANT_MAINTENANCE_MAIN_SIDEBAR_SECTIONS;

  readonly activeSidebarItemId = signal('plant-maintenance-master-form');
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
    this.activeSidebarItemId.set(plantMaintenanceMainActiveItemFromUrl(url));
  }
}
