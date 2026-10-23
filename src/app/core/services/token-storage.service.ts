import { Injectable, signal } from '@angular/core';

/**
 * El access token vive únicamente en memoria. Al recargar la página se
 * recupera mediante el refresh token HttpOnly que administra el backend.
 *
 * Esto evita dejar credenciales persistentes en `localStorage`/`sessionStorage`,
 * donde un XSS podría exfiltrarlas. El refresh token nunca es accesible desde JS.
 */
const LEGACY_TOKEN_KEYS = ['ncl_access_token', 'ncl_refresh_token'];

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly _accessToken = signal<string | null>(null);

  constructor() {
    // Limpieza de migración: versiones anteriores guardaban los tokens en
    // localStorage. Al desplegar esta versión hay que borrarlos para que no
    // queden credenciales expuestas a XSS.
    try {
      for (const key of LEGACY_TOKEN_KEYS) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    } catch {
      // Storage deshabilitado (modo privado, políticas del navegador): no aplica.
    }
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  setAccessToken(accessToken: string): void {
    this._accessToken.set(accessToken);
  }

  clear(): void {
    this._accessToken.set(null);
  }

  hasToken(): boolean {
    return this._accessToken() !== null;
  }
}
