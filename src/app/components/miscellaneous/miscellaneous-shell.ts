import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar';
import { MiscellaneousLayoutService } from './miscellaneous-layout.service';
import {
  MISCELLANEOUS_SIDEBAR_ITEMS,
  MISCELLANEOUS_SIDEBAR_SECTIONS,
  miscellaneousActiveItemFromUrl,
} from './miscellaneous-sidebar';

@Component({
  selector: 'app-miscellaneous-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './miscellaneous-shell.html',
  styleUrl: './miscellaneous-shell.css',
})
export class MiscellaneousShellComponent {
  protected readonly layout = inject(MiscellaneousLayoutService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarItems = MISCELLANEOUS_SIDEBAR_ITEMS;
  readonly sidebarSections = MISCELLANEOUS_SIDEBAR_SECTIONS;
  readonly activeSidebarItemId = signal('miscellaneous-good-receipt-note');

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
    this.activeSidebarItemId.set(miscellaneousActiveItemFromUrl(url));
  }
}
