import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../shared/app-urls';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'assist-point-auth';
  private readonly rawHttp: HttpClient;

  constructor(
    private readonly http: HttpClient,
    httpBackend: HttpBackend
  ) {
    this.rawHttp = new HttpClient(httpBackend);
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const session = await firstValueFrom(
      this.http.post<AuthSession>(`${API_BASE_URL}/auth/login`, { email, password })
    );

    this.setSession(session);
    return session;
  }

  async refreshAccessToken(): Promise<AuthSession | null> {
    const session = this.getSession();

    if (!session?.refreshToken) {
      return null;
    }

    try {
      const refreshed = await firstValueFrom(
        this.rawHttp.post<Pick<AuthSession, 'accessToken' | 'expiresIn'>>(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: session.refreshToken
        })
      );

      const updatedSession: AuthSession = {
        ...session,
        accessToken: refreshed.accessToken,
        expiresIn: refreshed.expiresIn
      };
      this.setSession(updatedSession);
      return updatedSession;
    } catch {
      this.clearSession();
      return null;
    }
  }

  logout(): void {
    const session = this.getSession();

    if (session?.refreshToken) {
      this.http.post(`${API_BASE_URL}/auth/logout`, { refreshToken: session.refreshToken }).subscribe({
        error: () => undefined
      });
    }

    this.clearSession();
  }

  getSession(): AuthSession | null {
    const raw = sessionStorage.getItem(this.storageKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  }

  setSession(session: AuthSession): void {
    sessionStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  clearSession(): void {
    sessionStorage.removeItem(this.storageKey);
  }
}
