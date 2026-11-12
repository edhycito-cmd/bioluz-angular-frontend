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
import { RolesService } from "../../../core/services/roles.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";
import {
  ActualizarUsuarioPayload,
  RegistrarUsuarioConPersonaPayload,
  UsuarioDetalle,
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

interface OpcionRol {
  id: string;
  nombre: string;
  label: string;
}

const ROL_MEDICO = "MEDICO";
const ROLES_PERSONAL = ["PROFESIONAL_BIOQUIMICO", "TECNICO_LABORATORIO"];
const MAX_FIRMA_BYTES = 1024 * 1024;

/** Modelo compartido por los dialogs de alta y edición de usuario. */
interface UsuarioFormModel {
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
  idRol: string | null;
  domicilio: string;
  /** Solo aplica al rol MEDICO. */
  especialidad: string;
  /** Solo aplica a PROFESIONAL_BIOQUIMICO / TECNICO_LABORATORIO. */
  registro: string;
  /** Data URL de la firma (solo personal de laboratorio). */
  firma: string | null;
  firmaNombre: string;
  /** Permite distinguir "conservar la firma actual" de "limpiarla". */
  firmaModificada: boolean;
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
  private readonly rolesService = inject(RolesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  /** Columnas para exportar a CSV (molde sparked pages/crud). */
  protected readonly cols = [
    { field: "nombres", header: "Nombres" },
    { field: "primerApellido", header: "Apellidos" },
    { field: "email", header: "Correo electrónico" },
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
    stream: () => this.detallesService.listarPorCodigoClasificador("GENERO"),
  });

  protected readonly opcionesTipoDocumento = rxResource({
    stream: () =>
      this.detallesService.listarPorCodigoClasificador("TIPO_DOCUMENTO"),
  });

  protected readonly generoOptions = computed<OpcionGenero[]>(() =>
    aOpcionesNumericas(this.opcionesGenero.value() ?? []),
  );

  protected readonly tipoDocumentoOptions = computed<OpcionTipoDocumento[]>(() =>
    aOpcionesNumericas(this.opcionesTipoDocumento.value() ?? []),
  );

  /** Catálogo completo de roles devuelto por GET /roles. */
  protected readonly roles = rxResource({
    stream: () => this.rolesService.listarTodos(),
  });

  protected readonly rolOptions = computed<OpcionRol[]>(() =>
    (this.roles.value() ?? [])
      .slice()
      .sort(
        (a, b) =>
          Number(b.esActivo) - Number(a.esActivo) ||
          a.rol.localeCompare(b.rol),
      )
      .map((rol) => ({
        id: rol.id,
        nombre: rol.rol,
        label: `${rol.rol} — ${rol.descripcion}${rol.esActivo ? "" : " (inactivo)"}`,
      })),
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

  /** Estado del CRUD y del dialog de alta/edición (molde sparked pages/crud). */
  protected usuarioDialog = false;
  protected modoEdicion = false;
  protected usuarioId: string | null = null;
  protected googleId: string | null = null;
  protected cargandoDetalle = false;
  protected submitted = false;
  protected guardando = false;
  protected cambiandoEstado = false;
  protected seleccionados: UsuarioRow[] | null = null;
  protected usuario: UsuarioFormModel = usuarioVacio();
  protected mostrarPassword = false;
  protected mostrarConfirmPassword = false;

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.modoEdicion = false;
    this.usuarioId = null;
    this.googleId = null;
    this.usuario = usuarioVacio();
    this.submitted = false;
    this.mostrarPassword = false;
    this.mostrarConfirmPassword = false;
    // Refresca el catálogo para no trabajar con una lista vieja o incompleta.
    this.roles.reload();
    this.usuarioDialog = true;
  }

  /** Abre el dialog inmediatamente y carga el detalle del usuario dentro. */
  protected openEdit(row: UsuarioRow): void {
    this.modoEdicion = true;
    this.usuarioId = row.id;
    this.googleId = null;
    this.usuario = usuarioVacio();
    this.submitted = false;
    this.mostrarPassword = false;
    this.mostrarConfirmPassword = false;
    this.cargandoDetalle = true;
    if (this.roles.value() === undefined) {
      this.roles.reload();
    }
    this.usuarioDialog = true;

    this.usersService.obtenerDetalle(row.id).subscribe({
      next: (detalle) => {
        this.cargandoDetalle = false;
        this.usuarioId = detalle.user.id;
        this.googleId = detalle.user.googleId;
        this.usuario = usuarioDesdeDetalle(detalle);
      },
      error: (error: unknown) => {
        this.cargandoDetalle = false;
        this.usuarioDialog = false;
        this.messageService.add({
          severity: "error",
          summary: "Se produjo un error",
          detail: this.extractErrorMessage(error),
          life: 5000,
        });
      },
    });
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

  /** En alta siempre se define contraseña; en edición solo si no usa Google. */
  protected puedeCambiarPassword(): boolean {
    return !this.modoEdicion || !this.googleId;
  }

  protected esRolMedico(): boolean {
    return this.rolSeleccionado()?.nombre === ROL_MEDICO;
  }

  protected esRolPersonal(): boolean {
    const nombre = this.rolSeleccionado()?.nombre;
    return nombre !== undefined && ROLES_PERSONAL.includes(nombre);
  }

  private rolSeleccionado(): OpcionRol | null {
    return (
      this.rolOptions().find((opcion) => opcion.id === this.usuario.idRol) ??
      null
    );
  }

  protected onFirmaSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = "";
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      this.messageService.add({
        severity: "error",
        summary: "Archivo no válido",
        detail: "La firma debe ser una imagen (PNG, JPG, GIF o WebP).",
        life: 5000,
      });
      return;
    }

    if (archivo.size > MAX_FIRMA_BYTES) {
      this.messageService.add({
        severity: "error",
        summary: "Archivo no válido",
        detail: "La firma no debe superar 1 MB.",
        life: 5000,
      });
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.usuario.firma =
        typeof lector.result === "string" ? lector.result : null;
      this.usuario.firmaNombre = archivo.name;
      this.usuario.firmaModificada = true;
    };
    lector.readAsDataURL(archivo);
  }

  protected quitarFirma(): void {
    this.usuario.firma = null;
    this.usuario.firmaNombre = "";
    this.usuario.firmaModificada = true;
  }

  protected saveUsuario(): void {
    if (this.cargandoDetalle) return;
    this.submitted = true;

    const errores = this.validar();
    if (errores.length) return;

    this.guardando = true;

    if (this.modoEdicion && this.usuarioId) {
      this.actualizarUsuario(this.usuarioId);
      return;
    }

    this.usersService
      .registrarConPersona({
        login: this.usuario.login.trim(),
        password: this.usuario.password,
        idRol: this.usuario.idRol as string,
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
            summary: "Operación realizada correctamente",
            detail: `Se registró el usuario ${respuesta.data.user.email}; permanecerá inactivo hasta su activación.`,
            life: 3000,
          });
          this.usuario = usuarioVacio();
          this.usuarios.reload();
        },
        error: (error: unknown) => {
          this.guardando = false;
          this.messageService.add({
            severity: "error",
            summary: "Se produjo un error",
            detail: this.extractErrorMessage(error),
            life: 5000,
          });
        },
      });
  }

  private actualizarUsuario(id: string): void {
    const payload = this.payloadActualizacion();
    this.usersService.actualizar(id, payload).subscribe({
      next: (respuesta) => {
        this.guardando = false;
        this.usuarioDialog = false;
        this.submitted = false;
        this.mostrarPassword = false;
        this.mostrarConfirmPassword = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación realizada correctamente",
          detail: `Se actualizó el usuario ${respuesta.email}.`,
          life: 3000,
        });
        this.usuarios.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "Se produjo un error",
          detail: this.extractErrorMessage(error),
          life: 5000,
        });
      },
    });
  }

  private payloadActualizacion(): ActualizarUsuarioPayload {
    const payload: ActualizarUsuarioPayload = {
      login: this.usuario.login.trim(),
      idRol: this.usuario.idRol as string,
      persona: personaParaActualizar(this.usuario),
    };

    if (this.puedeCambiarPassword() && this.usuario.password) {
      payload.password = this.usuario.password;
    }

    if (this.esRolMedico()) {
      payload.medico = { especialidad: this.usuario.especialidad.trim() };
    }

    if (this.esRolPersonal()) {
      payload.personal = { registro: this.usuario.registro.trim() };
      if (this.usuario.firmaModificada) {
        payload.personal.firma = this.usuario.firma;
      }
    }

    return payload;
  }

  protected cambiarEstado(row: UsuarioRow): void {
    const accion = row.esActivo ? "desactivar" : "activar";
    this.confirmationService.confirm({
      message: `¿Confirma que desea ${accion} al usuario ${row.email}?`,
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
              summary: "Operación realizada correctamente",
              detail: `Se ${row.esActivo ? "desactivó" : "activó"} al usuario ${row.email}.`,
              life: 3000,
            });
            this.usuarios.reload();
          },
          error: (error: unknown) => {
            this.cambiandoEstado = false;
            this.messageService.add({
              severity: "error",
              summary: "Se produjo un error",
              detail: this.extractErrorMessage(error),
              life: 5000,
            });
          },
        });
      },
    });
  }

  /**
   * Validaciones espejo de los schemas Zod del backend.
   * Devuelve la lista de mensajes de error; vacío = todo OK.
   */
  private validar(): string[] {
    const errores: string[] = [];
    const u = this.usuario;

    if (!MAIL_OK(u.login.trim())) errores.push("login");

    if (this.puedeCambiarPassword()) {
      const tienePassword = Boolean(u.password || u.confirmPassword);
      if (!this.modoEdicion || tienePassword) {
        if (!PASSWORD_OK(u.password)) errores.push("password");
        if (!u.confirmPassword || u.confirmPassword !== u.password) {
          errores.push("confirmPassword");
        }
      }
    }

    if (u.nombres.trim().length < 2) errores.push("nombres");
    if (u.primerApellido.trim().length < 2) errores.push("primerApellido");
    if (u.generoId === null) errores.push("generoId");
    if (!MAIL_OK(u.email.trim())) errores.push("personaEmail");
    if (!u.idRol) errores.push("idRol");
    if (this.esRolMedico() && !u.especialidad.trim()) {
      errores.push("especialidad");
    }
    if (this.esRolPersonal() && !u.registro.trim()) {
      errores.push("registro");
    }

    return errores;
  }

  protected loginInvalido(): boolean {
    return this.submitted && !MAIL_OK(this.usuario.login.trim());
  }

  protected passwordInvalido(): boolean {
    if (!this.puedeCambiarPassword()) return false;
    if (
      this.modoEdicion &&
      !this.usuario.password &&
      !this.usuario.confirmPassword
    ) {
      return false;
    }
    return this.submitted && !PASSWORD_OK(this.usuario.password);
  }

  protected confirmPasswordInvalido(): boolean {
    if (!this.puedeCambiarPassword()) return false;
    if (
      this.modoEdicion &&
      !this.usuario.password &&
      !this.usuario.confirmPassword
    ) {
      return false;
    }
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

  protected rolInvalido(): boolean {
    return this.submitted && !this.usuario.idRol;
  }

  protected especialidadInvalida(): boolean {
    return this.submitted && this.esRolMedico() && !this.usuario.especialidad.trim();
  }

  protected registroInvalido(): boolean {
    return this.submitted && this.esRolPersonal() && !this.usuario.registro.trim();
  }

  protected extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403) return "No tiene permiso para gestionar usuarios.";
    }
    return "Se produjo un error inesperado. Intente nuevamente.";
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

function usuarioVacio(): UsuarioFormModel {
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
    idRol: null,
    domicilio: "",
    especialidad: "",
    registro: "",
    firma: null,
    firmaNombre: "",
    firmaModificada: false,
  };
}

function usuarioDesdeDetalle(detalle: UsuarioDetalle): UsuarioFormModel {
  const persona = detalle.persona;

  return {
    login: detalle.user.email,
    password: "",
    confirmPassword: "",
    nombres: persona?.nombres ?? "",
    primerApellido: persona?.primerApellido ?? "",
    segundoApellido: persona?.segundoApellido ?? "",
    generoId: persona?.generoId ?? null,
    tipoDocumentoIdentidadId: persona?.tipoDocumentoIdentidadId ?? null,
    numeroDocumento: persona?.numeroDocumento ?? "",
    telefono: persona?.telefono ?? "",
    email: persona?.email ?? detalle.user.email,
    fechaNacimiento: persona?.fechaNacimiento
      ? new Date(persona.fechaNacimiento)
      : null,
    idRol: detalle.rol?.id ?? null,
    domicilio: persona?.domicilio ?? "",
    especialidad: detalle.medico?.especialidad ?? "",
    registro: detalle.personal?.registro ?? "",
    firma: detalle.personal?.firma ?? null,
    firmaNombre: detalle.personal?.firma ? "Firma actual" : "",
    firmaModificada: false,
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
  u: UsuarioFormModel,
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

/** En edición se envían `null` explícitos para permitir limpiar campos. */
function personaParaActualizar(
  u: UsuarioFormModel,
): ActualizarUsuarioPayload["persona"] {
  return {
    nombres: u.nombres.trim(),
    primerApellido: u.primerApellido.trim(),
    segundoApellido: u.segundoApellido?.trim() || null,
    generoId: u.generoId as number,
    tipoDocumentoIdentidadId: u.tipoDocumentoIdentidadId ?? null,
    numeroDocumento: u.numeroDocumento?.trim() || null,
    fechaNacimiento: u.fechaNacimiento ? u.fechaNacimiento.toISOString() : null,
    telefono: u.telefono?.trim() || null,
    email: u.email.trim(),
    domicilio: u.domicilio?.trim() || null,
  };
}
