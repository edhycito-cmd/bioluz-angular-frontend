import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Tras recargar (o al abrir una pestaña nueva) el access token en memoria se
  // perdió. Se canjea la cookie HttpOnly de refresh por uno nuevo y se carga el
  // perfil antes de permitir la navegación.
  return authService.restoreSession().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
