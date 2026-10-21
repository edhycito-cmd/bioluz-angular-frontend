import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { forkJoin } from "rxjs";
import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { MessageService, ConfirmationService } from "@openng/optimus-ui/api";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ToastModule } from "@openng/optimus-ui/toast";
import { ToolbarModule } from "@openng/optimus-ui/toolbar";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { SelectModule } from "@openng/optimus-ui/select";
import { DatePickerModule } from "@openng/optimus-ui/datepicker";
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { MessageModule } from "@openng/optimus-ui/message";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { UsersService } from "../../../core/services/users.service";
import { RolesService } from "../../../core/services/roles.service";
import { RolesUsuariosService } from "../../../core/services/roles-usuarios.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";
import { UsuarioListado } from "../../../core/models/user.model";
import { Rol } from "../../../core/models/rol.model";
import { RolUsuario } from "../../../core/models/rol-usuario.model";

/** Fila aplanada del listado, para ordenamiento/filtro global con p-table. */
interface UsuarioOption {
  id: string;
  label: string;
}

interface RolOption {
  id: string;
  label: string;
}

interface RolUsuarioRow {
  id: string;
  idUsuario: string;
  idRol: string;
  usuario: string;
  email: string;
  rol: string;
  fechaInicio: string;
  estado: "ACTIVO" | "REVOCADO";
  esActivo: boolean;
}

@Component({
  selector: "app-roles-usuarios",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    DialogModule,
    MessageModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    DatePipe,
    HasPermission,
  ],
  templateUrl: "./roles-usuarios.html",
  styleUrl: "./roles-usuarios.scss",
  providers: [MessageService, ConfirmationService],
})
export class RolesUsuarios {
  private readonly rolesUsuariosService = inject(RolesUsuariosService);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  /** Columnas para exportar a CSV (molde sparked pages/crud). */
  protected readonly cols = [
    { field: "usuario", header: "Usuario" },
    { field: "email", header: "Email" },
    { field: "rol", header: "Rol" },
    { field: "fechaInicio", header: "Fecha inicio" },
    { field: "estado", header: "Estado" },
  ];

  /** Asignaciones rol↔usuario. */
  protected readonly asignaciones = rxResource({
    stream: () => this.rolesUsuariosService.listar({ limite: 100, pagina: 1 }),
  });

  /** Catálogo de usuarios (para el select del dialog y para rotular filas). */
  protected readonly usuarios = rxResource({
    stream: () => this.usersService.listar({ limite: 100, pagina: 1 }),
  });

  /** Catálogo de roles (para el select del dialog y para rotular filas). */
  protected readonly roles = rxResource({
    stream: () => this.rolesService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly usuarioOptions = computed<UsuarioOption[]>(() => {
    const items = this.usuarios.value()?.items ?? [];
    return items
      .filter((item): item is UsuarioListadoConPersona => item.persona !== null)
      .map((item) => ({
        id: item.user.id,
        label: `${nombreCompleto(item.persona)} — ${item.user.email}`,
      }));
  });

  protected readonly rolOptions = computed<RolOption[]>(() => {
    const resultado = this.roles.value();
    if (!resultado) return [];
    return resultado.items.map((rol) => ({
      id: rol.id,
      label: `${rol.rol} — ${rol.descripcion}`,
    }));
  });

  protected readonly filas = computed<RolUsuarioRow[] | undefined>(() => {
    const resultado = this.asignaciones.value();
    if (resultado === undefined) return undefined;

    const usuariosPorId = new Map(this.usuarios.value()?.items.map((u) => [u.user.id, u]) ?? []);
    const rolesPorId = new Map(this.roles.value()?.items.map((r) => [r.id, r]) ?? []);

    return resultado.items.map((asignacion) => ({
      ...aFila(asignacion, usuariosPorId, rolesPorId),
    }));
  });

  /** Estado del CRUD (molde sparked pages/crud). */
  protected asignacionDialog = false;
  protected submitted = false;
  protected guardando = false;
  protected revocando = false;
  protected seleccionados: RolUsuarioRow[] | null = null;
  protected asignacion: AsignacionModel = asignacionVacia();
  protected esNueva = false;

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.asignacion = asignacionVacia();
    this.esNueva = true;
    this.submitted = false;
    this.asignacionDialog = true;
  }

  protected editAsignacion(row: RolUsuarioRow): void {
    this.asignacion = {
      id: row.id,
      idUsuario: row.idUsuario,
      idRol: row.idRol,
      fechaInicio: new Date(row.fechaInicio),
    };
    this.esNueva = false;
    this.submitted = false;
    this.asignacionDialog = true;
  }

  protected hideDialog(): void {
    this.asignacionDialog = false;
    this.submitted = false;
  }

  protected saveAsignacion(): void {
    this.submitted = true;

    if (this.esNueva && (!this.asignacion.idUsuario || !this.asignacion.idRol)) return;

    this.guardando = true;
    const fechaInicio = this.asignacion.fechaInicio?.toISOString();

    if (this.esNueva) {
      this.rolesUsuariosService
        .asignar({
          idUsuario: this.asignacion.idUsuario as string,
          idRol: this.asignacion.idRol as string,
          fechaInicio: fechaInicio ?? undefined,
        })
        .subscribe({
          next: (asignada) => {
            this.guardando = false;
            this.asignacionDialog = false;
            this.submitted = false;
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Rol asignado al usuario ${this.nombreDeUsuario(asignada.idUsuario)}`,
              life: 3000,
            });
            this.asignacion = asignacionVacia();
            this.asignaciones.reload();
          },
          error: (error: unknown) => {
            this.guardando = false;
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: this.extractErrorMessage(error),
              life: 5000,
            });
          },
        });
      return;
    }

    const patch: { fechaInicio?: string } = {};
    if (fechaInicio) patch.fechaInicio = fechaInicio;

    this.rolesUsuariosService.actualizar(this.asignacion.id as string, patch).subscribe({
      next: (actualizada) => {
        this.guardando = false;
        this.asignacionDialog = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación exitosa",
          detail: `Asignación de rol actualizada (${actualizada.id.slice(0, 8)}…)`,
          life: 3000,
        });
        this.asignacion = asignacionVacia();
        this.asignaciones.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: this.extractErrorMessage(error),
          life: 5000,
        });
      },
    });
  }

  protected revocarAsignacion(row: RolUsuarioRow): void {
    this.confirmationService.confirm({
      message: `¿Revocar el rol ${row.rol} al usuario ${row.usuario || row.email}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.rolesUsuariosService.revocar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Rol ${row.rol} revocado`,
              life: 3000,
            });
            this.asignacion = asignacionVacia();
            this.asignaciones.reload();
          },
          error: (error: unknown) =>
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: this.extractErrorMessage(error),
              life: 5000,
            }),
        });
      },
    });
  }

  protected revocarSeleccionados(): void {
    const filas = (this.seleccionados ?? []).filter((fila) => fila.esActivo);
    if (!filas.length) {
      this.messageService.add({
        severity: "warn",
        summary: "Atención",
        detail: "Solo hay asignaciones ya revocadas en la selección.",
        life: 3000,
      });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Revocar los ${filas.length} roles asignados seleccionados?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.revocando = true;
        forkJoin(
          filas.map((fila) => this.rolesUsuariosService.revocar(fila.id)),
        ).subscribe({
          next: () => {
            this.revocando = false;
            this.seleccionados = null;
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: "Roles revocados",
              life: 3000,
            });
            this.asignaciones.reload();
          },
          error: (error: unknown) => {
            this.revocando = false;
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: this.extractErrorMessage(error),
              life: 5000,
            });
            this.asignaciones.reload();
          },
        });
      },
    });
  }

  protected nombreDeUsuario(idUsuario: string): string {
    const usuario = this.usuarios.value()?.items.find((item) => item.user.id === idUsuario);
    if (!usuario?.persona) return usuario?.user.email ?? idUsuario.slice(0, 8);
    return nombreCompleto(usuario.persona);
  }

  protected extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403) return "No tenés permiso para gestionar roles de usuarios.";
      if (error.status === 409) return "El usuario ya tiene asignado ese rol (o ya está revocado).";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}

interface AsignacionModel {
  id?: string;
  idUsuario?: string;
  idRol?: string;
  fechaInicio: Date | null;
}

function asignacionVacia(): AsignacionModel {
  return { idUsuario: undefined, idRol: undefined, fechaInicio: null };
}

interface UsuarioListadoConPersona extends UsuarioListado {
  persona: NonNullable<UsuarioListado["persona"]>;
}

function nombreCompleto(persona: NonNullable<UsuarioListado["persona"]>): string {
  return [persona.nombres, persona.primerApellido, persona.segundoApellido]
    .filter((parte) => !!parte)
    .join(" ");
}

function aFila(
  asignacion: RolUsuario,
  usuariosPorId: Map<string, UsuarioListado>,
  rolesPorId: Map<string, Rol>,
): RolUsuarioRow {
  const usuario = usuariosPorId.get(asignacion.idUsuario);
  const rol = rolesPorId.get(asignacion.idRol);

  return {
    id: asignacion.id,
    idUsuario: asignacion.idUsuario,
    idRol: asignacion.idRol,
    usuario: usuario?.persona ? nombreCompleto(usuario.persona) : asignacion.idUsuario.slice(0, 8),
    email: usuario?.user.email ?? "",
    rol: rol ? rol.rol : asignacion.idRol.slice(0, 8),
    fechaInicio: asignacion.fechaInicio,
    estado: asignacion.esActivo ? "ACTIVO" : "REVOCADO",
    esActivo: asignacion.esActivo,
  };
}
