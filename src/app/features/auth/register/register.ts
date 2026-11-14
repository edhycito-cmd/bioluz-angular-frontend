import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, email, form, maxLength, minLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { AuthService } from '../../../core/services/auth.service';
import { AppAuthShell } from '../../../layout/component/app.auth-shell';

interface RegisterModel {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink, ButtonModule, InputTextModule, MessageModule, AppAuthShell],
  templateUrl: './register.html',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly model = signal<RegisterModel>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  protected readonly registerForm = form(this.model, (path) => {
    required(path.name, { message: 'El nombre es obligatorio' });
    minLength(path.name, 2, { message: 'El nombre debe tener al menos 2 caracteres' });
    maxLength(path.name, 100, { message: 'El nombre no puede exceder 100 caracteres' });

    required(path.email, { message: 'El correo electrónico es obligatorio' });
    email(path.email, { message: 'Introduzca un correo electrónico válido' });

    required(path.password, { message: 'La contraseña es obligatoria' });
    minLength(path.password, 8, { message: 'La contraseña debe tener al menos 8 caracteres' });
    maxLength(path.password, 64, { message: 'La contraseña no puede tener más de 64 caracteres' });
    pattern(path.password, /[A-Z]/, { message: 'Debe incluir al menos una letra mayúscula' });
    pattern(path.password, /[a-z]/, { message: 'Debe incluir al menos una letra minúscula' });
    pattern(path.password, /[0-9]/, { message: 'Debe incluir al menos un número' });
    pattern(path.password, /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, {
      message: 'Debe incluir al menos un carácter especial',
    });
    validate(path.password, (ctx) =>
      /\s/.test(ctx.value())
        ? {
            kind: 'sinEspacios',
            message: 'La contraseña no puede contener espacios',
          }
        : undefined,
    );

    required(path.confirmPassword, { message: 'Confirme la contraseña' });
    validate(path.confirmPassword, (ctx) =>
      ctx.value() === ctx.valueOf(path.password)
        ? undefined
        : { kind: 'mismatch', message: 'Las contraseñas no coinciden' },
    );
  });

  protected readonly serverError = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);
  protected readonly mostrarConfirmacion = signal(false);

  protected alternarPassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  protected alternarConfirmacion(): void {
    this.mostrarConfirmacion.update((v) => !v);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);

    submit(this.registerForm, async () => {
      try {
        const { name, email: userEmail, password } = this.model();
        await firstValueFrom(this.authService.register({ name, email: userEmail, password }));
        await this.router.navigate(['/perfil']);
      } catch (error) {
        this.serverError.set(this.extractErrorMessage(error));
      }
      return undefined;
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(', ');
      if (typeof body?.message === 'string') return body.message;
    }
    return 'Se produjo un error inesperado. Intente nuevamente.';
  }
}
