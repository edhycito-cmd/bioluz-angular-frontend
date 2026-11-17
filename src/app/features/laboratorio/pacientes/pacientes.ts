import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { MessageService, ConfirmationService } from "@openng/optimus-ui/api";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ToastModule } from "@openng/optimus-ui/toast";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { PacientesService } from "../../../core/services/pacientes.service";
import { PersonasService } from "../../../core/services/personas.service";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";
import { Persona } from "../../../core/models/user.model";
import { listarTodo } from "../../../core/utils/listar-todo";
import {
  PacienteFormulario,
  type PacienteGuardado,
} from "./paciente-formulario";

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
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    IconFieldModule,
    InputIconModule,
    HasPermission,
    PacienteFormulario,
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

  /** Catálogo de géneros para la columna Edad / Sexo. */
  private readonly generos = rxResource({
    stream: () => this.detallesService.listarPorCodigoClasificador("GENERO"),
  });

  private readonly pacientes = rxResource({
    stream: () => listarTodo((q) => this.pacientesService.listar(q)),
  });

  private readonly personas = rxResource({
    stream: () => listarTodo((q) => this.personasService.listar(q)),
  });

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
  protected esNuevo = true;

  /** Datos que se pasan al formulario compartido. */
  protected personaFormulario = signal<Persona | null>(null);
  protected idPersonaFormulario = signal<string | null>(null);
  protected codigoFormulario = signal<string | null>(null);

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
    this.esNuevo = true;
    this.personaFormulario.set(null);
    this.idPersonaFormulario.set(null);
    this.codigoFormulario.set(null);
    this.dialogVisible = true;
  }

  protected editPaciente(fila: PacienteFila): void {
    const persona =
      this.personas.value()?.find((item) => item.id === fila.idPersona) ?? null;
    this.esNuevo = false;
    this.personaFormulario.set(persona);
    this.idPersonaFormulario.set(fila.idPersona);
    this.codigoFormulario.set(fila.codigo);
    this.dialogVisible = true;
  }

  protected hideDialog(): void {
    this.dialogVisible = false;
  }

  protected onGuardado(evento: PacienteGuardado): void {
    this.dialogVisible = false;
    if (evento.esNuevo) {
      this.messageService.add({
        severity: "success",
        summary: "Operación realizada correctamente",
        detail: `Se registró el paciente con historia clínica ${evento.paciente?.codigo}.`,
        life: 3000,
      });
    } else {
      this.messageService.add({
        severity: "success",
        summary: "Operación realizada correctamente",
        detail: `Se actualizó el paciente ${this.codigoFormulario()}.`,
        life: 3000,
      });
    }
    this.pacientes.reload();
    this.personas.reload();
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
