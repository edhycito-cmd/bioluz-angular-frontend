import { User } from './user.model';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Coincide con AuthResult del backend (respuesta de /auth/register y /auth/login) */
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
