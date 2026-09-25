import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { AuthorizationService } from '../../../core/services/authorization.service';

interface RoleModel {
  userId: string;
  role: string;
}

interface PolicyModel {
  role: string;
  resource: string;
  action: string;
}

@Component({
  selector: 'app-authorization',
  standalone: true,
  imports: [FormField],
  templateUrl: './authorization.component.html',
  styleUrl: './authorization.component.scss',
})
export class AuthorizationComponent {
  private readonly authorizationService = inject(AuthorizationService);

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

  // --- Policies (recurso + acción por rol) ---
  protected readonly policyModel = signal<PolicyModel>({ role: '', resource: '', action: '' });
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
          `Policy agregada: ${payload.role} puede "${payload.action}" sobre ${payload.resource}`,
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
          `Policy eliminada: ${payload.role} / ${payload.resource} / ${payload.action}`,
        );
      } catch (error) {
        this.policyError.set(this.extractErrorMessage(error));
      }
      return undefined;
    });
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
