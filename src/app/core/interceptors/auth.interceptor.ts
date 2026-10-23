import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

/** Endpoints que no requieren (ni deben llevar) el access token actual. */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/unlock',
  '/auth/request-unlock',
  '/auth/google',
];

function isPublicAuthCall(url: string): boolean {
  const path = url.split('?')[0];
  return PUBLIC_PATHS.some((publicPath) => path.endsWith(publicPath));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const isPublic = isPublicAuthCall(req.url);
  const token = tokenStorage.getAccessToken();

  if (!token || isPublic) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
