import { Directive, EmbeddedViewRef, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';

/**
 * Directiva estructural para configurar acciones de Casbin en la UI.
 *
 * Consulta las reglas `frontend` del usuario (cargadas por
 * `PermissionsService` desde el backend) y solo monta el bloque si el usuario
 * tiene TODAS las acciones indicadas sobre el recurso. `deny-by-default`:
 * sin regla, sin cargar o sin acción → el bloque no se renderiza.
 *
 * El recurso por defecto es la URL actual (el `path` del menú que el backend
 * usa como recurso de las reglas Casbin); se puede acotar con
 * `[appHasPermissionResource]`.
 *
 * Uso:
 * ```html
 * <!-- update sobre la página actual -->
 * <button *appHasPermission="'update'" (click)="activar()">...</button>
 *
 * <!-- varias acciones -->
 * <button *appHasPermission="'create|update'">...</button>
 *
 * <!-- recurso explícito -->
 * <div *appHasPermission="'create'" [appHasPermissionResource]="'/admin/usuarios'">...</div>
 * ```
 */
@Directive({ selector: '[appHasPermission]' })
export class HasPermission {
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissions = inject(PermissionsService);
  private readonly router = inject(Router);

  /** Acciones requeridas: `"'create'"`, `"'create|update'"` o `['create', 'update']`. */
  readonly appHasPermission = input.required<string | string[]>();

  /** Recurso Casbin (path de menú); vacío = URL de la ruta actual. */
  readonly appHasPermissionResource = input<string | undefined>(undefined);

  private vista?: EmbeddedViewRef<unknown>;

  constructor() {
    // Reactivo: reevalúa si cambian las acciones (reload/clear) o los inputs.
    effect(() => {
      const pedido = this.appHasPermission();
      const recurso = this.appHasPermissionResource() ?? this.router.url;
      const accionesRequeridas = (Array.isArray(pedido) ? pedido : pedido.split('|'))
        .map((accion) => accion.trim())
        .filter(Boolean);

      const permitido =
        accionesRequeridas.length > 0 && this.permissions.can(recurso, ...accionesRequeridas);

      if (permitido) {
        if (!this.vista) this.vista = this.viewContainer.createEmbeddedView(this.templateRef);
        // No-op si ya está attachada; restaura la detección de cambios si estaba detachada.
        this.vista.reattach();
      } else {
        this.vista?.detach();
      }
    });
  }
}
