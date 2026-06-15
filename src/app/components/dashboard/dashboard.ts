import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { getNavigableHrMenuActions, HrMenuAction } from '../../config/hr-menu.config';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class dashboardComponent {
  readonly menuActions: HrMenuAction[] = getNavigableHrMenuActions();

  constructor(private readonly router: Router) {}

  openAction(action: HrMenuAction): void {
    void this.router.navigateByUrl(action.route);
  }
}
