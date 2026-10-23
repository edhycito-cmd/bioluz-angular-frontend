import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, share } from 'rxjs/operators';
import { MenuService } from './menu.service';
import { MenuArbolItem } from '../models/menu.model';

/**
 * Permisos Casbin del usuario autenticado, en el ámbito `frontend`.
 *
 * Única fuente de datos: `GET /menus/arbol`. El backend ya consulta Casbin
 * (reglas `app = 'frontend'` de la tabla `casbin_rule`), resuelve los roles del
 * usuario (`g`, userId → rol) y entrega cada nodo del árbol con las acciones
 * permitidas (`read`, `update`, `create`, `delete`), descartando los menús sin `read`.
 *
 * Los recursos son los `path` de los menús (ej. `/admin/usuarios`), que el
 * backend mantiene sincronizados con las rutas del frontend vía seeds.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly menuService = inject(MenuService);

  /** Mapa recurso (path de menú normalizado) → acciones del usuario. */
  private readonly _accionesPorRecurso = signal<ReadonlyMap<string, ReadonlySet<string>>>(new Map());

  /** `true` una vez cargadas las acciones de la sesión (o tras un fallo, con mapa vacío). */
  private readonly _loaded = signal(false);

  /** Carga en vuelo, compartida para que varias consultas concurrentes hagan un solo GET. */
  private inFlight?: Observable<boolean>;

  readonly loaded = this._loaded.asReadonly();
  readonly accionesPorRecurso = this._accionesPorRecurso.asReadonly();

  /**
   * Carga las acciones una sola vez por sesión. Encadenarla después de
   * `loadProfile()` (ver `AuthService`) garantiza que guards y directivas
   * no lean permisos a medio camino.
   */
  ensureLoaded(): Observable<boolean> {
    if (this._loaded()) return of(true);
    this.inFlight ??= this.menuService.obtenerArbol().pipe(
      map((arbol) => {
        this._accionesPorRecurso.set(this.extraerAcciones(arbol));
        return true;
      }),
      // El árbol es la única fuente de permisos: ante un fallo quedamos
      // "cargado" con permisos vacíos (deny-by-default).
      catchError((error: unknown) => {
        console.warn('[Permissions] No se pudo cargar el árbol de menús', error);
        return of(false);
      }),
      finalize(() => (this.inFlight = undefined)),
      share(),
    );
    return this.inFlight;
  }

  /** Refresca las acciones (útil tras cambiar la propia asignación de rol). */
  reload(): Observable<boolean> {
    this._loaded.set(false);
    this.inFlight = undefined;
    return this.ensureLoaded();
  }

  /** Limpia el estado (logout / expiración de sesión). */
  clear(): void {
    this.inFlight = undefined;
    this._accionesPorRecurso.set(new Map());
    this._loaded.set(false);
  }

  /** Acciones concedidas sobre un recurso. Vacío si no hay regla o no se cargó. */
  acciones(resource: string): ReadonlySet<string> {
    return this._accionesPorRecurso().get(this.normalizar(resource)) ?? new Set();
  }

  /**
   * `true` si el usuario tiene TODAS las acciones pedidas sobre el recurso.
   * Los compartidos heredados del backend (`*` / `manage`) ya vienen expandidos
   * a las acciones concretas, así que basta comparar contra el set.
   */
  can(resource: string, ...acciones: readonly string[]): boolean {
    const concedidas = this.acciones(resource);
    if (concedidas.size === 0) return false;
    if (acciones.length === 0) return true;
    return acciones.every((accion) => concedidas.has(accion));
  }

  /** Recorre el árbol; cada nodo solo llega acá si el usuario tiene `read`. */
  private extraerAcciones(nodos: MenuArbolItem[]): Map<string, ReadonlySet<string>> {
    const resultado = new Map<string, ReadonlySet<string>>();
    const recorrer = (items: MenuArbolItem[]): void => {
      for (const nodo of items) {
        resultado.set(this.normalizar(nodo.path), new Set(nodo.acciones ?? []));
        recorrer(nodo.items);
      }
    };
    recorrer(nodos);
    return resultado;
  }

  /** Quita query/hash y slashes finales para que la comparación con el `path` sea exacta. */
  private normalizar(ruta: string): string {
    const base = ruta.split(/[?#]/)[0];
    return base.length > 1 ? base.replace(/\/+$/, '') : base;
  }
}
