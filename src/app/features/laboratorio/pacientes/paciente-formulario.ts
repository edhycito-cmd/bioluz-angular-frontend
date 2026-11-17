import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { ButtonModule } from "@openng/optimus-ui/button";
import { DatePickerModule } from "@openng/optimus-ui/datepicker";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { MessageModule } from "@openng/optimus-ui/message";
import { SelectModule } from "@openng/optimus-ui/select";
import { PacientesService } from "../../../core/services/pacientes.service";
import { PersonasService } from "../../../core/services/personas.service";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import type { Paciente } from "../../../core/models/laboratorio.model";
import type { Persona } from "../../../core/models/user.model";
import type { DetalleClasificador } from "../../../core/models/clasificador.model";
import { map, type Observable } from "rxjs";

/** Datos de persona que se registran/editan. */
export interface PacienteFormModel {
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

export interface PacienteGuardado {
  esNuevo: boolean;
  persona: Persona;
  /** Paciente creado; `null` cuando el modo es edición (el padre lo conoce). */
  paciente: Paciente | null;
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

/** Teléfono: 8 dígitos que inician con 5, 6 o 7 (los espacios se ignoran). */
const TELEFONO_PATTERN = /^[567][0-9]{7}$/;

/**
 * Documento de identidad: hasta 12 dígitos, opcionalmente seguidos de un
 * guion y dos letras mayúsculas (Ej. 12345678 o 12345678-XY).
 */
const DOCUMENTO_PATTERN = /^\d{1,12}(-[A-Z]{2})?$/;

/**
 * Formulario de alta/edición de paciente (datos de persona).
 *
 * Se comparte entre la página de pacientes (dentro de un diálogo) y el
 * asistente de nueva orden (dentro de la tarjeta "Nuevo paciente"), de modo
 * que el registro de pacientes sea idéntico en ambos flujos.
 */
@Component({
  selector: "app-paciente-formulario",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block" },
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    SelectModule,
  ],
  templateUrl: "./paciente-formulario.html",
})
export class PacienteFormulario {
  private readonly pacientesService = inject(PacientesService);
  private readonly personasService = inject(PersonasService);
  private readonly detallesService = inject(DetallesClasificadorService);

  /** `nuevo` registra persona + paciente; `editar` actualiza la persona. */
  readonly modo = input<"nuevo" | "editar">("nuevo");
  /** Datos de la persona al editar (se cargan desde la página). */
  readonly personaInicial = input<Persona | null>(null);
  readonly idPersonaEditando = input<string | null>(null);
  readonly codigoEditando = input<string | null>(null);
  /** Prefijo para los ids de los inputs (evita ids duplicados en la página). */
  readonly idPrefijo = input("pf");

  /** Se emite al guardar correctamente (el padre muestra el toast). */
  readonly guardado = output<PacienteGuardado>();
  readonly cancelado = output<void>();

  /** Fecha actual para limitar la selección de nacimiento. */
  protected readonly today = new Date();

  protected readonly guardando = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly paciente = signal<PacienteFormModel>(pacienteVacio());

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

  protected readonly generoOptions = computed<Opcion[]>(() =>
    (this.generos.value() ?? []).map((detalle) => this.detalleLabel(detalle)),
  );

  protected readonly tipoDocumentoOptions = computed<Opcion[]>(() =>
    (this.tiposDocumento.value() ?? []).map((detalle) => this.detalleLabel(detalle)),
  );

  protected readonly distincionOptions = computed<Opcion[]>(() =>
    (this.distinciones.value() ?? []).map((detalle) => ({
      label: `${detalle.codigo} · ${detalle.nombre ?? ""}`.trim(),
      value: detalle.codigo ?? "",
    })),
  );

  constructor() {
    // Los inputs están disponibles en el effect (no en el constructor), así
    // que el modelo se reconstruye cada vez que el padre lo abre con otra
    // persona.
    effect(() => {
      this.cargarDesdePersona();
    });
  }

  protected idCampo(campo: string): string {
    return `${this.idPrefijo()}-${campo}`;
  }

  protected errores(): Partial<Record<keyof PacienteFormModel, string>> {
    const modelo = this.paciente();
    const errores: Partial<Record<keyof PacienteFormModel, string>> = {};
    const nombres = modelo.nombres.trim();
    const primerApellido = modelo.primerApellido.trim();
    const segundoApellido = modelo.segundoApellido.trim();
    const numeroDocumento = modelo.numeroDocumento.trim();
    const telefono = modelo.telefono.trim();
    const email = modelo.email.trim();
    const domicilio = modelo.domicilio.trim();

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
      errores.primerApellido =
        "El primer apellido no puede exceder 50 caracteres.";

    if (segundoApellido && segundoApellido.length > 50)
      errores.segundoApellido =
        "El segundo apellido no puede exceder 50 caracteres.";

    if (modelo.generoId === null || modelo.generoId === undefined)
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

  protected cancelar(): void {
    this.cancelado.emit();
  }

  protected guardar(): void {
    this.submitted.set(true);
    this.formError.set(null);
    if (Object.keys(this.errores()).length > 0) return;

    const modelo = this.paciente();
    const payload = {
      nombres: modelo.nombres.trim(),
      primerApellido: modelo.primerApellido.trim(),
      segundoApellido: modelo.segundoApellido.trim() || null,
      generoId: modelo.generoId as number,
      tipoDocumentoIdentidadId: modelo.tipoDocumentoIdentidadId ?? null,
      numeroDocumento: modelo.numeroDocumento.trim() || null,
      fechaNacimiento: modelo.fechaNacimiento
        ? modelo.fechaNacimiento.toISOString()
        : null,
      telefono: modelo.telefono.replace(/\s+/g, "").trim() || null,
      email: modelo.email.trim() || null,
      distincion: modelo.distincion ?? null,
      domicilio: modelo.domicilio.trim() || null,
    };

    const esNuevo = this.modo() === "nuevo";
    this.guardando.set(true);

    const peticion = esNuevo
      ? this.pacientesService
          .registrarConPersona({ persona: payload })
          .pipe(
            map((resultado) => ({
              persona: resultado.persona,
              paciente: resultado.paciente as Paciente | null,
            })),
          )
      : this.personasService
          .actualizar(this.idPersonaEditando() as string, payload)
          .pipe(map((persona) => ({ persona, paciente: null as Paciente | null })));

    peticion.subscribe({
      next: (resultado) => {
        this.guardando.set(false);
        this.submitted.set(false);
        this.guardado.emit({
          esNuevo,
          persona: resultado.persona,
          paciente: resultado.paciente ?? null,
        });
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.formError.set(this.mensajeError(error));
      },
    });
  }

  /** Inicializa el modelo desde la persona recibida (modo edición). */
  private cargarDesdePersona(): void {
    this.formError.set(null);
    this.submitted.set(false);
    this.guardando.set(false);

    const persona = this.personaInicial();
    if (this.modo() === "nuevo" || !persona) {
      this.paciente.set(pacienteVacio());
      return;
    }

    this.paciente.set({
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
    });
  }

  private detalleLabel(detalle: DetalleClasificador): Opcion {
    return {
      label: detalle.nombre ?? detalle.codigo ?? `Opción ${detalle.orden}`,
      value: detalle.orden,
    };
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
