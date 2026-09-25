import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

/** Endpoints que no requieren (ni deben llevar) el access token actual. */
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const isPublicAuthCall = PUBLIC_PATHS.some((path) => req.url.includes(path));
  const token = tokenStorage.getAccessToken();

  if (!token || isPublicAuthCall) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
