import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { forkJoin } from "rxjs";
import { OrdenesLaboratorioService } from "../../../core/services/ordenes-laboratorio.service";
import { PacientesService } from "../../../core/services/pacientes.service";
import { ResultadosService } from "../../../core/services/resultados.service";

interface Tarjeta {
  label: string;
  valor: number;
  icono: string;
  color: string;
}

@Component({
  selector: "app-dashboard-laboratorio",
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: "./dashboard-laboratorio.html",
  styleUrl: "./dashboard-laboratorio.scss",
})
export class DashboardLaboratorio {
  private readonly ordenesService = inject(OrdenesLaboratorioService);
  private readonly pacientesService = inject(PacientesService);
  private readonly resultadosService = inject(ResultadosService);

  /**
   * Resumen del laboratorio. Solo interesa `total`, pero el backend exige
   * `limite >= 10`, así que se pide el mínimo permitido.
   */
  private readonly resumen = rxResource({
    stream: () =>
      forkJoin({
        pendientes: this.ordenesService.listar({
          limite: 10,
          pagina: 1,
          estado: "PENDIENTE",
        }),
        enProceso: this.ordenesService.listar({
          limite: 10,
          pagina: 1,
          estado: "EN_PROCESO",
        }),
        completadas: this.ordenesService.listar({
          limite: 10,
          pagina: 1,
          estado: "COMPLETADO",
        }),
        pacientes: this.pacientesService.listar({ limite: 10, pagina: 1 }),
        resultados: this.resultadosService.listar({ limite: 10, pagina: 1 }),
      }),
  });

  protected readonly tarjetas = computed<Tarjeta[]>(() => {
    const datos = this.resumen.value();
    if (!datos) return [];
    return [
      {
        label: "Órdenes pendientes",
        valor: datos.pendientes.total,
        icono: "pi pi-clock",
        color: "bg-amber-100 text-amber-700",
      },
      {
        label: "Órdenes en proceso",
        valor: datos.enProceso.total,
        icono: "pi pi-spin pi-spinner",
        color: "bg-blue-100 text-blue-700",
      },
      {
        label: "Órdenes completadas",
        valor: datos.completadas.total,
        icono: "pi pi-check-circle",
        color: "bg-emerald-100 text-emerald-700",
      },
      {
        label: "Pacientes registrados",
        valor: datos.pacientes.total,
        icono: "pi pi-users",
        color: "bg-violet-100 text-violet-700",
      },
      {
        label: "Resultados cargados",
        valor: datos.resultados.total,
        icono: "pi pi-file-check",
        color: "bg-rose-100 text-rose-700",
      },
    ];
  });
}
