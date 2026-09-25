import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import {
  ApiEnvelope,
  AuthResult,
  AuthTokens,
  LoginPayload,
  RegisterPayload,
} from '../models/auth.model';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);

  /** Perfil completo del usuario autenticado. null si no hay sesión (o aún no se cargó). */
  private readonly _currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  /** true una vez que hay un usuario cargado en memoria. */
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  register(payload: RegisterPayload): Observable<AuthResult> {
    return this.http
      .post<ApiEnvelope<AuthResult>>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(
        map((res) => res.data),
        tap((result) => this.tokenStorage.setTokens(result)),
        // Encadenado (no fire-and-forget): el observable no completa hasta que
        // currentUser esté seteado, así los guards no leen un estado a medio camino.
        switchMap((result) => this.loadProfile().pipe(map(() => result))),
      );
  }

  login(payload: LoginPayload): Observable<AuthResult> {
    return this.http
      .post<ApiEnvelope<AuthResult>>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        map((res) => res.data),
        tap((result) => this.tokenStorage.setTokens(result)),
        switchMap((result) => this.loadProfile().pipe(map(() => result))),
      );
  }

  /** Usado por el interceptor de refresh; no toca el signal de currentUser. */
  refreshTokens(): Observable<AuthTokens> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    return this.http
      .post<ApiEnvelope<AuthTokens>>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        map((res) => res.data),
        tap((tokens) => this.tokenStorage.setTokens(tokens)),
      );
  }

  loadProfile(): Observable<UserProfile> {
    return this.http.get<ApiEnvelope<UserProfile>>(`${environment.apiUrl}/users/me`).pipe(
      map((res) => res.data),
      tap((profile) => this._currentUser.set(profile)),
    );
  }

  activateUser(userId: string): Observable<UserProfile> {
    return this.http
      .patch<ApiEnvelope<UserProfile>>(`${environment.apiUrl}/users/${userId}/activate`, {})
      .pipe(map((res) => res.data));
  }

  deactivateUser(userId: string): Observable<UserProfile> {
    return this.http
      .patch<ApiEnvelope<UserProfile>>(`${environment.apiUrl}/users/${userId}/deactivate`, {})
      .pipe(map((res) => res.data));
  }

  logout(): void {
    this.tokenStorage.clear();
    this._currentUser.set(null);
  }
}
