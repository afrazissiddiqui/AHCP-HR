import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appToggleSidebar]',
  standalone: true,
})
export class ToggleSidebarDirective {
  @HostListener('click')
  onClick(): void {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) {
      return;
    }
    sidebar.classList.toggle('app-sidebar--hidden');
  }
}
