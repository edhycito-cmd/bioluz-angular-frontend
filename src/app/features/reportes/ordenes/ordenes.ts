import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { Observable, forkJoin, map, of, switchMap } from "rxjs";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { TagModule } from "@openng/optimus-ui/tag";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { InstitucionesService } from "../../../core/services/instituciones.service";
import { MedicosService } from "../../../core/services/medicos.service";
import { OrdenesLaboratorioService } from "../../../core/services/ordenes-laboratorio.service";
import { PacientesService } from "../../../core/services/pacientes.service";
import { PersonasService } from "../../../core/services/personas.service";
import { SucursalesService } from "../../../core/services/sucursales.service";
import { PaginatedResult } from "../../../core/models/pagination.model";
import { Persona } from "../../../core/models/user.model";

interface OrdenReporteRow {
  id: string;
  nroFolio: number;
  fechaSolicitud: string;
  fechaFormateada: string;
  paciente: string;
  medico: string;
  sucursal: string;
  institucion: string;
  estado: string;
}

import { AppPageHeader } from "../../../layout/component/app.page-header";
import { AppEmptyState } from "../../../layout/component/app.empty-state";

@Component({
  selector: "app-reporte-ordenes",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block" },
  imports: [
    AppPageHeader,
    AppEmptyState,
    TableModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
  ],
  templateUrl: "./ordenes.html",
})
export class ReporteOrdenesPage {
  private readonly ordenesService = inject(OrdenesLaboratorioService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly pacientesService = inject(PacientesService);
  private readonly personasService = inject(PersonasService);
  private readonly medicosService = inject(MedicosService);
  private readonly institucionesService = inject(InstitucionesService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "nroFolio", header: "Folio" },
    { field: "fechaFormateada", header: "Fecha" },
    { field: "paciente", header: "Paciente" },
    { field: "medico", header: "Médico" },
    { field: "sucursal", header: "Sucursal" },
    { field: "institucion", header: "Institución" },
    { field: "estado", header: "Estado" },
  ];

  private readonly ordenes = rxResource({
    stream: () => this.listarTodo((query) => this.ordenesService.listar(query)),
  });

  private readonly sucursales = rxResource({
    stream: () => this.listarTodo((query) => this.sucursalesService.listar(query)),
  });

  private readonly pacientes = rxResource({
    stream: () => this.listarTodo((query) => this.pacientesService.listar(query)),
  });

  private readonly personas = rxResource({
    stream: () => this.listarTodo((query) => this.personasService.listar(query)),
  });

  private readonly medicos = rxResource({
    stream: () => this.listarTodo((query) => this.medicosService.listar(query)),
  });

  private readonly instituciones = rxResource({
    stream: () => this.listarTodo((query) => this.institucionesService.listar(query)),
  });

  protected readonly filas = computed<OrdenReporteRow[] | undefined>(() => {
    const items = this.ordenes.value();
    if (items === undefined) return undefined;
    return items.map((item) => ({
      id: item.id,
      nroFolio: item.nroFolio,
      fechaSolicitud: item.fechaSolicitud,
      fechaFormateada: new Date(item.fechaSolicitud).toLocaleDateString(
        "es-ES",
      ),
      paciente: this.pacienteLabel(item.idPaciente),
      medico: this.medicoLabel(item.idMedico),
      sucursal: this.sucursalLabel(item.idSucursal),
      institucion: this.institucionLabel(item.idInstitucion),
      estado: item.estado,
    }));
  });

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  /**
   * Descarga todas las páginas del listado (el backend limita cada página a
   * 100 registros). Sin esto, el reporte y la exportación CSV verían solo la
   * primera página cuando el catálogo supera ese tope.
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

  private pacienteLabel(id: string): string {
    const paciente = this.pacientes.value()?.find((item) => item.id === id);
    if (!paciente) return id;

    const persona = this.personaDe(paciente.idPersona);
    return [paciente.codigo, persona ? this.nombrePersona(persona) : null]
      .filter(Boolean)
      .join(" · ");
  }

  private medicoLabel(id: string): string {
    const medico = this.medicos.value()?.find((item) => item.id === id);
    if (!medico) return id;

    const persona = this.personaDe(medico.idPersona);
    return [
      medico.especialidad,
      persona ? this.nombrePersona(persona) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  private sucursalLabel(id: string): string {
    const sucursal = this.sucursales.value()?.find((item) => item.id === id);
    return sucursal ? `${sucursal.codigo} · ${sucursal.municipio}` : id;
  }

  private institucionLabel(id: string): string {
    return (
      this.instituciones.value()?.find((item) => item.id === id)?.nombre ?? id
    );
  }

  private personaDe(idPersona: string): Persona | undefined {
    return this.personas.value()?.find((persona) => persona.id === idPersona);
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
