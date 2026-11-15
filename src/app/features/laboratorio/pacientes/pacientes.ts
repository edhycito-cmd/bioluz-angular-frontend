import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { Observable, forkJoin, map, of, switchMap } from "rxjs";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import { MessageService, ConfirmationService } from "@openng/optimus-ui/api";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ToastModule } from "@openng/optimus-ui/toast";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { SelectModule } from "@openng/optimus-ui/select";
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { DatePickerModule } from "@openng/optimus-ui/datepicker";
import { MessageModule } from "@openng/optimus-ui/message";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { PacientesService } from "../../../core/services/pacientes.service";
import { PersonasService } from "../../../core/services/personas.service";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";
import { PaginatedResult } from "../../../core/models/pagination.model";
import { Persona } from "../../../core/models/user.model";
import type { DetalleClasificador } from "../../../core/models/clasificador.model";

interface PacienteFila {
  id: string;
  idPersona: string;
  /** Código de historia clínica (HC-XXXXXX). */
  codigo: string;
  nombreCompleto: string;
  iniciales: string;
  colorClass: string;
  email: string | null;
  domicilio: string | null;
  documento: string;
  fechaNacimiento: string | null;
  edadSexo: string;
  telefono: string;
  /** Estado del usuario vinculado: true/false, o null si no tiene usuario. */
  usuarioActivo: boolean | null;
}

/** Datos de persona que se registran/editan en el diálogo. */
interface PacienteFormModel {
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  generoId: number | null;
  tipoDocumentoIdentidadId: number | null;
  numeroDocumento: string;
  fechaNacimiento: Date | null;
  telefono: string;
  email: string;
  distincion: string | null;
  domicilio: string;
}

interface Opcion {
  label: string;
  value: number | string;
}

const pacienteVacio = (): PacienteFormModel => ({
  nombres: "",
  primerApellido: "",
  segundoApellido: "",
  generoId: null,
  tipoDocumentoIdentidadId: null,
  numeroDocumento: "",
  fechaNacimiento: null,
  telefono: "",
  email: "",
  distincion: null,
  domicilio: "",
});

/** Paleta para los avatares con iniciales (se elige por hash del código HC). */
const COLORES_AVATAR = [
  "bg-pink-500",
  "bg-teal-600",
  "bg-amber-600",
  "bg-sky-600",
  "bg-red-500",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-indigo-500",
];

/** Teléfono: 8 dígitos que inician con 5, 6 o 7 (los espacios se ignoran). */
const TELEFONO_PATTERN = /^[567][0-9]{7}$/;

/**
 * Documento de identidad: hasta 12 dígitos, opcionalmente seguidos de un
 * guion y dos letras mayúsculas (Ej. 12345678 o 12345678-XY).
 */
const DOCUMENTO_PATTERN = /^\d{1,12}(-[A-Z]{2})?$/;

import { AppPageHeader } from "../../../layout/component/app.page-header";
import { AppEmptyState } from "../../../layout/component/app.empty-state";

@Component({
  selector: "app-paciente",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block" },
  imports: [
    AppPageHeader,
    AppEmptyState,
    FormsModule,
    TableModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DialogModule,
    DatePickerModule,
    MessageModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./pacientes.html",
  providers: [MessageService, ConfirmationService],
})
export class PacientesPage {
  private readonly pacientesService = inject(PacientesService);
  private readonly personasService = inject(PersonasService);
  private readonly detallesService = inject(DetallesClasificadorService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  protected readonly dt = viewChild.required<Table>("dt");

  /** Fecha actual para limitar la selección de nacimiento en el diálogo. */
  protected readonly today = new Date();

  protected readonly cols = [
    { field: "nombreCompleto", header: "Paciente" },
    { field: "documento", header: "Documento" },
    { field: "codigo", header: "HC" },
    { field: "edadSexo", header: "Edad / Sexo" },
    { field: "telefono", header: "Teléfono" },
    { field: "email", header: "Correo" },
    { field: "domicilio", header: "Dirección" },
    { field: "usuarioActivo", header: "Usuario" },
  ];

  /** Catálogos para el diálogo: género, tipo de documento y distinción. */
  private readonly generos = rxResource({
    stream: () => this.detallesService.listarPorCodigoClasificador("GENERO"),
  });
  private readonly tiposDocumento = rxResource({
    stream: () =>
      this.detallesService.listarPorCodigoClasificador("TIPO_DOCUMENTO"),
  });
  private readonly distinciones = rxResource({
    stream: () => this.detallesService.listarPorCodigoClasificador("DISTINCION"),
  });

  private readonly pacientes = rxResource({
    stream: () => this.listarTodo((q) => this.pacientesService.listar(q)),
  });

  private readonly personas = rxResource({
    stream: () => this.listarTodo((q) => this.personasService.listar(q)),
  });

  protected readonly generoOptions = computed<Opcion[]>(() =>
    (this.generos.value() ?? []).map((detalle) => ({
      label: detalle.nombre ?? detalle.codigo ?? `Opción ${detalle.orden}`,
      value: detalle.orden,
    })),
  );

  protected readonly tipoDocumentoOptions = computed<Opcion[]>(() =>
    (this.tiposDocumento.value() ?? []).map((detalle) => ({
      label: detalle.nombre ?? detalle.codigo ?? `Opción ${detalle.orden}`,
      value: detalle.orden,
    })),
  );

  protected readonly distincionOptions = computed<Opcion[]>(() =>
    (this.distinciones.value() ?? []).map((detalle) => ({
      label: `${detalle.codigo} · ${detalle.nombre ?? ""}`.trim(),
      value: detalle.codigo ?? "",
    })),
  );

  protected readonly filas = computed<PacienteFila[] | undefined>(() => {
    const pacientes = this.pacientes.value();
    const personas = this.personas.value();
    if (pacientes === undefined || personas === undefined) return undefined;

    return pacientes.map((paciente) => {
      const persona = personas.find((item) => item.id === paciente.idPersona);
      const nombreCompleto = persona ? this.nombrePersona(persona) : "—";
      const edadTexto = this.edadTexto(persona?.fechaNacimiento ?? null);
      const sexoLetra = this.sexoLetra(persona?.generoId ?? null);

      return {
        id: paciente.id,
        idPersona: paciente.idPersona,
        codigo: paciente.codigo,
        nombreCompleto,
        iniciales: this.iniciales(nombreCompleto),
        colorClass: this.colorAvatar(paciente.codigo),
        email: persona?.email ?? null,
        domicilio: persona?.domicilio ?? null,
        documento: persona?.numeroDocumento ?? "—",
        fechaNacimiento: persona?.fechaNacimiento ?? null,
        edadSexo: [edadTexto, sexoLetra].filter(Boolean).join(" · ") || "—",
        telefono: persona?.telefono ?? "—",
        usuarioActivo: persona?.usuarioActivo ?? null,
      };
    });
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected paciente: PacienteFormModel = pacienteVacio();
  protected esNuevo = false;
  protected idEditando: string | null = null;
  protected idPersonaEditando: string | null = null;
  protected codigoEditando: string | null = null;

  protected errores(): Partial<Record<keyof PacienteFormModel, string>> {
    const errores: Partial<Record<keyof PacienteFormModel, string>> = {};
    const nombres = this.paciente.nombres.trim();
    const primerApellido = this.paciente.primerApellido.trim();
    const segundoApellido = this.paciente.segundoApellido.trim();
    const numeroDocumento = this.paciente.numeroDocumento.trim();
    const telefono = this.paciente.telefono.trim();
    const email = this.paciente.email.trim();
    const domicilio = this.paciente.domicilio.trim();

    if (!nombres) errores.nombres = "Los nombres son obligatorios.";
    else if (nombres.length < 2)
      errores.nombres = "Los nombres deben tener al menos 2 caracteres.";
    else if (nombres.length > 100)
      errores.nombres = "Los nombres no pueden exceder 100 caracteres.";

    if (!primerApellido)
      errores.primerApellido = "El primer apellido es obligatorio.";
    else if (primerApellido.length < 2)
      errores.primerApellido =
        "El primer apellido debe tener al menos 2 caracteres.";
    else if (primerApellido.length > 50)
      errores.primerApellido = "El primer apellido no puede exceder 50 caracteres.";

    if (segundoApellido && segundoApellido.length > 50)
      errores.segundoApellido = "El segundo apellido no puede exceder 50 caracteres.";

    if (this.paciente.generoId === null || this.paciente.generoId === undefined)
      errores.generoId = "El género es obligatorio.";

    if (numeroDocumento) {
      if (!DOCUMENTO_PATTERN.test(numeroDocumento))
        errores.numeroDocumento =
          "El documento debe tener hasta 12 dígitos y puede incluir un guion con dos letras mayúsculas (Ej. 12345678-XY).";
    }

    if (telefono) {
      if (!TELEFONO_PATTERN.test(telefono.replace(/\s+/g, "")))
        errores.telefono =
          "El teléfono debe tener 8 dígitos e iniciar con 5, 6 o 7 (Ej. 61234567).";
    }

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errores.email = "Introduzca un correo electrónico válido.";
      else if (email.length > 150)
        errores.email = "El correo no puede exceder 150 caracteres.";
    }

    if (domicilio && domicilio.length > 500)
      errores.domicilio = "El domicilio no puede exceder 500 caracteres.";

    return errores;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  /** Redirige al registro de órdenes de laboratorio con este paciente preseleccionado. */
  protected nuevaOrden(fila: PacienteFila): void {
    void this.router.navigate(["/laboratorio/ordenes"], {
      queryParams: { paciente: fila.id },
    });
  }

  protected openNew(): void {
    this.paciente = pacienteVacio();
    this.idEditando = null;
    this.idPersonaEditando = null;
    this.codigoEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editPaciente(fila: PacienteFila): void {
    const persona = (this.personas.value() ?? []).find(
      (item) => item.id === fila.idPersona,
    );
    this.idEditando = fila.id;
    this.idPersonaEditando = fila.idPersona;
    this.codigoEditando = fila.codigo;
    this.paciente = persona
      ? {
          nombres: persona.nombres,
          primerApellido: persona.primerApellido,
          segundoApellido: persona.segundoApellido ?? "",
          generoId: persona.generoId,
          tipoDocumentoIdentidadId: persona.tipoDocumentoIdentidadId,
          numeroDocumento: persona.numeroDocumento ?? "",
          fechaNacimiento: persona.fechaNacimiento
            ? this.parseFecha(persona.fechaNacimiento)
            : null,
          telefono: persona.telefono ?? "",
          email: persona.email ?? "",
          distincion: persona.distincion ?? null,
          domicilio: persona.domicilio ?? "",
        }
      : pacienteVacio();
    this.esNuevo = false;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected hideDialog(): void {
    this.dialogVisible = false;
    this.submitted = false;
  }

  protected guardar(): void {
    this.submitted = true;
    if (Object.keys(this.errores()).length > 0) return;

    const payload = {
      nombres: this.paciente.nombres.trim(),
      primerApellido: this.paciente.primerApellido.trim(),
      segundoApellido: this.paciente.segundoApellido.trim() || null,
      generoId: this.paciente.generoId as number,
      tipoDocumentoIdentidadId: this.paciente.tipoDocumentoIdentidadId ?? null,
      numeroDocumento: this.paciente.numeroDocumento.trim() || null,
      fechaNacimiento: this.paciente.fechaNacimiento
        ? this.paciente.fechaNacimiento.toISOString()
        : null,
      telefono: this.paciente.telefono.replace(/\s+/g, "").trim() || null,
      email: this.paciente.email.trim() || null,
      distincion: this.paciente.distincion ?? null,
      domicilio: this.paciente.domicilio.trim() || null,
    };

    this.guardando = true;

    const peticion: Observable<unknown> = this.esNuevo
      ? this.pacientesService.registrarConPersona({ persona: payload })
      : this.personasService.actualizar(
          this.idPersonaEditando as string,
          payload,
        );

    peticion.subscribe({
      next: (resultado) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        if (this.esNuevo) {
          const creado = (resultado as { paciente: { codigo: string } })
            .paciente;
          this.messageService.add({
            severity: "success",
            summary: "Operación realizada correctamente",
            detail: `Se registró el paciente con historia clínica ${creado.codigo}.`,
            life: 3000,
          });
        } else {
          this.messageService.add({
            severity: "success",
            summary: "Operación realizada correctamente",
            detail: `Se actualizó el paciente ${this.codigoEditando}.`,
            life: 3000,
          });
        }
        this.pacientes.reload();
        this.personas.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: this.esNuevo
            ? "No fue posible registrar el paciente"
            : "No fue posible actualizar el paciente",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(fila: PacienteFila): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el paciente ${fila.nombreCompleto} (${fila.codigo})?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.pacientesService.eliminar(fila.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación realizada correctamente",
              detail: `Se eliminó el paciente ${fila.codigo}.`,
              life: 3000,
            });
            this.pacientes.reload();
          },
          error: (error: unknown) =>
            this.messageService.add({
              severity: "error",
              summary: "Se produjo un error",
              detail: this.mensajeError(error),
              life: 5000,
            }),
        });
      },
    });
  }

  /**
   * Descarga todas las páginas del listado (el backend limita cada página a
   * 100 registros) para que la búsqueda y el paginador del cliente operen
   * sobre el catálogo completo.
   */
  private listarTodo<T>(
    listar: (query: { limite: number; pagina: number }) => Observable<PaginatedResult<T>>,
  ): Observable<T[]> {
    return listar({ limite: 100, pagina: 1 }).pipe(
      switchMap((primera) => {
        const totalPaginas = Math.max(1, primera.totalPaginas);
        if (totalPaginas === 1) return of(primera.items);

        const restantes = Array.from({ length: totalPaginas - 1 }, (_, i) =>
          listar({ limite: 100, pagina: i + 2 }).pipe(map((p) => p.items)),
        );
        return forkJoin(restantes).pipe(
          map((paginas) => [...primera.items, ...paginas.flat()]),
        );
      }),
    );
  }

  private nombrePersona(persona: Persona): string {
    return [
      persona.nombres,
      persona.primerApellido,
      persona.segundoApellido,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  /** Iniciales para el avatar: primera letra del nombre y del primer apellido. */
  private iniciales(nombreCompleto: string): string {
    const partes = nombreCompleto.split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "?";
    const primera = partes[0]?.charAt(0) ?? "";
    const segunda = partes.length > 1 ? (partes[1]?.charAt(0) ?? "") : "";
    return (primera + segunda).toUpperCase();
  }

  private colorAvatar(semilla: string): string {
    let hash = 0;
    for (let i = 0; i < semilla.length; i++) {
      hash = (hash * 31 + semilla.charCodeAt(i)) % 997;
    }
    return COLORES_AVATAR[hash % COLORES_AVATAR.length];
  }

  /** Edad en formato compacto: años (a), meses (m) o días (d). */
  private edadTexto(fechaIso: string | null): string {
    if (!fechaIso) return "—";
    const nacimiento = this.parseFecha(fechaIso);
    if (Number.isNaN(nacimiento.getTime())) return "—";

    const hoy = new Date();
    let anios = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();
    const dias = hoy.getDate() - nacimiento.getDate();

    if (dias < 0) meses--;
    if (meses < 0) {
      anios--;
      meses += 12;
    }
    if (anios < 0) return "—";
    if (anios >= 1) return `${anios} a`;
    if (meses >= 1) return `${meses} m`;
    return "0 m";
  }

  /** Letra de sexo a partir del catálogo GENERO: M / F / O. */
  private sexoLetra(generoId: number | null): string {
    if (generoId === null || generoId === undefined) return "—";
    const genero = (this.generos.value() ?? []).find(
      (detalle) => detalle.orden === generoId,
    );
    const codigo = (genero?.codigo ?? "").toUpperCase();
    if (codigo === "M" || codigo === "F") return codigo;
    if (genero) return "O";
    return "—";
  }

  /**
   * Interpreta fechas ISO como fecha calendario local. Evita que una fecha
   * `YYYY-MM-DD` guardada en UTC se muestre con un día de diferencia.
   */
  private parseFecha(valor: string): Date {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    if (!coincidencia) return new Date(valor);

    const [, anio, mes, dia] = coincidencia;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403)
        return "No tiene permiso para gestionar pacientes.";
      if (error.status === 409)
        return "Ya existe una persona con ese número de documento.";
    }
    return "Se produjo un error inesperado. Intente nuevamente.";
  }
}
