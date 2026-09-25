import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // El signal puede estar vacío tras un reload aunque exista un refresh token
  // válido en localStorage. Intentamos rehidratar antes de mandar a /login.
  if (!tokenStorage.hasSession()) {
    return router.createUrlTree(['/login']);
  }

  return authService.loadProfile().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
