import { User } from './user.model';

/**
 * Respuesta de /auth/login, /auth/register, /auth/google y /auth/refresh.
 * El refresh token no se expone al JavaScript: viaja en una cookie HttpOnly.
 */
export interface AuthTokens {
  accessToken: string;
  rememberMe: boolean;
}

/** Coincide con PublicAuthResult del backend (login/registro/Google). */
export interface AuthResult extends AuthTokens {
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

/** Coincide con googleCredentialSchema del backend (POST /auth/google) */
export interface GoogleLoginPayload {
  /** ID token (JWT) que entrega el botón oficial de Google Identity Services. */
  credential: string;
  /** Desafío anti-replay incluido como claim `nonce` del ID token. */
  nonce: string;
  /** Persistir la sesión (cookie de larga duración) o no. */
  rememberMe: boolean;
}

/** Envoltorio de respuesta que agrega el ResponseInterceptor global del backend */
export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

/** Forma del error que arma el HttpExceptionFilter global del backend */
export interface ApiErrorBody {
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
}
