import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

const AUTH_SESSION_KEY = 'sapqc_session_auth';
const SESSION_USER_ID_KEY = 'sapqc_session_user_id';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);

  /** Mirrors session flag so UI can react if needed later. */
  readonly isLoggedIn = signal(this.readSession());
  readonly sessionUserId = signal(this.readSessionUserId());

  private readSession(): boolean {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === '1';
  }

  private readSessionUserId(): string | null {
    return sessionStorage.getItem(SESSION_USER_ID_KEY);
  }

  /** Call after successful sign-in. */
  login(userId?: string): void {
    sessionStorage.setItem(AUTH_SESSION_KEY, '1');
    const trimmed = userId?.trim() ?? '';
    if (trimmed) {
      sessionStorage.setItem(SESSION_USER_ID_KEY, trimmed);
      this.sessionUserId.set(trimmed);
    } else {
      sessionStorage.removeItem(SESSION_USER_ID_KEY);
      this.sessionUserId.set(null);
    }
    this.isLoggedIn.set(true);
  }

  getSessionUserId(): string | null {
    return this.sessionUserId();
  }

  /** Clears session and opens the login page. */
  logout(): void {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(SESSION_USER_ID_KEY);
    this.isLoggedIn.set(false);
    this.sessionUserId.set(null);
    void this.router.navigateByUrl('/login');
  }
}
