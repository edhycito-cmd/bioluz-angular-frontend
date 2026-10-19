import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ButtonModule } from "@openng/optimus-ui/button";
import { MessageModule } from "@openng/optimus-ui/message";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-perfil-usuario",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, ButtonModule, MessageModule],
  templateUrl: "./perfil-usuario.html",
  styleUrl: "./perfil-usuario.scss",
})
export class PerfilUsuario {
  private readonly authService = inject(AuthService);

  protected readonly user = this.authService.currentUser;
  protected readonly persona = this.authService.persona;

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected recargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.authService.loadProfile().subscribe({
      next: () => this.cargando.set(false),
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(this.extractErrorMessage(error));
      },
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
    }
    return "No se pudo cargar el perfil. Intentá de nuevo.";
  }
}
