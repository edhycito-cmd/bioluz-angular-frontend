import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { forkJoin } from "rxjs";
import { ExamenesService } from "../../../core/services/examenes.service";
import { OrdenesLaboratorioService } from "../../../core/services/ordenes-laboratorio.service";
import { PacientesService } from "../../../core/services/pacientes.service";
import { UsersService } from "../../../core/services/users.service";

interface Tarjeta {
  label: string;
  valor: number;
  icono: string;
  color: string;
}

@Component({
  selector: "app-dashboard-admin",
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: "./dashboard-admin.html",
  styleUrl: "./dashboard-admin.scss",
})
export class DashboardAdmin {
  private readonly usersService = inject(UsersService);
  private readonly pacientesService = inject(PacientesService);
  private readonly ordenesService = inject(OrdenesLaboratorioService);
  private readonly examenesService = inject(ExamenesService);

  /**
   * Resumen del sistema. Solo interesa `total`, pero el backend exige
   * `limite >= 10`, así que se pide el mínimo permitido.
   */
  private readonly resumen = rxResource({
    stream: () =>
      forkJoin({
        usuarios: this.usersService.listar({ limite: 10, pagina: 1 }),
        pacientes: this.pacientesService.listar({ limite: 10, pagina: 1 }),
        ordenes: this.ordenesService.listar({ limite: 10, pagina: 1 }),
        pendientes: this.ordenesService.listar({
          limite: 10,
          pagina: 1,
          estado: "PENDIENTE",
        }),
        examenes: this.examenesService.listar({ limite: 10, pagina: 1 }),
      }),
  });

  protected readonly tarjetas = computed<Tarjeta[]>(() => {
    const datos = this.resumen.value();
    if (!datos) return [];
    return [
      {
        label: "Usuarios",
        valor: datos.usuarios.total,
        icono: "pi pi-users",
        color: "bg-blue-100 text-blue-700",
      },
      {
        label: "Pacientes",
        valor: datos.pacientes.total,
        icono: "pi pi-user-plus",
        color: "bg-emerald-100 text-emerald-700",
      },
      {
        label: "Órdenes",
        valor: datos.ordenes.total,
        icono: "pi pi-file-edit",
        color: "bg-amber-100 text-amber-700",
      },
      {
        label: "Órdenes pendientes",
        valor: datos.pendientes.total,
        icono: "pi pi-clock",
        color: "bg-rose-100 text-rose-700",
      },
      {
        label: "Exámenes configurados",
        valor: datos.examenes.total,
        icono: "pi pi-list-check",
        color: "bg-violet-100 text-violet-700",
      },
    ];
  });
}
