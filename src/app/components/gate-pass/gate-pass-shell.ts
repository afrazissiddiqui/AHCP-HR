import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar';
import { GatePassLayoutService } from './gate-pass-layout.service';
import {
  GATE_PASS_SIDEBAR_ITEMS,
  GATE_PASS_SIDEBAR_SECTIONS,
  gatePassActiveItemFromUrl,
} from './gate-pass-sidebar';

@Component({
  selector: 'app-gate-pass-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './gate-pass-shell.html',
  styleUrl: './gate-pass-shell.css',
})
export class GatePassShellComponent {
  protected readonly layout = inject(GatePassLayoutService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarItems = GATE_PASS_SIDEBAR_ITEMS;
  readonly sidebarSections = GATE_PASS_SIDEBAR_SECTIONS;

  readonly activeSidebarItemId = signal('igp-list');

  constructor() {
    this.syncActiveItem(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(e => this.syncActiveItem(e.urlAfterRedirects));
  }

  onFolderSelected(folderId: string): void {
    this.activeSidebarItemId.set(folderId);
  }

  private syncActiveItem(url: string): void {
    this.activeSidebarItemId.set(gatePassActiveItemFromUrl(url));
  }
}
