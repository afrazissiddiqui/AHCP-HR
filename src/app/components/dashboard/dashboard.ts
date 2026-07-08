import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { getNavigableHrMenuActions, HrMenuAction } from '../../config/hr-menu.config';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class dashboardComponent {
  readonly menuActions: HrMenuAction[];

  constructor(
    private readonly router: Router,
    private readonly permissionService: PermissionService,
  ) {
    this.menuActions = getNavigableHrMenuActions().filter((action) =>
      this.permissionService.canAccess(action.access),
    );
  }

  openAction(action: HrMenuAction): void {
    void this.router.navigateByUrl(action.route);
  }
}
