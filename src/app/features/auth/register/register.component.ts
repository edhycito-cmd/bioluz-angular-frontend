import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, email, form, minLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { AuthService } from '../../../core/services/auth.service';

interface RegisterModel {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormField, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
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

    required(path.email, { message: 'El email es obligatorio' });
    email(path.email, { message: 'Ingresá un email válido' });

    required(path.password, { message: 'La contraseña es obligatoria' });
    minLength(path.password, 8, { message: 'La contraseña debe tener al menos 8 caracteres' });
    pattern(path.password, /[A-Z]/, { message: 'Debe incluir al menos una mayúscula' });
    pattern(path.password, /[a-z]/, { message: 'Debe incluir al menos una minúscula' });
    pattern(path.password, /[0-9]/, { message: 'Debe incluir al menos un número' });
    pattern(path.password, /[^A-Za-z0-9]/, {
      message: 'Debe incluir al menos un carácter especial',
    });

    required(path.confirmPassword, { message: 'Confirmá la contraseña' });
    validate(path.confirmPassword, (ctx) =>
      ctx.value() === ctx.valueOf(path.password)
        ? undefined
        : { kind: 'mismatch', message: 'Las contraseñas no coinciden' },
    );
  });

  protected readonly serverError = signal<string | null>(null);

  onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);

    submit(this.registerForm, async () => {
      try {
        const { name, email: userEmail, password } = this.model();
        await firstValueFrom(this.authService.register({ name, email: userEmail, password }));
        await this.router.navigate(['/dashboard']);
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
    return 'Ocurrió un error inesperado. Intentá de nuevo.';
  }
}
