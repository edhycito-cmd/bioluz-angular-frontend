import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import {
  FormField,
  form,
  maxLength,
  minLength,
  pattern,
  required,
  submit,
  validate,
} from "@angular/forms/signals";
import { ButtonModule } from "@openng/optimus-ui/button";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { MessageModule } from "@openng/optimus-ui/message";
import { AuthService } from "../../../core/services/auth.service";
import { UsersService } from "../../../core/services/users.service";

interface CambiarContrasenaModel {
  currentPassword: string;
  newPassword: string;
  verifyPassword: string;
}

@Component({
  selector: "app-perfil-usuario",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    DatePipe,
    FormField,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
  templateUrl: "./perfil-usuario.html",
  styleUrl: "./perfil-usuario.scss",
})
export class PerfilUsuario {
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);

  protected readonly user = this.authService.currentUser;
  protected readonly persona = this.authService.persona;

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly passwordModel = signal<CambiarContrasenaModel>({
    currentPassword: "",
    newPassword: "",
    verifyPassword: "",
  });

  protected readonly passwordForm = form(this.passwordModel, (path) => {
    required(path.currentPassword, {
      message: "La contraseña actual es obligatoria",
    });

    required(path.newPassword, {
      message: "La nueva contraseña es obligatoria",
    });
    minLength(path.newPassword, 8, {
      message: "La contraseña debe tener al menos 8 caracteres",
    });
    maxLength(path.newPassword, 64, {
      message: "La contraseña no puede tener más de 64 caracteres",
    });
    pattern(path.newPassword, /[a-z]/, {
      message: "Debe incluir al menos una minúscula",
    });
    pattern(path.newPassword, /[A-Z]/, {
      message: "Debe incluir al menos una mayúscula",
    });
    pattern(path.newPassword, /[0-9]/, {
      message: "Debe incluir al menos un número",
    });
    pattern(path.newPassword, /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, {
      message: "Debe incluir al menos un carácter especial",
    });
    validate(path.newPassword, (ctx) =>
      /\s/.test(ctx.value())
        ? {
            kind: "sinEspacios",
            message: "La contraseña no puede contener espacios",
          }
        : undefined,
    );

    required(path.verifyPassword, {
      message: "Verificá la nueva contraseña",
    });
    validate(path.verifyPassword, (ctx) =>
      ctx.value() === ctx.valueOf(path.newPassword)
        ? undefined
        : {
            kind: "mismatch",
            message: "Las contraseñas no coinciden",
          },
    );
  });

  protected readonly guardandoPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordGuardada = signal(false);

  protected readonly mostrarActual = signal(false);
  protected readonly mostrarNueva = signal(false);
  protected readonly mostrarVerificacion = signal(false);

  protected alternarActual(): void {
    this.mostrarActual.update((visible) => !visible);
  }

  protected alternarNueva(): void {
    this.mostrarNueva.update((visible) => !visible);
  }

  protected alternarVerificacion(): void {
    this.mostrarVerificacion.update((visible) => !visible);
  }

  protected recargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.authService.loadProfile().subscribe({
      next: () => this.cargando.set(false),
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(
          this.extractErrorMessage(
            error,
            "No se pudo cargar el perfil. Intentá de nuevo.",
          ),
        );
      },
    });
  }

  protected onSubmitPassword(event: Event): void {
    event.preventDefault();
    if (this.guardandoPassword()) return;

    this.passwordError.set(null);
    this.passwordGuardada.set(false);

    submit(this.passwordForm, async () => {
      const { currentPassword, newPassword } = this.passwordModel();

      this.guardandoPassword.set(true);
      try {
        await firstValueFrom(
          this.usersService.cambiarContrasena({
            currentPassword,
            newPassword,
          }),
        );
        this.passwordGuardada.set(true);
        this.mostrarActual.set(false);
        this.mostrarNueva.set(false);
        this.mostrarVerificacion.set(false);
        this.passwordForm().reset({
          currentPassword: "",
          newPassword: "",
          verifyPassword: "",
        });
      } catch (error: unknown) {
        this.passwordError.set(
          this.extractErrorMessage(
            error,
            "No se pudo cambiar la contraseña. Intentá de nuevo.",
          ),
        );
      } finally {
        this.guardandoPassword.set(false);
      }
      return undefined;
    });
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
    }
    return fallback;
  }
}
