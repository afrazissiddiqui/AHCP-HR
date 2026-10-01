import { Component, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import {
  getNavigableHrMenuActions,
  HrMenuAction,
  resolveRecruitmentRoute,
} from '../../config/hr-menu.config';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class dashboardComponent {
  readonly menuActions = computed(() =>
    getNavigableHrMenuActions()
      .filter((action) => this.permissionService.canAccess(action.access))
      .map((action) =>
        action.value === 'recruitment'
          ? {
              ...action,
              route: resolveRecruitmentRoute((requirement) =>
                this.permissionService.canAccess(requirement),
              ),
            }
          : action,
      ),
  );

  constructor(
    private readonly router: Router,
    private readonly permissionService: PermissionService,
  ) {}

  openAction(action: HrMenuAction): void {
    void this.router.navigateByUrl(action.route);
  }
}
