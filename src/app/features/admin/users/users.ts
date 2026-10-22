import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
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
import { AuthService } from "../../../core/services/auth.service";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";
import {
  RegistrarUsuarioConPersonaPayload,
  UsuarioListado,
} from "../../../core/models/user.model";

interface UsuarioRow {
  id: string;
  email: string;
  nombres: string;
  primerApellido: string;
  documento: string;
  telefono: string;
  estado: "ACTIVO" | "INACTIVO";
  esActivo: boolean;
}

interface OpcionGenero {
  id: number;
  label: string;
}

interface OpcionTipoDocumento {
  id: number;
  label: string;
}

/** Modelo del dialog "Nuevo Usuario" (igual que sparked pages/crud). */
interface NuevoUsuarioModel {
  login: string;
  password: string;
  confirmPassword: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  generoId: number | null;
  tipoDocumentoIdentidadId: number | null;
  numeroDocumento: string;
  telefono: string;
  email: string;
  fechaNacimiento: Date | null;
  domicilio: string;
}

@Component({
  selector: "app-users",
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
    HasPermission,
  ],
  templateUrl: "./users.html",
  styleUrl: "./users.scss",
  providers: [MessageService, ConfirmationService],
})
export class Users {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly detallesService = inject(DetallesClasificadorService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  /** Columnas para exportar a CSV (molde sparked pages/crud). */
  protected readonly cols = [
    { field: "nombres", header: "Nombres" },
    { field: "primerApellido", header: "Apellidos" },
    { field: "email", header: "Email" },
    { field: "documento", header: "Documento" },
    { field: "telefono", header: "Teléfono" },
    { field: "estado", header: "Estado" },
  ];

  /** Listado de usuarios + su persona (GET /usuario). */
  protected readonly usuarios = rxResource({
    stream: () => this.usersService.listar({ limite: 100, pagina: 1 }),
  });

  /** Opciones de género y tipo de documento, desde los detalles de clasificador. */
  protected readonly opcionesGenero = rxResource({
    stream: () => this.detallesService.listarPorClasificador("genero_id", { limite: 50 }),
  });

  protected readonly opcionesTipoDocumento = rxResource({
    stream: () =>
      this.detallesService.listarPorClasificador("tipo_documento_id", { limite: 50 }),
  });

  protected readonly generoOptions = computed<OpcionGenero[]>(() =>
    aOpcionesNumericas(this.opcionesGenero.value()?.items ?? []),
  );

  protected readonly tipoDocumentoOptions = computed<OpcionTipoDocumento[]>(() =>
    aOpcionesNumericas(this.opcionesTipoDocumento.value()?.items ?? []),
  );

  protected readonly filas = computed<UsuarioRow[] | undefined>(() => {
    const resultado = this.usuarios.value();
    if (resultado === undefined) return undefined;

    return resultado.items.map((item) => ({
      id: item.user.id,
      email: item.user.email,
      nombres: item.persona?.nombres ?? "",
      primerApellido: item.persona?.primerApellido ?? "",
      documento: item.persona?.numeroDocumento ?? "",
      telefono: item.persona?.telefono ?? "",
      estado: item.user.esActivo ? "ACTIVO" : "INACTIVO",
      esActivo: item.user.esActivo,
    }));
  });

  /** Estado del CRUD y del dialog de alta (molde sparked pages/crud). */
  protected usuarioDialog = false;
  protected submitted = false;
  protected guardando = false;
  protected cambiandoEstado = false;
  protected seleccionados: UsuarioRow[] | null = null;
  protected usuario: NuevoUsuarioModel = usuarioVacio();
  protected mostrarPassword = false;
  protected mostrarConfirmPassword = false;

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.usuario = usuarioVacio();
    this.submitted = false;
    this.mostrarPassword = false;
    this.mostrarConfirmPassword = false;
    this.usuarioDialog = true;
  }

  protected hideDialog(): void {
    this.usuarioDialog = false;
    this.submitted = false;
    this.mostrarPassword = false;
    this.mostrarConfirmPassword = false;
  }

  protected alternarPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  protected alternarConfirmPassword(): void {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }

  protected saveUsuario(): void {
    this.submitted = true;

    const errores = this.validar();
    if (errores.length) return;

    this.guardando = true;
    this.usersService
      .registrarConPersona({
        login: this.usuario.login.trim(),
        password: this.usuario.password,
        persona: personaDesdeModelo(this.usuario),
      })
      .subscribe({
        next: (respuesta) => {
          this.guardando = false;
          this.usuarioDialog = false;
          this.submitted = false;
          this.mostrarPassword = false;
          this.mostrarConfirmPassword = false;
          this.messageService.add({
            severity: "success",
            summary: "Operación exitosa",
            detail: `Usuario ${respuesta.data.user.email} registrado (queda inactivo hasta su activación)`,
            life: 3000,
          });
          this.usuario = usuarioVacio();
          this.usuarios.reload();
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

  protected cambiarEstado(row: UsuarioRow): void {
    const accion = row.esActivo ? "desactivar" : "activar";
    this.confirmationService.confirm({
      message: `¿Confirmás ${accion} al usuario ${row.email}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.cambiandoEstado = true;
        const peticion = row.esActivo
          ? this.authService.deactivateUser(row.id)
          : this.authService.activateUser(row.id);

        peticion.subscribe({
          next: () => {
            this.cambiandoEstado = false;
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Usuario ${row.email} ${row.esActivo ? "desactivado" : "activado"}`,
              life: 3000,
            });
            this.usuarios.reload();
          },
          error: (error: unknown) => {
            this.cambiandoEstado = false;
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: this.extractErrorMessage(error),
              life: 5000,
            });
          },
        });
      },
    });
  }

  /**
   * Validaciones espejo de `registrarUsuarioConPersonaSchema` (Zod) del backend.
   * Devuelve la lista de mensajes de error; vacío = todo OK.
   */
  private validar(): string[] {
    const errores: string[] = [];
    const u = this.usuario;

    if (!MAIL_OK(u.login.trim())) errores.push("login");
    if (! PASSWORD_OK(u.password)) errores.push("password");
    if (!u.confirmPassword || u.confirmPassword !== u.password) {
      errores.push("confirmPassword");
    }
    if (u.nombres.trim().length < 2) errores.push("nombres");
    if (u.primerApellido.trim().length < 2) errores.push("primerApellido");
    if (u.generoId === null) errores.push("generoId");
    if (!MAIL_OK(u.email.trim())) errores.push("personaEmail");

    return errores;
  }

  protected loginInvalido(): boolean {
    return this.submitted && !MAIL_OK(this.usuario.login.trim());
  }

  protected passwordInvalido(): boolean {
    return this.submitted && !PASSWORD_OK(this.usuario.password);
  }

  protected confirmPasswordInvalido(): boolean {
    return (
      this.submitted &&
      (!this.usuario.confirmPassword ||
        this.usuario.confirmPassword !== this.usuario.password)
    );
  }

  protected nombresInvalido(): boolean {
    return this.submitted && this.usuario.nombres.trim().length < 2;
  }

  protected primerApellidoInvalido(): boolean {
    return this.submitted && this.usuario.primerApellido.trim().length < 2;
  }

  protected generoInvalido(): boolean {
    return this.submitted && this.usuario.generoId === null;
  }

  protected personaEmailInvalido(): boolean {
    return this.submitted && !MAIL_OK(this.usuario.email.trim());
  }

  protected extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403) return "No tenés permiso para gestionar usuarios.";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}

/* --------------------------------- helpers --------------------------------- */

const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MAIL_OK(email: string): boolean {
  return MAIL_RE.test(email);
}

/** Reglas de `passwordSchema` del backend: 8..64, minúscula, mayúscula, número, especial, sin espacios. */
function PASSWORD_OK(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 64 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) &&
    !/\s/.test(password)
  );
}

function usuarioVacio(): NuevoUsuarioModel {
  return {
    login: "",
    password: "",
    confirmPassword: "",
    nombres: "",
    primerApellido: "",
    segundoApellido: "",
    generoId: null,
    tipoDocumentoIdentidadId: null,
    numeroDocumento: "",
    telefono: "",
    email: "",
    fechaNacimiento: null,
    domicilio: "",
  };
}

/**
 * `generoId`/`tipoDocumentoIdentidadId` son Int en el backend; los detalles de
 * clasificador traen su `codigo` de negocio, así que el valor numérico es el
 * `orden` del detalle y la etiqueta el `nombre` (MASCULINO, FEMENINO, …).
 */
function aOpcionesNumericas<T extends { orden: number; nombre: string | null }>(
  detalles: T[],
): { id: number; label: string }[] {
  return detalles.map((detalle) => ({
    id: detalle.orden,
    label: detalle.nombre ?? `Opción ${detalle.orden}`,
  }));
}

/**
 * El schema (Zod) del backend es `strictObject` y exige cadenas para los
 * campos texto: los vacíos deben omitirse, no enviarse como `null`.
 */
function personaDesdeModelo(
  u: NuevoUsuarioModel,
): RegistrarUsuarioConPersonaPayload["persona"] {
  const persona: RegistrarUsuarioConPersonaPayload["persona"] = {
    nombres: u.nombres.trim(),
    primerApellido: u.primerApellido.trim(),
    generoId: u.generoId as number,
    email: u.email.trim(),
  };

  const segundo = u.segundoApellido?.trim();
  if (segundo) persona.segundoApellido = segundo;

  if (u.tipoDocumentoIdentidadId !== null) {
    persona.tipoDocumentoIdentidadId = u.tipoDocumentoIdentidadId;
  }

  const documento = u.numeroDocumento?.trim();
  if (documento) persona.numeroDocumento = documento;

  if (u.fechaNacimiento) persona.fechaNacimiento = u.fechaNacimiento.toISOString();

  const telefono = u.telefono?.trim();
  if (telefono) persona.telefono = telefono;

  const domicilio = u.domicilio?.trim();
  if (domicilio) persona.domicilio = domicilio;

  return persona;
}
