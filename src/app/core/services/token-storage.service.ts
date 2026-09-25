import { Injectable } from '@angular/core';
import { AuthTokens } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'ncl_access_token';
const REFRESH_TOKEN_KEY = 'ncl_refresh_token';

/**
 * Encapsula el acceso a localStorage para los tokens. Mantenerlo en un único
 * servicio permite cambiar la estrategia de persistencia (ej. cookies httpOnly
 * servidas por un BFF) sin tocar el resto de la app.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  hasSession(): boolean {
    return this.getRefreshToken() !== null;
  }
}
