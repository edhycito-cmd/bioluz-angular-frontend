import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import {
  ConfirmationService,
  MessageService,
} from "@openng/optimus-ui/api";
import { ButtonModule } from "@openng/optimus-ui/button";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { DatePickerModule } from "@openng/optimus-ui/datepicker";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { InputNumberModule } from "@openng/optimus-ui/inputnumber";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { SelectModule } from "@openng/optimus-ui/select";
import { TableModule } from "@openng/optimus-ui/table";
import { TagModule } from "@openng/optimus-ui/tag";
import { ToastModule } from "@openng/optimus-ui/toast";
import { ToolbarModule } from "@openng/optimus-ui/toolbar";
import { TooltipModule } from "@openng/optimus-ui/tooltip";
import { HasPermission } from "../../../core/directives/has-permission.directive";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import { InstitucionesService } from "../../../core/services/instituciones.service";
import { MedicosService } from "../../../core/services/medicos.service";
import { OrdenesLaboratorioService } from "../../../core/services/ordenes-laboratorio.service";
import { PacientesService } from "../../../core/services/pacientes.service";
import { PersonasService } from "../../../core/services/personas.service";
import { SucursalesService } from "../../../core/services/sucursales.service";
import { extractApiErrorMessage } from "../../../core/utils/http-error.util";
import type {
  CrearOrdenLaboratorioPayload,
  OrdenLaboratorio,
} from "../../../core/models/laboratorio.model";
import type { Persona } from "../../../core/models/user.model";

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "CANCELADO"];

interface OrdenFormModel {
  idSucursal: string | null;
  idPaciente: string | null;
  idMedico: string | null;
  idInstitucion: string | null;
  nroFolio: number | null;
  fechaSolicitud: Date | null;
  generoId: number | null;
  estado: string;
  edadAnios: number | null;
  edadMeses: number | null;
  edadDias: number | null;
}

interface EdadCalculada {
  edadAnios: number;
  edadMeses: number;
  edadDias: number;
}

const ordenVacia = (nroFolio = 1): OrdenFormModel => ({
  idSucursal: null,
  idPaciente: null,
  idMedico: null,
  idInstitucion: null,
  nroFolio,
  fechaSolicitud: new Date(),
  generoId: null,
  estado: "PENDIENTE",
  edadAnios: 0,
  edadMeses: 0,
  edadDias: 0,
});

@Component({
  selector: "app-orden-laboratorio",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    RippleModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    ToolbarModule,
    TooltipModule,
    HasPermission,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: "./ordenes.html",
  styleUrl: "./ordenes.scss",
})
export class OrdenesLaboratorioPage {
  private readonly ordenesService = inject(OrdenesLaboratorioService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly pacientesService = inject(PacientesService);
  private readonly personasService = inject(PersonasService);
  private readonly medicosService = inject(MedicosService);
  private readonly institucionesService = inject(InstitucionesService);
  private readonly detallesService = inject(DetallesClasificadorService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  private readonly ordenesRes = rxResource({
    stream: () => this.ordenesService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly sucursalesRes = rxResource({
    stream: () => this.sucursalesService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly pacientesRes = rxResource({
    stream: () => this.pacientesService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly personasRes = rxResource({
    stream: () => this.personasService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly medicosRes = rxResource({
    stream: () => this.medicosService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly institucionesRes = rxResource({
    stream: () => this.institucionesService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly generosRes = rxResource({
    stream: () => this.detallesService.listarPorCodigoClasificador("GENERO"),
  });

  protected readonly ordenes = computed<OrdenLaboratorio[]>(
    () => this.ordenesRes.value()?.items ?? [],
  );
  protected readonly cargando = computed(() => this.ordenesRes.isLoading());
  protected readonly errorCarga = computed(() => this.ordenesRes.error());

  protected readonly filtro = signal("");

  protected readonly filasFiltradas = computed<OrdenLaboratorio[]>(() => {
    const termino = this.filtro().trim().toLowerCase();
    if (!termino) return this.ordenes();

    return this.ordenes().filter((orden) =>
      [
        String(orden.nroFolio),
        orden.estado,
        this.pacienteLabel(orden.idPaciente),
        this.medicoLabel(orden.idMedico),
        this.sucursalLabel(orden.idSucursal),
        this.institucionLabel(orden.idInstitucion),
        this.generoLabel(orden.generoId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(termino),
    );
  });

  protected readonly sucursalOptions = computed(() =>
    (this.sucursalesRes.value()?.items ?? []).map((sucursal) => ({
      label: `${sucursal.codigo} · ${sucursal.municipio}`,
      value: sucursal.id,
    })),
  );
  protected readonly pacienteOptions = computed(() =>
    (this.pacientesRes.value()?.items ?? []).map((paciente) => ({
      label: this.pacienteLabel(paciente.id),
      value: paciente.id,
    })),
  );
  protected readonly medicoOptions = computed(() =>
    (this.medicosRes.value()?.items ?? []).map((medico) => ({
      label: this.medicoLabel(medico.id),
      value: medico.id,
    })),
  );
  protected readonly institucionOptions = computed(() =>
    (this.institucionesRes.value()?.items ?? []).map((institucion) => ({
      label: institucion.nombre,
      value: institucion.id,
    })),
  );
  protected readonly generoOptions = computed(() =>
    (this.generosRes.value() ?? []).map((genero) => ({
      label: genero.nombre ?? genero.codigo ?? `Opción ${genero.orden}`,
      value: genero.orden,
    })),
  );
  protected readonly estadoOptions = ESTADOS.map((estado) => ({
    label: estado,
    value: estado,
  }));

  protected readonly dialogVisible = signal(false);
  protected readonly submitted = signal(false);
  protected readonly guardando = signal(false);
  protected readonly esNuevo = signal(true);
  protected readonly idEditando = signal<string | null>(null);
  protected readonly orden = signal<OrdenFormModel>(ordenVacia());
  protected readonly formError = signal<string | null>(null);

  protected readonly tituloDialogo = computed(() =>
    this.esNuevo()
      ? "Nueva orden de laboratorio"
      : "Editar orden de laboratorio",
  );

  protected openNew(): void {
    this.esNuevo.set(true);
    this.idEditando.set(null);
    this.submitted.set(false);
    this.formError.set(null);

    const sucursalPorDefecto =
      this.sucursalesRes
        .value()
        ?.items.find((sucursal) => sucursal.esActivo)?.id ?? null;
    this.orden.set({
      ...ordenVacia(this.siguienteFolio(sucursalPorDefecto)),
      idSucursal: sucursalPorDefecto,
    });
    this.dialogVisible.set(true);
  }

  protected openEdit(orden: OrdenLaboratorio): void {
    this.esNuevo.set(false);
    this.idEditando.set(orden.id);
    this.submitted.set(false);
    this.formError.set(null);
    this.orden.set({
      idSucursal: orden.idSucursal,
      idPaciente: orden.idPaciente,
      idMedico: orden.idMedico,
      idInstitucion: orden.idInstitucion,
      nroFolio: orden.nroFolio,
      fechaSolicitud: this.parseFecha(orden.fechaSolicitud),
      generoId: orden.generoId,
      estado: orden.estado,
      edadAnios: orden.edadAnios,
      edadMeses: orden.edadMeses,
      edadDias: orden.edadDias,
    });
    this.dialogVisible.set(true);
  }

  protected hideDialog(): void {
    this.dialogVisible.set(false);
    this.submitted.set(false);
    this.formError.set(null);
  }

  protected setCampo(campo: keyof OrdenFormModel, valor: unknown): void {
    this.formError.set(null);
    this.orden.update((actual) => ({ ...actual, [campo]: valor }));
  }

  protected onSucursalChange(id: string | null): void {
    this.formError.set(null);
    this.orden.update((actual) => ({
      ...actual,
      idSucursal: id,
      nroFolio: this.esNuevo() ? this.siguienteFolio(id) : actual.nroFolio,
    }));
  }

  protected onPacienteChange(id: string | null): void {
    this.setCampo("idPaciente", id);
    this.recalcularDesdePaciente(true);
  }

  protected onFechaSolicitudChange(fecha: Date | null): void {
    this.setCampo("fechaSolicitud", fecha);
    this.recalcularDesdePaciente(false);
  }

  protected invalido(campo: keyof OrdenFormModel): boolean {
    if (!this.submitted()) return false;
    const valor = this.orden()[campo];
    return valor === null || valor === undefined || valor === "";
  }

  protected folioInvalido(): boolean {
    if (!this.submitted()) return false;
    const folio = Number(this.orden().nroFolio);
    return !Number.isInteger(folio) || folio < 1;
  }

  protected edadInvalida(campo: "edadAnios" | "edadMeses" | "edadDias"): boolean {
    if (!this.submitted()) return false;
    const valor = Number(this.orden()[campo]);
    return !Number.isInteger(valor) || valor < 0;
  }

  protected guardar(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const orden = this.orden();
    if (
      !orden.idSucursal ||
      !orden.idPaciente ||
      !orden.idMedico ||
      !orden.idInstitucion ||
      orden.generoId === null ||
      !orden.fechaSolicitud
    ) {
      this.formError.set("Complete todos los campos obligatorios.");
      return;
    }

    const folio = Number(orden.nroFolio);
    if (!Number.isInteger(folio) || folio < 1) {
      this.formError.set("El número de folio debe ser un número entero mayor que cero.");
      return;
    }

    if (
      [orden.edadAnios, orden.edadMeses, orden.edadDias].some((edad) => {
        const numero = Number(edad);
        return !Number.isInteger(numero) || numero < 0;
      })
    ) {
      this.formError.set("Las edades deben ser números enteros mayores o iguales a cero.");
      return;
    }

    const payload = this.construirPayload(orden);
    this.guardando.set(true);

    const peticion = this.esNuevo()
      ? this.ordenesService.crear(payload)
      : this.ordenesService.actualizar(this.idEditando() as string, payload);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogVisible.set(false);
        this.submitted.set(false);
        this.messageService.add({
          severity: "success",
          summary: this.esNuevo() ? "Orden creada" : "Orden actualizada",
          detail: `La orden N.° ${payload.nroFolio} se guardó correctamente.`,
          life: 4000,
        });
        this.ordenesRes.reload();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.messageService.add({
          severity: "error",
          summary: "No fue posible guardar la orden",
          detail: extractApiErrorMessage(error),
          life: 6000,
        });
      },
    });
  }

  protected eliminar(orden: OrdenLaboratorio): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la orden N.° ${orden.nroFolio}?`,
      header: "Confirmar eliminación",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí, eliminar",
      rejectLabel: "Cancelar",
      accept: () => {
        this.ordenesService.eliminar(orden.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Orden eliminada",
              detail: `La orden N.° ${orden.nroFolio} fue eliminada.`,
              life: 3000,
            });
            this.ordenesRes.reload();
          },
          error: (error: unknown) =>
            this.messageService.add({
              severity: "error",
              summary: "Se produjo un error",
              detail: extractApiErrorMessage(error),
              life: 5000,
            }),
        });
      },
    });
  }

  protected recargar(): void {
    this.ordenesRes.reload();
  }

  protected exportar(): void {
    const filas = this.filasFiltradas();
    if (!filas.length) {
      this.messageService.add({
        severity: "info",
        summary: "Sin datos",
        detail: "No hay órdenes disponibles para exportar.",
      });
      return;
    }

    const encabezados = [
      "Folio",
      "Fecha",
      "Paciente",
      "Médico",
      "Sucursal",
      "Institución",
      "Edad",
      "Género",
      "Estado",
    ];
    const cuerpo = filas.map((orden) =>
      [
        orden.nroFolio,
        this.fechaTexto(orden.fechaSolicitud),
        this.pacienteLabel(orden.idPaciente),
        this.medicoLabel(orden.idMedico),
        this.sucursalLabel(orden.idSucursal),
        this.institucionLabel(orden.idInstitucion),
        this.edadTexto(orden),
        this.generoLabel(orden.generoId),
        orden.estado,
      ]
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(";"),
    );
    const contenido = `\ufeff${[encabezados.join(";"), ...cuerpo].join("\r\n")}`;
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ordenes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  protected pacienteLabel(id: string): string {
    const paciente = this.pacientesRes
      .value()
      ?.items.find((item) => item.id === id);
    if (!paciente) return id;

    const persona = this.personaDe(paciente.idPersona);
    return [paciente.codigo, persona ? this.nombrePersona(persona) : null]
      .filter(Boolean)
      .join(" · ");
  }

  protected medicoLabel(id: string): string {
    const medico = this.medicosRes.value()?.items.find((item) => item.id === id);
    if (!medico) return id;

    const persona = this.personaDe(medico.idPersona);
    return [
      medico.especialidad,
      persona ? this.nombrePersona(persona) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  protected sucursalLabel(id: string): string {
    const sucursal = this.sucursalesRes
      .value()
      ?.items.find((item) => item.id === id);
    return sucursal ? `${sucursal.codigo} · ${sucursal.municipio}` : id;
  }

  protected institucionLabel(id: string): string {
    return (
      this.institucionesRes.value()?.items.find((item) => item.id === id)
        ?.nombre ?? id
    );
  }

  protected generoLabel(id: number): string {
    const genero = (this.generosRes.value() ?? []).find(
      (item) => item.orden === id,
    );
    return genero?.nombre ?? genero?.codigo ?? String(id);
  }

  protected fechaTexto(fecha: string | Date): string {
    const valor = typeof fecha === "string" ? this.parseFecha(fecha) : fecha;
    return Number.isNaN(valor.getTime())
      ? "—"
      : valor.toLocaleDateString("es-ES");
  }

  protected edadTexto(orden: OrdenLaboratorio): string {
    return `${orden.edadAnios}a ${orden.edadMeses}m ${orden.edadDias}d`;
  }

  protected estadoSeverity(
    estado: string,
  ): "success" | "info" | "warn" | "danger" | "secondary" {
    switch (estado) {
      case "COMPLETADO":
        return "success";
      case "EN_PROCESO":
        return "info";
      case "CANCELADO":
        return "danger";
      case "PENDIENTE":
        return "warn";
      default:
        return "secondary";
    }
  }

  private construirPayload(orden: OrdenFormModel): CrearOrdenLaboratorioPayload {
    return {
      idSucursal: orden.idSucursal as string,
      idPaciente: orden.idPaciente as string,
      idMedico: orden.idMedico as string,
      idInstitucion: orden.idInstitucion as string,
      edadAnios: Number(orden.edadAnios ?? 0),
      edadMeses: Number(orden.edadMeses ?? 0),
      edadDias: Number(orden.edadDias ?? 0),
      fechaSolicitud: (orden.fechaSolicitud as Date).toISOString(),
      nroFolio: Number(orden.nroFolio),
      generoId: Number(orden.generoId),
      estado: orden.estado,
    };
  }

  private recalcularDesdePaciente(actualizarGenero: boolean): void {
    const orden = this.orden();
    if (!orden.idPaciente) return;

    const paciente = this.pacientesRes
      .value()
      ?.items.find((item) => item.id === orden.idPaciente);
    if (!paciente) return;

    const persona = this.personaDe(paciente.idPersona);
    if (!persona) return;

    const fechaNacimiento = persona.fechaNacimiento
      ? this.parseFecha(persona.fechaNacimiento)
      : null;
    const edad =
      fechaNacimiento && !Number.isNaN(fechaNacimiento.getTime())
        ? this.calcularEdad(
            fechaNacimiento,
            orden.fechaSolicitud ?? new Date(),
          )
        : null;

    this.orden.update((actual) => ({
      ...actual,
      ...(actualizarGenero ? { generoId: persona.generoId } : {}),
      ...(edad ?? {}),
    }));
  }

  /**
   * Interpreta fechas ISO como fecha calendario local. Evita que una fecha
   * `YYYY-MM-DD` guardada en UTC se muestre o calcule con un día de diferencia.
   */
  private parseFecha(valor: string): Date {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    if (!coincidencia) return new Date(valor);

    const [, anio, mes, dia] = coincidencia;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }

  private calcularEdad(
    fechaNacimiento: Date,
    fechaReferencia: Date,
  ): EdadCalculada {
    let anios = fechaReferencia.getFullYear() - fechaNacimiento.getFullYear();
    let meses = fechaReferencia.getMonth() - fechaNacimiento.getMonth();
    let dias = fechaReferencia.getDate() - fechaNacimiento.getDate();

    if (dias < 0) {
      meses -= 1;
      dias += new Date(
        fechaReferencia.getFullYear(),
        fechaReferencia.getMonth(),
        0,
      ).getDate();
    }
    if (meses < 0) {
      anios -= 1;
      meses += 12;
    }

    return {
      edadAnios: Math.max(0, anios),
      edadMeses: Math.max(0, meses),
      edadDias: Math.max(0, dias),
    };
  }

  private siguienteFolio(idSucursal: string | null): number {
    const ordenes = this.ordenesRes.value()?.items ?? [];
    const filtradas = idSucursal
      ? ordenes.filter((orden) => orden.idSucursal === idSucursal)
      : ordenes;
    return Math.max(0, ...filtradas.map((orden) => orden.nroFolio)) + 1;
  }

  private personaDe(idPersona: string): Persona | undefined {
    return this.personasRes
      .value()
      ?.items.find((persona) => persona.id === idPersona);
  }

  private nombrePersona(persona: Persona): string {
    return [
      persona.nombres,
      persona.primerApellido,
      persona.segundoApellido,
    ]
      .filter(Boolean)
      .join(" ");
  }
}
