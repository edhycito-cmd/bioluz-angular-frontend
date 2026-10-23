import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, from, switchMap, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import { PermissionsService } from './permissions.service';
import { GoogleSignInService } from './google-signin.service';
import {
  ApiEnvelope,
  AuthResult,
  AuthTokens,
  GoogleLoginPayload,
  LoginPayload,
  RegisterPayload,
} from '../models/auth.model';
import { UserProfile, UserProfileResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly permissions = inject(PermissionsService);
  private readonly googleSignIn = inject(GoogleSignInService);

  /** Perfil completo (usuario + persona) del usuario autenticado. null si no hay sesión. */
  private readonly _profile = signal<UserProfileResult | null>(null);
  readonly profile = this._profile.asReadonly();

  /** Datos públicos del usuario autenticado. null si no hay sesión (o aún no se cargó). */
  readonly currentUser = computed<UserProfile | null>(() => this._profile()?.user ?? null);

  /** Persona asociada al usuario (puede no existir). null si no hay sesión o no tiene persona. */
  readonly persona = computed(() => this._profile()?.persona ?? null);

  /** true una vez que hay un usuario cargado en memoria. */
  readonly isAuthenticated = computed(() => this._profile() !== null);

  register(payload: RegisterPayload): Observable<AuthResult> {
    return this.http
      .post<ApiEnvelope<AuthResult>>(
        `${environment.apiUrl}/auth/register`,
        payload,
        { withCredentials: true },
      )
      .pipe(
        map((res) => res.data),
        tap((result) => this.startSession(result)),
        switchMap((result) => this.loadProfile().pipe(map(() => result))),
      );
  }

  login(payload: LoginPayload): Observable<AuthResult> {
    return this.http
      .post<ApiEnvelope<AuthResult>>(
        `${environment.apiUrl}/auth/login`,
        payload,
        { withCredentials: true },
      )
      .pipe(
        map((res) => res.data),
        tap((result) => this.startSession(result)),
        switchMap((result) => this.loadProfile().pipe(map(() => result))),
      );
  }

  /**
   * Login con Google (Identity Services): valida el ID token en el backend.
   * El refresh token queda en cookie HttpOnly; el access token en memoria.
   */
  loginWithGoogle(payload: GoogleLoginPayload): Observable<AuthResult> {
    return this.http
      .post<ApiEnvelope<AuthResult>>(
        `${environment.apiUrl}/auth/google`,
        payload,
        { withCredentials: true },
      )
      .pipe(
        map((res) => res.data),
        tap((result) => this.startSession(result)),
        switchMap((result) => this.loadProfile().pipe(map(() => result))),
      );
  }

  /**
   * Retorno del flujo OAuth redirect de Google: el backend dejó la sesión en
   * una cookie HttpOnly. No hay tokens en la URL; se canjea la cookie por un
   * access token nuevo y se carga el perfil.
   */
  completeGoogleRedirect(): Observable<UserProfile> {
    return this.restoreSession();
  }

  /**
   * Rehidrata la sesión al recargar o abrir una pestaña nueva. Si no existe
   * cookie de refresh válida, el observable falla y el guard manda a /login.
   */
  restoreSession(): Observable<UserProfile> {
    return this.refreshTokens().pipe(switchMap(() => this.loadProfile()));
  }

  /** Deja el estado de sesión anterior limpio antes de cargar uno nuevo. */
  private startSession(tokens: AuthTokens): void {
    this._profile.set(null);
    this.permissions.clear();
    this.tokenStorage.setAccessToken(tokens.accessToken);
  }

  /** Canjea la cookie HttpOnly por un nuevo access token y rota el refresh. */
  refreshTokens(): Observable<AuthTokens> {
    const request$ = this.http
      .post<ApiEnvelope<AuthTokens>>(
        `${environment.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((res) => res.data),
        tap((tokens) => this.tokenStorage.setAccessToken(tokens.accessToken)),
      );

    // El refresh token se rota en cada uso. Si dos pestañas refrescan a la vez
    // con la misma cookie, la segunda usaría un token ya rotado y el backend
    // revocaría la sesión por posible reuso. Web Locks serializa el refresh
    // entre pestañas del mismo navegador (HTTPS/localhost).
    const locks = (
      globalThis.navigator as
        | (Navigator & {
            locks?: {
              request<T>(name: string, callback: () => Promise<T>): Promise<T>;
            };
          })
        | undefined
    )?.locks;

    if (!locks?.request) {
      return request$;
    }

    return from(
      locks.request('muspa-auth-refresh', () => firstValueFrom(request$)),
    );
  }

  loadProfile(): Observable<UserProfile> {
    return this.http
      .get<ApiEnvelope<UserProfileResult>>(`${environment.apiUrl}/usuario/perfil`)
      .pipe(
        map((res) => res.data),
        tap((profile) => this._profile.set(profile)),
        // Casbin (frontend): encadenado (no fire-and-forget), igual que el
        // perfil, para que guards/directivas de permisos no lean estado a medio camino.
        switchMap((profile) => this.permissions.ensureLoaded().pipe(map(() => profile))),
        map((profile) => profile.user),
      );
  }

  activateUser(userId: string): Observable<UserProfile> {
    return this.http
      .patch<ApiEnvelope<UserProfile>>(`${environment.apiUrl}/usuario/${userId}/activate`, {})
      .pipe(map((res) => res.data));
  }

  deactivateUser(userId: string): Observable<UserProfile> {
    return this.http
      .patch<ApiEnvelope<UserProfile>>(`${environment.apiUrl}/usuario/${userId}/deactivate`, {})
      .pipe(map((res) => res.data));
  }

  /**
   * Limpia el estado local de inmediato y pide al backend revocar la sesión y
   * borrar la cookie HttpOnly. No se espera la respuesta para no bloquear la UI;
   * si falla la red, el access token local ya quedó inutilizable.
   */
  logout(): void {
    this.clearLocalSession();

    this.http
      .post<ApiEnvelope<{ message: string }>>(
        `${environment.apiUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .subscribe({ error: () => undefined });
  }

  private clearLocalSession(): void {
    this.tokenStorage.clear();
    this._profile.set(null);
    // Descarta las acciones Casbin de la sesión cerrada.
    this.permissions.clear();
    // Evita que Google reutilice el estado de auto-selección de la cuenta.
    this.googleSignIn.disableAutoSelect();
  }
}
