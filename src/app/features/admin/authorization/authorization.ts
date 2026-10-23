import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { HasPermission } from '../../../core/directives/has-permission.directive';
import { PermissionAction, PermissionApp } from '../../../core/models/authorization.model';

interface RoleModel {
  userId: string;
  role: string;
}

interface PolicyModel {
  role: string;
  resource: string;
  action: string;
  app: PermissionApp;
}

const ETIQUETAS_ACCION: Readonly<Record<PermissionAction, string>> = {
  read: "Leer",
  update: "Actualizar",
  create: "Crear",
  delete: "Eliminar",
};

const ETIQUETAS_APP: Readonly<Record<PermissionApp, string>> = {
  backend: "Servidor",
  frontend: "Interfaz",
};

@Component({
  selector: 'app-authorization',
  imports: [FormField, HasPermission],
  templateUrl: './authorization.html',
  styleUrl: './authorization.scss',
})
export class Authorization {
  private readonly authorizationService = inject(AuthorizationService);

  /** Acciones Casbin de este módulo, para configurar los formularios de la página. */
  protected readonly permisos = inject(PermissionsService);

  /** Acciones concedidas por Casbin sobre la página (`/admin/authorization`). */
  protected readonly permisosPagina = computed(() =>
    [...this.permisos.acciones('/admin/authorization')].sort(),
  );

  /** Las mismas acciones, con sus etiquetas visibles en español. */
  protected readonly permisosPaginaVisibles = computed(() =>
    this.permisosPagina().map((accion) => this.etiquetaAccion(accion)),
  );

  // Ámbitos y acciones válidas según el backend (authorization.dto.ts).
  protected readonly appsDisponibles: PermissionApp[] = ['backend', 'frontend'];
  protected readonly accionesDisponibles: PermissionAction[] = [
    'read',
    'update',
    'create',
    'delete',
  ];

  // --- Asignación de roles ---
  protected readonly roleModel = signal<RoleModel>({ userId: '', role: '' });
  protected readonly roleForm = form(this.roleModel, (path) => {
    required(path.userId, { message: 'El ID de usuario es obligatorio' });
    required(path.role, { message: 'El rol es obligatorio' });
  });
  protected readonly roleMessage = signal<string | null>(null);
  protected readonly roleError = signal<string | null>(null);

  assignRole(event: Event): void {
    event.preventDefault();
    this.roleMessage.set(null);
    this.roleError.set(null);

    submit(this.roleForm, async () => {
      try {
        const payload = this.roleModel();
        await firstValueFrom(this.authorizationService.assignRole(payload));
        this.roleMessage.set(`Rol "${payload.role}" asignado a ${payload.userId}`);
      } catch (error) {
        this.roleError.set(this.extractErrorMessage(error));
      }
      return undefined;
    });
  }

  revokeRole(event: Event): void {
    event.preventDefault();
    this.roleMessage.set(null);
    this.roleError.set(null);

    submit(this.roleForm, async () => {
      try {
        const payload = this.roleModel();
        await firstValueFrom(this.authorizationService.revokeRole(payload));
        this.roleMessage.set(`Rol "${payload.role}" revocado a ${payload.userId}`);
      } catch (error) {
        this.roleError.set(this.extractErrorMessage(error));
      }
      return undefined;
    });
  }

  // --- Políticas (recurso + acción por rol) ---
  protected readonly policyModel = signal<PolicyModel>({
    role: '',
    resource: '',
    action: '',
    app: 'backend',
  });
  protected readonly policyForm = form(this.policyModel, (path) => {
    required(path.role, { message: 'El rol es obligatorio' });
    required(path.resource, { message: 'El recurso es obligatorio' });
    required(path.action, { message: 'La acción es obligatoria' });
  });
  protected readonly policyMessage = signal<string | null>(null);
  protected readonly policyError = signal<string | null>(null);

  addPolicy(event: Event): void {
    event.preventDefault();
    this.policyMessage.set(null);
    this.policyError.set(null);

    submit(this.policyForm, async () => {
      try {
        const payload = this.policyModel();
        await firstValueFrom(this.authorizationService.addPolicy(payload));
        this.policyMessage.set(
          `Política agregada: ${payload.role} puede "${this.etiquetaAccion(payload.action)}" sobre ${payload.resource}`,
        );
      } catch (error) {
        this.policyError.set(this.extractErrorMessage(error));
      }
      return undefined;
    });
  }

  removePolicy(event: Event): void {
    event.preventDefault();
    this.policyMessage.set(null);
    this.policyError.set(null);

    submit(this.policyForm, async () => {
      try {
        const payload = this.policyModel();
        await firstValueFrom(this.authorizationService.removePolicy(payload));
        this.policyMessage.set(
          `Política eliminada: ${payload.role} / ${payload.resource} / ${this.etiquetaAccion(payload.action)}`,
        );
      } catch (error) {
        this.policyError.set(this.extractErrorMessage(error));
      }
      return undefined;
    });
  }

  protected etiquetaAccion(accion: string): string {
    return ETIQUETAS_ACCION[accion as PermissionAction] ?? accion;
  }

  protected etiquetaApp(app: PermissionApp): string {
    return ETIQUETAS_APP[app] ?? app;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(', ');
      if (typeof body?.message === 'string') return body.message;
      if (error.status === 403) return 'No tenés permiso para gestionar autorización.';
    }
    return 'Ocurrió un error inesperado. Intentá de nuevo.';
  }
}
