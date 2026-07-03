import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { AlertService } from './alert.service';
import { AuthService } from './auth.service';
import { UserSetupService } from './user-setup.service';
import {
  UserAuthorizationModule,
  buildAuthorizationTemplate,
  humanizeModuleSlug,
  isPermissionGranted,
} from '../utils/user-authorization.util';

const SESSION_AUTHORIZATION_KEY = 'sapqc_session_authorization';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private readonly authService = inject(AuthService);
  private readonly userSetupService = inject(UserSetupService);
  private readonly alertService = inject(AlertService);

  private readonly authorization = signal<UserAuthorizationModule[] | null>(this.readStoredAuthorization());
  private readonly loaded = signal(!!this.readStoredAuthorization());
  private loadRequest: Observable<void> | null = null;

  readonly permissions = this.authorization.asReadonly();

  can(moduleSlug: string, action: string): boolean {
    if (this.authService.getSessionUser()?.is_admin) {
      return true;
    }

    return isPermissionGranted(this.authorization(), moduleSlug, action);
  }

  deniedMessage(moduleSlug: string, action: string): string {
    const moduleName = humanizeModuleSlug(moduleSlug);
    const actionLabel = action.trim().toLowerCase();
    return `You are not allowed to ${actionLabel} ${moduleName} records.`;
  }

  assertCan(moduleSlug: string, action: string): boolean {
    if (this.can(moduleSlug, action)) {
      return true;
    }

    void this.alertService.error('Not allowed', this.deniedMessage(moduleSlug, action));
    return false;
  }

  ensureLoaded(): Observable<void> {
    if (this.loaded()) {
      return of(void 0);
    }

    if (!this.loadRequest) {
      this.loadRequest = this.loadForCurrentUser().pipe(
        tap(() => this.loaded.set(true)),
        catchError(() => {
          this.loaded.set(true);
          return of(void 0);
        }),
        shareReplay(1),
      );
    }

    return this.loadRequest;
  }

  reloadForCurrentUser(): Observable<void> {
    this.clear();
    return this.ensureLoaded();
  }

  loadForCurrentUser(): Observable<void> {
    const sessionUser = this.authService.getSessionUser();
    if (!sessionUser) {
      this.authorization.set([]);
      return of(void 0);
    }

    if (sessionUser.is_admin) {
      this.authorization.set([]);
      this.persistAuthorization(null);
      return of(void 0);
    }

    return this.userSetupService.fetchUserDetail(sessionUser.id).pipe(
      map((detail) => {
        const rawAuthorization = detail['authorization'] ?? detail['Authorization'];
        const modules = buildAuthorizationTemplate(rawAuthorization);
        this.authorization.set(modules);
        this.persistAuthorization(modules);
      }),
      catchError(() => {
        const cached = this.readStoredAuthorization();
        if (cached) {
          this.authorization.set(cached);
        } else {
          this.authorization.set(buildAuthorizationTemplate());
        }
        return of(void 0);
      }),
    );
  }

  clear(): void {
    this.authorization.set(null);
    this.loaded.set(false);
    this.loadRequest = null;
    sessionStorage.removeItem(SESSION_AUTHORIZATION_KEY);
  }

  fallbackRoute(moduleSlug: string): string {
    if (this.can(moduleSlug, 'list')) {
      return moduleSlug === 'application_form' ? '/recruitment' : '/job-specification-form';
    }
    return '/dashboard';
  }

  private readStoredAuthorization(): UserAuthorizationModule[] | null {
    const raw = sessionStorage.getItem(SESSION_AUTHORIZATION_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return buildAuthorizationTemplate(parsed);
    } catch {
      return null;
    }
  }

  private persistAuthorization(modules: UserAuthorizationModule[] | null): void {
    if (!modules?.length) {
      sessionStorage.removeItem(SESSION_AUTHORIZATION_KEY);
      return;
    }

    sessionStorage.setItem(SESSION_AUTHORIZATION_KEY, JSON.stringify(modules));
  }
}
