import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
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
      .post<ApiEnvelope<AuthResult>>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(
        map((res) => res.data),
        tap((result) => this.startSession(result)),
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
        tap((result) => this.startSession(result)),
        switchMap((result) => this.loadProfile().pipe(map(() => result))),
      );
  }

  /**
   * Login con Google (Identity Services): valida el ID token en el backend
   * y continúa igual que login(): guarda tokens y carga perfil + permisos.
   */
  loginWithGoogle(payload: GoogleLoginPayload): Observable<AuthResult> {
    return this.http
      .post<ApiEnvelope<AuthResult>>(`${environment.apiUrl}/auth/google`, payload)
      .pipe(
        map((res) => res.data),
        tap((result) => this.startSession(result)),
        switchMap((result) => this.loadProfile().pipe(map(() => result))),
      );
  }

  /**
   * Cierra la sesión iniciada por el flujo OAuth redirect: el backend redirige
   * a `/auth/callback` con los tokens en la query. El componente de callback
   * los entrega acá, se guardan y se carga el perfil antes de navegar.
   */
  completeGoogleRedirect(tokens: AuthTokens): Observable<UserProfile> {
    this.startSession(tokens);
    return this.loadProfile();
  }

  /** Deja el estado de sesión anterior limpio antes de cargar uno nuevo. */
  private startSession(tokens: AuthTokens): void {
    this._profile.set(null);
    this.permissions.clear();
    this.tokenStorage.setTokens(tokens);
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

  logout(): void {
    this.tokenStorage.clear();
    this._profile.set(null);
    // Descarta las acciones Casbin de la sesión cerrada.
    this.permissions.clear();
    // Evita que Google reutilice el estado de auto-selección de la cuenta.
    this.googleSignIn.disableAutoSelect();
  }
}
