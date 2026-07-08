import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs';
import { AlertService } from '../services/alert.service';
import { PermissionService } from '../services/permission.service';
import { AccessRequirement } from '../utils/access-requirement.util';

export function requirePermission(moduleSlug: string, action: string): CanActivateFn {
  return () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);
    const alertService = inject(AlertService);

    return permissionService.ensureLoaded().pipe(
      map((): boolean | UrlTree => {
        if (permissionService.can(moduleSlug, action)) {
          return true;
        }

        void alertService.error('Not allowed', permissionService.deniedMessage(moduleSlug, action));
        return router.createUrlTree([permissionService.fallbackRoute(moduleSlug)]);
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
    const router = inject(Router);
    const alertService = inject(AlertService);

    return permissionService.ensureLoaded().pipe(
      map((): boolean | UrlTree => {
        if (permissionService.canAccess(requirement)) {
          return true;
        }

        void alertService.error('Not allowed', permissionService.deniedMessage(deniedModuleSlug, deniedAction));
        return router.createUrlTree([permissionService.fallbackRoute(deniedModuleSlug)]);
      }),
    );
  };
}
