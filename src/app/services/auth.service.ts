import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

const AUTH_SESSION_KEY = 'sapqc_session_auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);

  /** Mirrors session flag so UI can react if needed later. */
  readonly isLoggedIn = signal(this.readSession());

  private readSession(): boolean {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === '1';
  }

  /** Call after successful sign-in. */
  login(): void {
    sessionStorage.setItem(AUTH_SESSION_KEY, '1');
    this.isLoggedIn.set(true);
  }

  /** Clears session and opens the login page. */
  logout(): void {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    this.isLoggedIn.set(false);
    void this.router.navigateByUrl('/login');
  }
}
