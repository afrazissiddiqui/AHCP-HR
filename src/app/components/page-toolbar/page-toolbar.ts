import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Compact in-page action bar (sidebar toggle + buttons).
 * The HR portal shellbar in app-root is the only application header.
 */
@Component({
  selector: 'app-page-toolbar',
  standalone: true,
  templateUrl: './page-toolbar.html',
  styleUrl: './page-toolbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageToolbarComponent {
  readonly showSidebarToggle = input(false);

  readonly sidebarToggle = output<void>();

  onToggleSidebar(): void {
    this.sidebarToggle.emit();
  }
}
