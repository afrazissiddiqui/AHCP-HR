import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs';
import { AlertService } from '../services/alert.service';
import { PermissionService } from '../services/permission.service';
import { AccessRequirement } from '../utils/access-requirement.util';

export function requirePermission(moduleSlug: string, action: string): CanActivateFn {
  return () => {
    const permissionService = inject(PermissionService);
    const alertService = inject(AlertService);

    return permissionService.ensureLoaded().pipe(
      map((): boolean => {
        if (permissionService.can(moduleSlug, action)) {
          return true;
        }

        void alertService.error('Not allowed', permissionService.deniedMessage(moduleSlug, action));
        return false;
      }),
    );
  };
}

export function requireAccess(
  requirement: AccessRequirement,
  deniedModuleSlug: string,
  deniedAction: string,
): CanActivateFn {
  return () => {
    const permissionService = inject(PermissionService);
    const alertService = inject(AlertService);

    return permissionService.ensureLoaded().pipe(
      map((): boolean => {
        if (permissionService.canAccess(requirement)) {
          return true;
        }

        void alertService.error('Not allowed', permissionService.deniedMessage(deniedModuleSlug, deniedAction));
        return false;
      }),
    );
  };
}
