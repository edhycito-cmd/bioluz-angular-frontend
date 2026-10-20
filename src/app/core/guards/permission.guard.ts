import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PermissionsService } from '../services/permissions.service';

/**
 * Guard de autorización Casbin: exige acción `read` (`app = 'frontend'`) sobre
 * el path de la ruta de destino, según las reglas del backend.
 *
 * El árbol de menús solo lee menús con `read`, pero no evita el acceso directo
 * por URL (tecleando la dirección); este guard cierra ese hueco. Aplicarlo solo
 * a rutas declaradas como menús en el backend — para todo lo demás se apoya en
 * deny-by-default del `PermissionsService`.
 */
export const permissionGuard: CanActivateFn = (_route, state) => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  return permissions.can(state.url, 'read')
    ? true
    : router.createUrlTree(['/dashboard']);
};
