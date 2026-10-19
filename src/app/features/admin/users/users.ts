import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { HttpErrorResponse } from "@angular/common/http";
import { FormField, form, maxLength } from "@angular/forms/signals";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { ButtonModule } from "@openng/optimus-ui/button";
import { MessageModule } from "@openng/optimus-ui/message";
import { UsersService } from "../../../core/services/users.service";
import { AuthService } from "../../../core/services/auth.service";
import { UsuarioListado } from "../../../core/models/user.model";

@Component({
  selector: "app-users",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormField, InputTextModule, ButtonModule, MessageModule],
  templateUrl: "./users.html",
  styleUrl: "./users.scss",
})
export class Users {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);

  protected readonly pageSize = 10;
  protected readonly pagina = signal(1);
  protected readonly filtro = signal("");

  // Filtro de búsqueda con Signal Forms.
  protected readonly filtroModel = signal({ filtro: "" });
  protected readonly filtroForm = form(this.filtroModel, (path) => {
    maxLength(path.filtro, 100, { message: "El filtro no puede exceder 100 caracteres" });
  });

  /** Listado paginado; se recarga automáticamente al cambiar página o filtro. */
  protected readonly usuarios = rxResource({
    params: () => ({
      pagina: this.pagina(),
      limite: this.pageSize,
      filtro: this.filtro(),
    }),
    stream: ({ params }) => this.usersService.listar(params),
  });

  protected readonly accionOk = signal<string | null>(null);
  protected readonly accionError = signal<string | null>(null);

  protected aplicarFiltro(event: Event): void {
    event.preventDefault();
    this.accionOk.set(null);
    this.accionError.set(null);
    this.pagina.set(1);
    this.filtro.set(this.filtroModel().filtro.trim());
  }

  protected limpiarFiltro(): void {
    this.filtroModel.set({ filtro: "" });
    this.pagina.set(1);
    this.filtro.set("");
  }

  protected irAPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  protected cambiarEstado(item: UsuarioListado): void {
    this.accionOk.set(null);
    this.accionError.set(null);

    const activar = !item.user.esActivo;
    const peticion = activar
      ? this.authService.activateUser(item.user.id)
      : this.authService.deactivateUser(item.user.id);

    peticion.subscribe({
      next: () => {
        this.accionOk.set(
          `Usuario ${activar ? "activado" : "desactivado"}: ${item.user.email}`,
        );
        this.usuarios.reload();
      },
      error: (error: unknown) => this.accionError.set(this.extractErrorMessage(error)),
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403) return "No tenés permiso para gestionar usuarios.";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}
