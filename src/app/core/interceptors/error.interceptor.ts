import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

// Estado a nivel de módulo (el interceptor funcional no es una clase instanciable,
// así que esto actúa como singleton compartido entre todas las requests de la app).
let isRefreshing = false;
const refreshedAccessToken$ = new BehaviorSubject<string | null>(null);

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const isPublicAuthCall = PUBLIC_PATHS.some((path) => req.url.includes(path));

      // Solo nos interesa reaccionar a 401 en endpoints protegidos.
      if (error.status !== 401 || isPublicAuthCall) {
        return throwError(() => error);
      }

      if (!tokenStorage.getRefreshToken()) {
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (isRefreshing) {
        // Ya hay un refresh en vuelo (por otra request en paralelo): esperar
        // su resultado y reintentar esta request con el token nuevo.
        return refreshedAccessToken$.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((token) => next(withToken(req, token))),
        );
      }

      isRefreshing = true;
      refreshedAccessToken$.next(null);

      return authService.refreshTokens().pipe(
        switchMap(({ accessToken }) => {
          isRefreshing = false;
          refreshedAccessToken$.next(accessToken);
          return next(withToken(req, accessToken));
        }),
        catchError((refreshError: unknown) => {
          isRefreshing = false;
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
