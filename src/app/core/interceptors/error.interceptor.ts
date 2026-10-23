import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

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

// Un único refresh en vuelo para todas las peticiones concurrentes de la app.
// Es un Observable compartido (no un BehaviorSubject): si el refresh falla,
// TODAS las peticiones en espera reciben el error y terminan; no quedan colgadas.
let refreshRequest$: Observable<string> | null = null;
let redirectingToLogin = false;

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  function endSession(): void {
    if (redirectingToLogin) return;
    redirectingToLogin = true;
    authService.logout();
    void router.navigate(['/login']).finally(() => {
      redirectingToLogin = false;
    });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const isPublic = isPublicAuthCall(req.url);

      // Solo nos interesa reaccionar a 401 en endpoints protegidos.
      if (error.status !== 401 || isPublic) {
        return throwError(() => error);
      }

      refreshRequest$ ??= authService.refreshTokens().pipe(
        map((tokens) => tokens.accessToken),
        finalize(() => {
          refreshRequest$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

      return refreshRequest$.pipe(
        catchError((refreshError: unknown) => {
          endSession();
          return throwError(() => refreshError);
        }),
        // Solo se reintenta cuando el refresh fue exitoso. Si el reintento
        // vuelve a fallar, el error se propaga sin otro ciclo de refresh.
        switchMap((accessToken) => next(withToken(req, accessToken))),
      );
    }),
  );
};
