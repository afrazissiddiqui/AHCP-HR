import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { apiUrl } from '../config/api.config';

const AUTH_SESSION_KEY = 'sapqc_session_auth';
const SESSION_USER_ID_KEY = 'sapqc_session_user_id';
const SESSION_TOKEN_KEY = 'sapqc_session_token';
const SESSION_USER_KEY = 'sapqc_session_user';
const SESSION_AUTHORIZATION_KEY = 'sapqc_session_authorization';
const LOGIN_API_URL = apiUrl('login');

export interface LoginApiUser {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LoginApiResponse {
  status: boolean;
  message: string;
  token: string;
  user: LoginApiUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

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

  getSessionUser(): LoginApiUser | null {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as LoginApiUser;
    } catch {
      return null;
    }
  }

  getAuthToken(): string | null {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  }

  loginWithApi(email: string, password: string): Observable<LoginApiResponse> {
    return this.http
      .post<LoginApiResponse>(LOGIN_API_URL, {
        email: email.trim(),
        password,
      })
      .pipe(
        tap((response) => {
          if (!response?.status || !response?.token || !response?.user?.email) {
            throw new Error(response?.message || 'Login failed.');
          }
          this.login(response.user.email);
          sessionStorage.setItem(SESSION_TOKEN_KEY, response.token);
          sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(response.user));
        }),
      );
  }

  /** Clears session and opens the login page. */
  logout(): void {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(SESSION_USER_ID_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_AUTHORIZATION_KEY);
    this.isLoggedIn.set(false);
    this.sessionUserId.set(null);
    void this.router.navigateByUrl('/login');
  }
}
