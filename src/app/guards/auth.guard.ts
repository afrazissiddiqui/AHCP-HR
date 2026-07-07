import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';

export const authGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const permissionService = inject(PermissionService);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  return permissionService.ensureLoaded().pipe(
    timeout(10_000),
    map(() => true),
    catchError(() => of(true)),
  );
};
