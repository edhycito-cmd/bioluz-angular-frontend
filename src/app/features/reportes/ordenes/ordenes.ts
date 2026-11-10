import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ToolbarModule } from "@openng/optimus-ui/toolbar";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { TagModule } from "@openng/optimus-ui/tag";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { InstitucionesService } from "../../../core/services/instituciones.service";
import { MedicosService } from "../../../core/services/medicos.service";
import { OrdenesLaboratorioService } from "../../../core/services/ordenes-laboratorio.service";
import { PacientesService } from "../../../core/services/pacientes.service";
import { SucursalesService } from "../../../core/services/sucursales.service";

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

@Component({
  selector: "app-reporte-ordenes",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TableModule,
    ButtonModule,
    RippleModule,
    ToolbarModule,
    InputTextModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
  ],
  templateUrl: "./ordenes.html",
  styleUrl: "./ordenes.scss",
})
export class ReporteOrdenesPage {
  private readonly ordenesService = inject(OrdenesLaboratorioService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly pacientesService = inject(PacientesService);
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
    stream: () => this.ordenesService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly sucursales = rxResource({
    stream: () => this.sucursalesService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly pacientes = rxResource({
    stream: () => this.pacientesService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly medicos = rxResource({
    stream: () => this.medicosService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly instituciones = rxResource({
    stream: () => this.institucionesService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly filas = computed<OrdenReporteRow[] | undefined>(() => {
    const resultado = this.ordenes.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
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

  private pacienteLabel(id: string): string {
    return (
      this.pacientes.value()?.items.find((item) => item.id === id)?.codigo ?? id
    );
  }

  private medicoLabel(id: string): string {
    const medico = this.medicos.value()?.items.find((item) => item.id === id);
    return medico
      ? `${medico.especialidad} · ${medico.idPersona.slice(0, 8)}`
      : id;
  }

  private sucursalLabel(id: string): string {
    const sucursal = this.sucursales
      .value()
      ?.items.find((item) => item.id === id);
    return sucursal ? `${sucursal.codigo} · ${sucursal.municipio}` : id;
  }

  private institucionLabel(id: string): string {
    return (
      this.instituciones.value()?.items.find((item) => item.id === id)
        ?.nombre ?? id
    );
  }
}
