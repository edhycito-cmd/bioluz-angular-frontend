import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { forkJoin, map, switchMap } from "rxjs";
import { ConfirmationService, MessageService } from "@openng/optimus-ui/api";
import { ButtonModule } from "@openng/optimus-ui/button";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { DatePickerModule } from "@openng/optimus-ui/datepicker";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { InputNumberModule } from "@openng/optimus-ui/inputnumber";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { SelectButtonModule } from "@openng/optimus-ui/selectbutton";
import { SelectModule } from "@openng/optimus-ui/select";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { TagModule } from "@openng/optimus-ui/tag";
import { ToastModule } from "@openng/optimus-ui/toast";
import { TooltipModule } from "@openng/optimus-ui/tooltip";
import { MessageModule } from "@openng/optimus-ui/message";
import { TreeTableModule } from "@openng/optimus-ui/treetable";
import type { TreeNode, TreeTableNode } from "@openng/optimus-ui/api";
import { HasPermission } from "../../../core/directives/has-permission.directive";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import { InformesService } from "../../../core/services/informes.service";
import { InstitucionesService } from "../../../core/services/instituciones.service";
import { MedicosService } from "../../../core/services/medicos.service";
import { OrdenesLaboratorioService } from "../../../core/services/ordenes-laboratorio.service";
import { PacientesService } from "../../../core/services/pacientes.service";
import { PersonalService } from "../../../core/services/personal.service";
import { PersonasService } from "../../../core/services/personas.service";
import { ResultadosService } from "../../../core/services/resultados.service";
import { SucursalesService } from "../../../core/services/sucursales.service";
import { AreasAnalisisService } from "../../../core/services/areas-analisis.service";
import { ExamenesService } from "../../../core/services/examenes.service";
import { extractApiErrorMessage } from "../../../core/utils/http-error.util";
import { listarTodo } from "../../../core/utils/listar-todo";
import type {
  CrearOrdenLaboratorioPayload,
  OrdenLaboratorio,
} from "../../../core/models/laboratorio.model";
import type {
  AreaAnalisis,
  Examen,
} from "../../../core/models/catalogos-analisis.model";
import type { Persona } from "../../../core/models/user.model";
import {
  PacienteFormulario,
  type PacienteGuardado,
} from "../pacientes/paciente-formulario";

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "CANCELADO"];

/** Formato del código de orden mostrado al registrar (presentacional). */
const folioOrden = (fecha: Date, nroFolio: number): string =>
  `ORD-${fecha.getFullYear()}-${String(nroFolio).padStart(4, "0")}`;

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

interface PacienteFila {
  id: string;
  idPersona: string;
  codigo: string;
  nombreCompleto: string;
  iniciales: string;
  colorClass: string;
  documento: string;
  fechaNacimiento: string | null;
  fechaNacimientoTexto: string;
  /** Fecha de nacimiento completa (dd/mm/aaaa) para la ficha. */
  fechaNacimientoCompleta: string;
  edadSexo: string;
  /** Nombre del género desde el catálogo GENERO. */
  genero: string;
  telefono: string;
  email: string | null;
  domicilio: string | null;
  /**
   * null = sin usuario vinculado; true/false = usuario activo con el rol
   * PACIENTE asignado y vigente (enriquecimiento de GET /personas).
   */
  usuarioActivo: boolean | null;
}

/** Acento visual (ícono, color) asignado a cada área del paso 2. */
interface EstiloArea {
  icono: string;
  /** Clases del contenedor redondeado del ícono. */
  chip: string;
  /** Clase del punto de color en la lista de seleccionadas. */
  dot: string;
  /** Clase del texto de acento. */
  texto: string;
}

/** Paleta rotativa para distinguir las áreas (orden determinista). */
const PALETA_AREAS: EstiloArea[] = [
  {
    icono: "pi pi-heart",
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    dot: "bg-rose-500",
    texto: "text-rose-600 dark:text-rose-400",
  },
  {
    icono: "pi pi-th-large",
    chip: "bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400",
    dot: "bg-teal-500",
    texto: "text-teal-600 dark:text-teal-400",
  },
  {
    icono: "pi pi-filter",
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
    texto: "text-amber-600 dark:text-amber-400",
  },
  {
    icono: "pi pi-star",
    chip: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    dot: "bg-violet-500",
    texto: "text-violet-600 dark:text-violet-400",
  },
  {
    icono: "pi pi-bookmark",
    chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    dot: "bg-sky-500",
    texto: "text-sky-600 dark:text-sky-400",
  },
  {
    icono: "pi pi-clone",
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
    texto: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icono: "pi pi-tag",
    chip: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
    dot: "bg-orange-500",
    texto: "text-orange-600 dark:text-orange-400",
  },
  {
    icono: "pi pi-inbox",
    chip: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    dot: "bg-indigo-500",
    texto: "text-indigo-600 dark:text-indigo-400",
  },
];

/** Estado de selección de un nodo del treetable en modo checkbox. */
interface ClaveSeleccion {
  checked?: boolean;
  partialChecked?: boolean;
}

/** Datos de cada fila del árbol de categorías y pruebas del paso 2. */
interface NodoArbolData {
  id: string;
  nombre: string;
  /** `true` para filas de examen (hoja con checkbox); `false` para áreas. */
  esExamen: boolean;
  /** Solo áreas: total de exámenes del área y sus descendientes. */
  total?: number;
  /** Solo áreas: exámenes ya agregados a la orden. */
  seleccionadas?: number;
  /** Solo exámenes: área directa a la que pertenece. */
  areaId?: string;
  /** Solo exámenes: si ya está seleccionada en la orden en curso. */
  seleccionada?: boolean;
}

/** Grupo de pruebas por área, con el tipo de muestra del informe. */
interface GrupoArea {
  areaId: string;
  areaNombre: string;
  muestraId: string;
  muestraNombre: string;
  examenes: Examen[];
}

/** Datos de la orden recién registrada (pantalla de éxito). */
interface OrdenRegistrada {
  codigo: string;
  pacienteNombre: string;
  pacienteCodigo: string;
  pruebas: number;
  muestras: string[];
  fecha: string;
}

import { AppPageHeader } from "../../../layout/component/app.page-header";
import { AppFormSection } from "../../../layout/component/app.form-section";
import { AppEmptyState } from "../../../layout/component/app.empty-state";

@Component({
  selector: "app-orden-laboratorio",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block" },
  imports: [
    AppPageHeader,
    AppFormSection,
    AppEmptyState,
    FormsModule,
    PacienteFormulario,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    RippleModule,
    SelectButtonModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TreeTableModule,
    HasPermission,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: "./ordenes.html",
})
export class OrdenesLaboratorioPage {
  private readonly ordenesService = inject(OrdenesLaboratorioService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly pacientesService = inject(PacientesService);
  private readonly personalService = inject(PersonalService);
  private readonly personasService = inject(PersonasService);
  private readonly medicosService = inject(MedicosService);
  private readonly institucionesService = inject(InstitucionesService);
  private readonly detallesService = inject(DetallesClasificadorService);
  private readonly areasService = inject(AreasAnalisisService);
  private readonly examenesService = inject(ExamenesService);
  private readonly informesService = inject(InformesService);
  private readonly resultadosService = inject(ResultadosService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ------------------------------------------------------------------
  // Catálogos
  // ------------------------------------------------------------------
  private readonly ordenesRes = rxResource({
    stream: () => listarTodo((q) => this.ordenesService.listar(q)),
  });
  private readonly sucursalesRes = rxResource({
    stream: () => this.sucursalesService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly pacientesRes = rxResource({
    stream: () => listarTodo((q) => this.pacientesService.listar(q)),
  });
  private readonly personasRes = rxResource({
    stream: () => listarTodo((q) => this.personasService.listar(q)),
  });
  private readonly medicosRes = rxResource({
    stream: () => this.medicosService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly personalRes = rxResource({
    stream: () => listarTodo((q) => this.personalService.listar(q)),
  });
  private readonly institucionesRes = rxResource({
    stream: () => this.institucionesService.listar({ limite: 100, pagina: 1 }),
  });
  private readonly generosRes = rxResource({
    stream: () => this.detallesService.listarPorCodigoClasificador("GENERO"),
  });
  private readonly tiposMuestraRes = rxResource({
    stream: () =>
      this.detallesService.listarPorCodigoClasificador("TIPO_MUESTRA"),
  });
  private readonly areasRes = rxResource({
    stream: () => listarTodo((q) => this.areasService.listar(q)),
  });
  private readonly examenesRes = rxResource({
    stream: () => listarTodo((q) => this.examenesService.listar(q)),
  });

  // ------------------------------------------------------------------
  // Asistente de nueva orden (wizard de 3 pasos)
  // ------------------------------------------------------------------
  /** Vista activa de la página: asistente de registro o historial de órdenes. */
  protected readonly vista = signal<"nueva" | "historial">("nueva");
  protected readonly vistas = [
    { label: "Nueva orden", value: "nueva" },
    { label: "Historial de órdenes", value: "historial" },
  ];

  /** Paso actual del asistente: 1 Paciente, 2 Pruebas, 3 Confirmar. */
  protected readonly paso = signal<1 | 2 | 3>(1);

  /** Paciente seleccionado para la orden (id de paciente). */
  protected readonly pacienteId = signal<string | null>(null);

  /** Formulario de alta de paciente dentro del paso 1. */
  protected readonly formularioPacienteVisible = signal(false);
  protected readonly modoFormularioPaciente = signal<"nuevo" | "editar">(
    "nuevo",
  );
  protected readonly personaParaEditar = signal<Persona | null>(null);
  /** idPersona de la persona que edita el formulario embebido (puede no estar seleccionada). */
  protected readonly idPersonaFormulario = signal<string | null>(null);

  /** Búsqueda del listado de pacientes (paso 1). */
  protected readonly busquedaPaciente = signal("");

  /** Texto de búsqueda de pruebas (paso 2). */
  protected readonly busquedaPrueba = signal("");

  /** Ids de exámenes seleccionados, en el orden en que se agregaron. */
  protected readonly pruebasSeleccionadas = signal<string[]>([]);

  /** Categorías expandidas en el árbol del treetable (id → expandido). */
  protected readonly expansionArbol = signal<Record<string, boolean>>({});

  /** Tipo de muestra por área directa (id del detalle TIPO_MUESTRA). */
  protected readonly muestraPorArea = signal<Record<string, string>>({});

  /** Datos clínicos y de toma de muestra (paso 3). */
  protected readonly idSucursal = signal<string | null>(null);
  protected readonly idInstitucion = signal<string | null>(null);
  protected readonly idMedico = signal<string | null>(null);
  protected readonly fechaSolicitud = signal<Date | null>(new Date());

  /** Registro en curso / resultado del registro (paso 3). */
  protected readonly registrando = signal(false);
  protected readonly ordenRegistrada = signal<OrdenRegistrada | null>(null);
  protected readonly errorWizard = signal<string | null>(null);

  /** Paciente preseleccionado con ?paciente=<id> desde el listado de pacientes. */
  private readonly pacienteDesdeQuery: string | null =
    this.route.snapshot.queryParamMap.get("paciente") ?? null;
  private preseleccionAplicada = false;

  constructor() {
    if (!this.pacienteDesdeQuery) return;

    effect(() => {
      if (this.preseleccionAplicada) return;
      const pacientes = this.pacientesRes.value();
      const personas = this.personasRes.value();
      if (!pacientes || !personas) return;

      // Acepta tanto el id del paciente (app_pacientes) como el id de su
      // persona (app_personas) para cubrir ambos orígenes del enlace.
      const paciente =
        pacientes.find((item) => item.id === this.pacienteDesdeQuery) ??
        pacientes.find((item) => item.idPersona === this.pacienteDesdeQuery);
      if (!paciente) {
        this.preseleccionAplicada = true;
        return;
      }

      // Solo se preselecciona si el paciente tiene género y fecha de
      // nacimiento registrados (requisito para crear la orden).
      const fila = (this.filasPacientes() ?? []).find(
        (item) => item.id === paciente.id,
      );
      this.preseleccionAplicada = true;
      if (!fila || !this.datosBasicosCompletos(fila)) return;

      this.pacienteId.set(paciente.id);
      this.paso.set(2);
    });
  }

  // ------------------------------------------------------------------
  // Paso 1 — pacientes
  // ------------------------------------------------------------------
  protected readonly filasPacientes = computed<PacienteFila[] | undefined>(
    () => {
      const pacientes = this.pacientesRes.value();
      const personas = this.personasRes.value();
      if (pacientes === undefined || personas === undefined) return undefined;

      return pacientes.map((paciente) => {
        const persona = personas.find((item) => item.id === paciente.idPersona);
        const nombreCompleto = persona ? this.nombrePersona(persona) : "—";

        return {
          id: paciente.id,
          idPersona: paciente.idPersona,
          codigo: paciente.codigo,
          nombreCompleto,
          iniciales: this.iniciales(nombreCompleto),
          colorClass: this.colorAvatar(paciente.codigo),
          documento: persona?.numeroDocumento ?? "—",
          fechaNacimiento: persona?.fechaNacimiento ?? null,
          fechaNacimientoTexto: persona?.fechaNacimiento
            ? this.fechaTexto(persona.fechaNacimiento)
            : "—",
          fechaNacimientoCompleta: persona?.fechaNacimiento
            ? this.fechaCompleta(persona.fechaNacimiento)
            : "—",
          edadSexo: this.edadSexo(persona ?? null),
          genero: this.generoNombre(persona?.generoId ?? null),
          telefono: persona?.telefono ?? "—",
          email: persona?.email ?? null,
          domicilio: persona?.domicilio ?? null,
          usuarioActivo: persona?.usuarioActivo ?? null,
        };
      });
    },
  );

  /** Filas filtradas por el texto de búsqueda (nombre, documento, HC o teléfono). */
  protected readonly filasBuscadas = computed<PacienteFila[]>(() => {
    const filas = this.filasPacientes() ?? [];
    const termino = this.busquedaPaciente().trim().toLowerCase();
    if (!termino) return filas;

    return filas.filter((fila) =>
      [fila.nombreCompleto, fila.documento, fila.codigo, fila.telefono]
        .join(" ")
        .toLowerCase()
        .includes(termino),
    );
  });

  protected readonly pacienteSeleccionado = computed<PacienteFila | null>(
    () => {
      const id = this.pacienteId();
      if (!id) return null;
      return (
        (this.filasPacientes() ?? []).find((fila) => fila.id === id) ?? null
      );
    },
  );

  /** Código HC del paciente que edita el formulario embebido (aunque no esté seleccionado). */
  protected readonly codigoPacienteFormulario = computed<string | null>(() => {
    const idPersona = this.idPersonaFormulario();
    if (!idPersona) return null;
    return (
      (this.filasPacientes() ?? []).find((fila) => fila.idPersona === idPersona)
        ?.codigo ?? null
    );
  });

  /** Órdenes del paciente seleccionado, más recientes primero. */  protected readonly ordenesDelPaciente = computed<OrdenLaboratorio[]>(() => {
    const id = this.pacienteId();
    if (!id) return [];
    return (this.ordenesRes.value() ?? [])
      .filter((orden) => orden.idPaciente === id)
      .sort(
        (a, b) =>
          new Date(b.fechaSolicitud).getTime() -
          new Date(a.fechaSolicitud).getTime(),
      );
  });

  /** Pacientes con órdenes recientes (chips "Recientes" del paso 1). */
  // protected readonly pacientesRecientes = computed<PacienteFila[]>(() => {
  //   const filas = this.filasPacientes() ?? [];
  //   if (filas.length === 0) return [];
  //   const recientes = [...(this.ordenesRes.value() ?? [])].sort(
  //     (a, b) =>
  //       new Date(b.fechaSolicitud).getTime() -
  //       new Date(a.fechaSolicitud).getTime(),
  //   );
  //   const ids: string[] = [];
  //   for (const orden of recientes) {
  //     if (!ids.includes(orden.idPaciente)) ids.push(orden.idPaciente);
  //     if (ids.length === 4) break;
  //   }
  //   return ids
  //     .map((id) => filas.find((fila) => fila.id === id))
  //     .filter((fila): fila is PacienteFila => fila !== undefined);
  // });

  protected cargandoPacientes = computed(
    () => this.pacientesRes.isLoading() || this.personasRes.isLoading(),
  );

  /**
   * Un paciente solo puede participar en una orden si tiene género y fecha
   * de nacimiento registrados (la orden guarda la edad calculada).
   */
  protected datosBasicosCompletos(fila: PacienteFila): boolean {
    const persona = this.personaDe(fila.idPersona);
    return (
      persona !== undefined &&
      persona.generoId != null &&
      !!persona.fechaNacimiento
    );
  }

  protected seleccionarPaciente(fila: PacienteFila): void {
    if (!this.datosBasicosCompletos(fila)) {
      this.messageService.add({
        severity: "warn",
        summary: "Paciente incompleto",
        detail:
          "No se puede crear una orden sin género y fecha de nacimiento. Completa los datos en el formulario.",
        life: 5000,
      });
      // No se selecciona: se abre el formulario de edición para completar
      // los datos del paciente.
      this.modoFormularioPaciente.set("editar");
      this.personaParaEditar.set(this.personaDe(fila.idPersona) ?? null);
      this.idPersonaFormulario.set(fila.idPersona);
      this.pacienteId.set(null);
      this.formularioPacienteVisible.set(true);
      return;
    }
    this.pacienteId.set(fila.id);
    this.formularioPacienteVisible.set(false);
  }

  protected abrirFormularioNuevo(): void {
    this.modoFormularioPaciente.set("nuevo");
    this.personaParaEditar.set(null);
    this.idPersonaFormulario.set(null);
    // Limpia la selección: es confuso mostrar un paciente seleccionado
    // mientras se registra uno nuevo.
    this.pacienteId.set(null);
    this.formularioPacienteVisible.set(true);
  }

  protected abrirFormularioEdicion(): void {
    const fila = this.pacienteSeleccionado();
    if (!fila) return;
    const persona = this.personaDe(fila.idPersona) ?? null;
    this.modoFormularioPaciente.set("editar");
    this.personaParaEditar.set(persona);
    this.idPersonaFormulario.set(fila.idPersona);
    this.formularioPacienteVisible.set(true);
  }

  protected onFormularioGuardado(evento: PacienteGuardado): void {
    this.formularioPacienteVisible.set(false);
    this.idPersonaFormulario.set(null);
    this.pacientesRes.reload();
    this.personasRes.reload();

    // Solo se auto-selecciona si la persona quedó con género y fecha de
    // nacimiento registrados.
    const personaCompleta =
      evento.persona.generoId != null && !!evento.persona.fechaNacimiento;

    if (evento.esNuevo && evento.paciente) {
      this.messageService.add({
        severity: "success",
        summary: "Operación realizada correctamente",
        detail: `Se registró el paciente con historia clínica ${evento.paciente.codigo}.`,
        life: 3000,
      });
      this.pacienteId.set(personaCompleta ? evento.paciente.id : null);
    } else {
      this.messageService.add({
        severity: "success",
        summary: "Operación realizada correctamente",
        detail: "Se actualizaron los datos del paciente.",
        life: 3000,
      });
      if (evento.persona && personaCompleta) {
        const paciente = (this.pacientesRes.value() ?? []).find(
          (item) => item.idPersona === evento.persona.id,
        );
        if (paciente) this.pacienteId.set(paciente.id);
      }
    }
  }

  protected cancelarFormulario(): void {
    this.formularioPacienteVisible.set(false);
    this.idPersonaFormulario.set(null);
  }

  protected continuarAPruebas(): void {
    if (!this.pacienteSeleccionado()) return;
    this.errorWizard.set(null);
    this.paso.set(2);
  }

  // ------------------------------------------------------------------
  // Paso 2 — catálogo de pruebas
  // ------------------------------------------------------------------
  /** Exámenes indexados por su área directa. */
  private readonly examenesPorArea = computed(() => {
    const mapa = new Map<string, Examen[]>();
    for (const examen of this.examenesRes.value() ?? []) {
      const lista = mapa.get(examen.idAreaAnalisis) ?? [];
      lista.push(examen);
      mapa.set(examen.idAreaAnalisis, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }
    return mapa;
  });

  /**
   * Árbol del treetable del paso 2: áreas jerárquicas de `app_areas_analisis`
   * con sus exámenes como filas hoja (con checkbox), totales por área y
   * contador de selección.
   */
  protected readonly nodosTreetable = computed<TreeNode<NodoArbolData>[]>(
    () => {
      const seleccion = new Set(this.pruebasSeleccionadas());
      const examenesPorArea = this.examenesPorArea();
      const areas = (this.areasRes.value() ?? []).filter(
        (area) => area.esActivo,
      );
      const expansion = this.expansionArbol();
      const termino = this.busquedaPrueba().trim().toLowerCase();

      const construir = (idArea: string | null): TreeNode<NodoArbolData>[] =>
        areas
          .filter((area) => (area.idArea ?? null) === idArea)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
          .map((area): TreeNode<NodoArbolData> | null => {
            const subAreas = construir(area.id);
            const directos = [...(examenesPorArea.get(area.id) ?? [])]
              .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
              .filter(
                (examen) =>
                  !termino || examen.nombre.toLowerCase().includes(termino),
              );
            if (directos.length === 0 && subAreas.length === 0) return null;

            const seleccionadasDirectas = directos.filter((examen) =>
              seleccion.has(examen.id),
            ).length;
            const seleccionadasSub = subAreas.reduce(
              (n, hijo) => n + (hijo.data?.seleccionadas ?? 0),
              0,
            );
            const total =
              directos.length +
              subAreas.reduce((n, hijo) => n + (hijo.data?.total ?? 0), 0);

            const filasExamenes: TreeNode<NodoArbolData>[] = directos.map(
              (examen) => ({
                data: {
                  id: examen.id,
                  nombre: examen.nombre,
                  esExamen: true,
                  areaId: examen.idAreaAnalisis,
                  seleccionada: seleccion.has(examen.id),
                },
                leaf: true,
                expanded: true,
              }),
            );

            return {
              data: {
                id: area.id,
                nombre: area.nombre,
                esExamen: false,
                total,
                seleccionadas: seleccionadasDirectas + seleccionadasSub,
              },
              children: [...subAreas, ...filasExamenes],
              leaf: false,
              // Con búsqueda activa se expande todo para ver los resultados.
              expanded: termino ? true : (expansion[area.id] ?? true),
            };
          })
          .filter((nodo): nodo is TreeNode<NodoArbolData> => nodo !== null);

      return construir(null);
    },
  );

  /**
   * Mapa de `selectionKeys` del treetable en modo `checkbox`: clave = id del
   * nodo; los exámenes marcados van con `checked`, y las áreas con
   * `checked` (todas sus pruebas marcadas) o `partialChecked` (algunas).
   */
  protected readonly clavesSeleccion = computed<Record<string, ClaveSeleccion>>(
    () => {
      const seleccion = new Set(this.pruebasSeleccionadas());
      const examenesPorArea = this.examenesPorArea();
      const areas = (this.areasRes.value() ?? []).filter(
        (area) => area.esActivo,
      );

      // Totales y seleccionadas por área, incluyendo sub-áreas.
      const resumen = new Map<string, { total: number; sel: number }>();
      const calcular = (idArea: string): { total: number; sel: number } => {
        const enCache = resumen.get(idArea);
        if (enCache) return enCache;
        const directos = examenesPorArea.get(idArea) ?? [];
        let total = directos.length;
        let sel = directos.filter((examen) => seleccion.has(examen.id)).length;
        for (const area of areas) {
          if (area.idArea !== idArea) continue;
          const hijo = calcular(area.id);
          total += hijo.total;
          sel += hijo.sel;
        }
        const valor = { total, sel };
        resumen.set(idArea, valor);
        return valor;
      };

      const claves: Record<string, ClaveSeleccion> = {};
      for (const examen of [...examenesPorArea.values()].flat()) {
        if (seleccion.has(examen.id)) {
          claves[examen.id] = { checked: true, partialChecked: false };
        }
      }
      for (const area of areas) {
        const { total, sel } = calcular(area.id);
        if (total === 0) continue;
        if (sel === 0) continue;
        claves[area.id] =
          sel === total
            ? { checked: true, partialChecked: false }
            : { checked: false, partialChecked: true };
      }
      return claves;
    },
  );

  /**
   * Recibe el mapa actualizado por el treetable (con propagación
   * padre→hijos→padre ya aplicada) y traduce las claves `checked` de los
   * exámenes a la lista de pruebas seleccionadas.
   */
  protected alCambiarClaves(claves: Record<string, ClaveSeleccion>): void {
    const marcados = (this.examenesRes.value() ?? [])
      .filter((examen) => examen.esActivo && claves[examen.id]?.checked)
      .map((examen) => examen.id);

    this.pruebasSeleccionadas.update((actuales) => {
      const conservadas = actuales.filter((id) => marcados.includes(id));
      const nuevas = marcados.filter((id) => !actuales.includes(id));
      // Sin cambios reales se devuelve la misma referencia. El treetable
      // vuelve a emitir `selectionKeysChange` cada vez que recibe el mapa de
      // selección; devolver un array nuevo aquí dispararía un bucle infinito
      // de detección de cambios al entrar al paso 2.
      if (conservadas.length === actuales.length && nuevas.length === 0) {
        return actuales;
      }
      return [...conservadas, ...nuevas];
    });
  }

  protected readonly totalExamenes = computed(
    () =>
      (this.examenesRes.value() ?? []).filter((examen) => examen.esActivo)
        .length,
  );

  protected readonly totalSeleccionadas = computed(
    () => this.pruebasSeleccionadas().length,
  );

  /** Mapa de acentos visuales por id de área (paleta rotativa). */
  private readonly estilosPorArea = computed(() => {
    const mapa = new Map<string, EstiloArea>();
    (this.areasRes.value() ?? []).forEach((area, indice) => {
      mapa.set(area.id, PALETA_AREAS[indice % PALETA_AREAS.length]);
    });
    return mapa;
  });

  /** Acento visual de un área (fallback teal para ids desconocidos). */
  protected estiloArea(idArea: string | null | undefined): EstiloArea {
    return this.estilosPorArea().get(idArea ?? "") ?? PALETA_AREAS[1];
  }

  /** Pruebas seleccionadas (entidades) en orden de agregado. */
  protected readonly pruebasElegidas = computed<Examen[]>(() => {
    const ids = this.pruebasSeleccionadas();
    const porId = new Map(
      (this.examenesRes.value() ?? []).map((examen) => [examen.id, examen]),
    );
    return ids
      .map((id) => porId.get(id))
      .filter((examen): examen is Examen => examen !== undefined);
  });

  /** Grupos por área directa, con el tipo de muestra configurado. */
  protected readonly grupos = computed<GrupoArea[]>(() => {
    const muestras = this.tiposMuestraRes.value() ?? [];
    const muestraPorDefecto =
      muestras.find((detalle) => detalle.codigo === "SUE") ??
      muestras[0] ??
      null;
    const config = this.muestraPorArea();

    const orden: string[] = [];
    const acumulado = new Map<string, Examen[]>();
    for (const examen of this.pruebasElegidas()) {
      const areaId = examen.idAreaAnalisis;
      if (!acumulado.has(areaId)) {
        acumulado.set(areaId, []);
        orden.push(areaId);
      }
      acumulado.get(areaId)!.push(examen);
    }

    return orden.map((areaId) => {
      const muestraId = config[areaId] ?? muestraPorDefecto?.id ?? "";
      const muestra = muestras.find((detalle) => detalle.id === muestraId);
      return {
        areaId,
        areaNombre: this.nombreArea(areaId),
        muestraId,
        muestraNombre: muestra ? `${muestra.nombre ?? muestra.codigo}` : "—",
        examenes: acumulado.get(areaId) ?? [],
      };
    });
  });

  protected readonly opcionesTipoMuestra = computed(() =>
    (this.tiposMuestraRes.value() ?? []).map((detalle) => ({
      label: detalle.nombre ?? detalle.codigo ?? `Opción ${detalle.orden}`,
      value: detalle.id,
    })),
  );

  /** Copia el código de la orden al portapapeles (pantalla de éxito). */
  protected copiarCodigo(): void {
    const registro = this.ordenRegistrada();
    if (!registro) return;
    void navigator.clipboard.writeText(registro.codigo).then(() =>
      this.messageService.add({
        severity: "info",
        summary: "Código copiado",
        detail: `${registro.codigo} se copió al portapapeles.`,
        life: 2500,
      }),
    );
  }

  protected cargandoCatalogo = computed(
    () => this.areasRes.isLoading() || this.examenesRes.isLoading(),
  );

  /** Guarda el estado de expansión para sobrevivir a la recreación de nodos. */
  protected recordarExpansion(nodo: TreeTableNode, expandido: boolean): void {
    const datos = nodo.data as NodoArbolData | undefined;
    if (!datos || datos.esExamen) return;
    this.expansionArbol.update((actual) => ({
      ...actual,
      [datos.id]: expandido,
    }));
  }

  protected togglePrueba(examen: Examen): void {
    this.pruebasSeleccionadas.update((ids) =>
      ids.includes(examen.id)
        ? ids.filter((id) => id !== examen.id)
        : [...ids, examen.id],
    );
  }

  protected limpiarPruebas(): void {
    this.confirmationService.confirm({
      message: "¿Quitar todas las pruebas de la orden en curso?",
      header: "Vaciar orden",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí, vaciar",
      rejectLabel: "Cancelar",
      accept: () => {
        this.pruebasSeleccionadas.set([]);
        this.muestraPorArea.set({});
      },
    });
  }

  protected cambiarMuestra(areaId: string, muestraId: string): void {
    this.muestraPorArea.update((actual) => ({
      ...actual,
      [areaId]: muestraId,
    }));
  }

  protected revisarOrden(): void {
    if (this.totalSeleccionadas() === 0) return;
    this.errorWizard.set(null);
    this.paso.set(3);
  }

  protected atras(): void {
    this.errorWizard.set(null);
    this.paso.update((paso) => (paso === 3 ? 2 : 1) as 1 | 2);
  }

  // ------------------------------------------------------------------
  // Paso 3 — datos clínicos y confirmación
  // ------------------------------------------------------------------
  protected readonly sucursalOptions = computed(() =>
    (this.sucursalesRes.value()?.items ?? [])
      .filter((sucursal) => sucursal.esActivo)
      .map((sucursal) => ({
        label: `${sucursal.codigo} · ${sucursal.municipio}`,
        value: sucursal.id,
      })),
  );

  protected readonly institucionOptions = computed(() =>
    (this.institucionesRes.value()?.items ?? []).map((institucion) => ({
      label: institucion.nombre,
      value: institucion.id,
    })),
  );

  protected readonly medicoOptions = computed(() =>
    (this.medicosRes.value()?.items ?? [])
      .filter((medico) => medico.esActivo)
      .map((medico) => ({
        label: this.medicoLabel(medico.id),
        value: medico.id,
      })),
  );

  /** Folio sugerido según la sucursal elegida. */
  protected readonly folioSugerido = computed(() => {
    const ordenes = this.ordenesRes.value() ?? [];
    const sucursalId = this.idSucursal();
    const filtradas = sucursalId
      ? ordenes.filter((orden) => orden.idSucursal === sucursalId)
      : ordenes;
    return Math.max(0, ...filtradas.map((orden) => orden.nroFolio)) + 1;
  });

  /** Edad del paciente a la fecha de solicitud (para la cabecera de la orden). */
  private readonly edadCalculada = computed<EdadCalculada | null>(() => {
    const fila = this.pacienteSeleccionado();
    if (!fila?.fechaNacimiento) return null;
    const nacimiento = this.parseFecha(fila.fechaNacimiento);
    if (Number.isNaN(nacimiento.getTime())) return null;
    return this.calcularEdad(nacimiento, this.fechaSolicitud() ?? new Date());
  });

  protected readonly edadTextoPaciente = computed(() => {
    const edad = this.edadCalculada();
    return edad
      ? `${edad.edadAnios}a ${edad.edadMeses}m ${edad.edadDias}d`
      : "—";
  });

  protected confirmar(): void {
    const fila = this.pacienteSeleccionado();
    const persona = fila ? this.personaDe(fila.idPersona) : null;
    const grupos = this.grupos();

    if (!fila || !persona) {
      this.errorWizard.set("Selecciona un paciente para confirmar la orden.");
      return;
    }
    if (!this.idSucursal()) {
      this.errorWizard.set("Selecciona la sucursal de la orden.");
      return;
    }
    if (!this.idInstitucion()) {
      this.errorWizard.set("Selecciona la institución solicitante.");
      return;
    }
    if (!this.idMedico()) {
      this.errorWizard.set("Selecciona el médico solicitante de la orden.");
      return;
    }
    if (grupos.length === 0) {
      this.errorWizard.set("Agrega al menos una prueba a la orden.");
      return;
    }

    const fecha = this.fechaSolicitud() ?? new Date();
    const edad = this.edadCalculada() ?? {
      edadAnios: 0,
      edadMeses: 0,
      edadDias: 0,
    };

    const payload: CrearOrdenLaboratorioPayload = {
      idSucursal: this.idSucursal() as string,
      idPaciente: fila.id,
      idMedico: this.idMedico() as string,
      idInstitucion: this.idInstitucion() as string,
      edadAnios: edad.edadAnios,
      edadMeses: edad.edadMeses,
      edadDias: edad.edadDias,
      fechaSolicitud: fecha.toISOString(),
      nroFolio: this.folioSugerido(),
      generoId: persona.generoId,
      estado: "PENDIENTE",
    };

    this.registrando.set(true);
    this.errorWizard.set(null);

    // 1) Cabecera de la orden → 2) un informe por área → 3) resultados
    //    pendientes (uno por examen seleccionado).
    // El informe exige un profesional responsable (app_personal); se asigna
    // automáticamente el primer profesional activo del laboratorio.
    const profesional = (this.personalRes.value() ?? []).find(
      (item) => item.esActivo,
    );
    if (!profesional) {
      this.registrando.set(false);
      this.errorWizard.set(
        "No hay profesionales de laboratorio activos para asignar a los informes.",
      );
      return;
    }

    this.ordenesService.crear(payload).subscribe({
      next: (ordenCreada) => {
        forkJoin(
          grupos.map((grupo) =>
            this.informesService
              .crear({
                idOrden: ordenCreada.id,
                idAreaAnalisis: grupo.areaId,
                idPersona: profesional.id,
                tipoMuestraId: grupo.muestraId,
                fechaInforme: fecha.toISOString(),
                formatoInforme: 1,
                firmado: false,
                estado: "BORRADOR",
              })
              .pipe(map((informe) => ({ grupo, informeId: informe.id }))),
          ),
        )
          .pipe(
            // Un resultado "pendiente" por cada examen solicitado (el técnico
            // completa los valores desde la pantalla de resultados).
            switchMap((parejas) =>
              forkJoin(
                parejas.map(({ grupo, informeId }) =>
                  forkJoin(
                    grupo.examenes.map((examen) =>
                      this.resultadosService.crear({
                        idExamen: examen.id,
                        idInforme: informeId,
                      }),
                    ),
                  ),
                ),
              ),
            ),
          )
          .subscribe({
            next: () => {
              this.registrando.set(false);
              this.mostrarExito(payload, grupos, fila, fecha);
            },
            error: (error: unknown) =>
              this.errorRegistro(error, true, payload.nroFolio),
          });
      },
      error: (error: unknown) =>
        this.errorRegistro(error, false, payload.nroFolio),
    });
  }

  protected verOrdenRegistrada(): void {
    this.reiniciarWizard();
    this.vista.set("historial");
  }

  protected otraOrden(): void {
    this.reiniciarWizard();
  }

  protected imprimirRotulos(): void {
    const registro = this.ordenRegistrada();
    if (!registro) return;

    const etiquetas = registro.muestras
      .map(
        (muestra) => `
        <div class="etiqueta">
          <div class="cabecera">LABORATORIO · ${registro.fecha}</div>
          <div class="paciente">${this.escapar(registro.pacienteNombre)}</div>
          <div class="linea">HC ${this.escapar(registro.pacienteCodigo)} · ${this.escapar(registro.codigo)}</div>
          <div class="muestra">${this.escapar(muestra)}</div>
        </div>`,
      )
      .join("");

    const html = `<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Rótulos · ${this.escapar(registro.codigo)}</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 24px; }
            .etiqueta { border: 2px solid #0f766e; border-radius: 10px; padding: 14px 18px; margin-bottom: 12px; page-break-inside: avoid; }
            .cabecera { font-size: 11px; letter-spacing: 0.12em; color: #0f766e; text-transform: uppercase; }
            .paciente { font-size: 20px; font-weight: 700; margin-top: 6px; }
            .linea { font-size: 13px; color: #444; }
            .muestra { margin-top: 8px; font-size: 16px; font-weight: 600; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${etiquetas}<script>window.onload = function () { window.print(); };</script></body>
      </html>`;

    const ventana = window.open("", "_blank", "width=640,height=720");
    if (!ventana) {
      this.messageService.add({
        severity: "warn",
        summary: "Ventana bloqueada",
        detail: "Permite las ventanas emergentes para imprimir los rótulos.",
        life: 4000,
      });
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
  }

  private mostrarExito(
    payload: CrearOrdenLaboratorioPayload,
    grupos: GrupoArea[],
    fila: PacienteFila,
    fecha: Date,
  ): void {
    this.messageService.add({
      severity: "success",
      summary: "Orden registrada",
      detail: `La orden N.° ${payload.nroFolio} se registró correctamente.`,
      life: 4000,
    });
    this.ordenesRes.reload();
    this.ordenRegistrada.set({
      codigo: folioOrden(fecha, payload.nroFolio),
      pacienteNombre: fila.nombreCompleto,
      pacienteCodigo: fila.codigo,
      pruebas: this.totalSeleccionadas(),
      muestras: grupos.map((grupo) => grupo.muestraNombre),
      fecha: this.fechaTexto(fecha),
    });
  }

  private errorRegistro(
    error: unknown,
    ordenCreada: boolean,
    nroFolio: number,
  ): void {
    this.registrando.set(false);
    const base = ordenCreada
      ? "La orden N.° " +
        nroFolio +
        " se registró, pero no se pudieron guardar todos los informes y resultados. Complétala desde el historial. "
      : "No fue posible registrar la orden. ";
    this.errorWizard.set(base + extractApiErrorMessage(error));
    if (ordenCreada) this.ordenesRes.reload();
  }

  private reiniciarWizard(): void {
    this.ordenRegistrada.set(null);
    this.registrando.set(false);
    this.errorWizard.set(null);
    this.paso.set(1);
    this.pacienteId.set(null);
    this.formularioPacienteVisible.set(false);
    this.idPersonaFormulario.set(null);
    this.busquedaPaciente.set("");
    this.busquedaPrueba.set("");
    this.pruebasSeleccionadas.set([]);
    this.expansionArbol.set({});
    this.muestraPorArea.set({});
    this.idSucursal.set(null);
    this.idInstitucion.set(null);
    this.idMedico.set(null);
    this.fechaSolicitud.set(new Date());
  }

  // ------------------------------------------------------------------
  // Historial de órdenes (vista y diálogo de edición)
  // ------------------------------------------------------------------
  protected readonly ordenes = computed<OrdenLaboratorio[]>(
    () => this.ordenesRes.value() ?? [],
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

  protected readonly pacienteOptions = computed(() =>
    (this.filasPacientes() ?? []).map((fila) => ({
      label: `${fila.codigo} · ${fila.nombreCompleto}`,
      value: fila.id,
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
      fechaSolicitud: new Date(orden.fechaSolicitud),
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

  protected edadInvalida(
    campo: "edadAnios" | "edadMeses" | "edadDias",
  ): boolean {
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
      this.formError.set(
        "El número de folio debe ser un número entero mayor que cero.",
      );
      return;
    }

    if (
      [orden.edadAnios, orden.edadMeses, orden.edadDias].some((edad) => {
        const numero = Number(edad);
        return !Number.isInteger(numero) || numero < 0;
      })
    ) {
      this.formError.set(
        "Las edades deben ser números enteros mayores o iguales a cero.",
      );
      return;
    }

    const payload: CrearOrdenLaboratorioPayload = {
      idSucursal: orden.idSucursal,
      idPaciente: orden.idPaciente,
      idMedico: orden.idMedico,
      idInstitucion: orden.idInstitucion,
      edadAnios: Number(orden.edadAnios ?? 0),
      edadMeses: Number(orden.edadMeses ?? 0),
      edadDias: Number(orden.edadDias ?? 0),
      fechaSolicitud: (orden.fechaSolicitud as Date).toISOString(),
      nroFolio: folio,
      generoId: Number(orden.generoId),
      estado: orden.estado,
    };

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
        this.edadOrdenTexto(orden),
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

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  // ------------------------------------------------------------------
  // Helpers de etiquetas y formatos
  // ------------------------------------------------------------------
  protected pacienteLabel(id: string): string {
    const fila = (this.filasPacientes() ?? []).find((item) => item.id === id);
    if (fila) return `${fila.codigo} · ${fila.nombreCompleto}`;
    return id;
  }

  protected medicoLabel(id: string): string {
    const medico = this.medicosRes
      .value()
      ?.items.find((item) => item.id === id);
    if (!medico) return id;

    const persona = this.personaDe(medico.idPersona);
    return [medico.especialidad, persona ? this.nombrePersona(persona) : null]
      .filter(Boolean)
      .join(" · ");
  }

  /** Etiqueta del profesional: nombre + registro profesional. */
  protected profesionalLabel(profesional: {
    idPersona: string;
    registro: string;
  }): string {
    const persona = this.personaDe(profesional.idPersona);
    const nombre = persona ? this.nombrePersona(persona) : profesional.registro;
    return `${nombre} · Reg. ${profesional.registro}`;
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

  protected fechaTexto(fecha: string | Date): string {
    const valor = typeof fecha === "string" ? this.parseFecha(fecha) : fecha;
    return Number.isNaN(valor.getTime())
      ? "—"
      : valor.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
        });
  }

  protected edadOrdenTexto(orden: OrdenLaboratorio): string {
    return `${orden.edadAnios}a ${orden.edadMeses}m ${orden.edadDias}d`;
  }

  protected ordenFolio(orden: OrdenLaboratorio): string {
    return folioOrden(this.parseFecha(orden.fechaSolicitud), orden.nroFolio);
  }

  /** Nombre del área (busca en el árbol completo). */
  protected nombreArea(idArea: string): string {
    const area = (this.areasRes.value() ?? []).find(
      (item) => item.id === idArea,
    );
    return area?.nombre ?? idArea;
  }

  private recalcularDesdePaciente(actualizarGenero: boolean): void {
    const orden = this.orden();
    if (!orden.idPaciente) return;

    const fila = (this.filasPacientes() ?? []).find(
      (item) => item.id === orden.idPaciente,
    );
    const persona = fila ? this.personaDe(fila.idPersona) : null;
    if (!persona) return;

    const fechaNacimiento = persona.fechaNacimiento
      ? this.parseFecha(persona.fechaNacimiento)
      : null;
    const edad =
      fechaNacimiento && !Number.isNaN(fechaNacimiento.getTime())
        ? this.calcularEdad(fechaNacimiento, orden.fechaSolicitud ?? new Date())
        : null;

    this.orden.update((actual) => ({
      ...actual,
      ...(actualizarGenero ? { generoId: persona.generoId } : {}),
      ...(edad ?? {}),
    }));
  }

  private personaDe(idPersona: string): Persona | undefined {
    return (this.personasRes.value() ?? []).find(
      (persona) => persona.id === idPersona,
    );
  }

  /** Nombre del género a partir del catálogo GENERO. */
  private generoNombre(generoId: number | null): string {
    if (generoId === null || generoId === undefined) return "—";
    const genero = (this.generosRes.value() ?? []).find(
      (detalle) => detalle.orden === generoId,
    );
    return genero?.nombre ?? genero?.codigo ?? "—";
  }

  /** Fecha completa (dd/mm/aaaa) para la ficha del paciente. */
  private fechaCompleta(valor: string): string {
    const fecha = this.parseFecha(valor);
    return Number.isNaN(fecha.getTime())
      ? "—"
      : fecha.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
  }

  private siguienteFolio(idSucursal: string | null): number {
    const ordenes = this.ordenesRes.value() ?? [];
    const filtradas = idSucursal
      ? ordenes.filter((orden) => orden.idSucursal === idSucursal)
      : ordenes;
    return Math.max(0, ...filtradas.map((orden) => orden.nroFolio)) + 1;
  }

  private nombrePersona(persona: Persona): string {
    return [persona.nombres, persona.primerApellido, persona.segundoApellido]
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

  /** "64 a · F" con la edad a la fecha actual y la letra de sexo. */
  private edadSexo(persona: Persona | null): string {
    if (!persona) return "—";
    const edad = persona.fechaNacimiento
      ? this.calcularEdad(this.parseFecha(persona.fechaNacimiento), new Date())
      : null;
    const sexo = this.letraSexo(persona.generoId);
    const edadTexto = edad ? `${edad.edadAnios} a` : "";
    return [edadTexto, sexo].filter(Boolean).join(" · ") || "—";
  }

  /** Letra de sexo a partir del catálogo GENERO: M / F / O. */
  private letraSexo(generoId: number | null): string {
    if (generoId === null || generoId === undefined) return "—";
    const genero = (this.generosRes.value() ?? []).find(
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

  private escapar(texto: string): string {
    return texto
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}
