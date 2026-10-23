import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { forkJoin } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { MessageService } from "@openng/optimus-ui/api";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ToastModule } from "@openng/optimus-ui/toast";
import { ToolbarModule } from "@openng/optimus-ui/toolbar";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { InputNumberModule } from "@openng/optimus-ui/inputnumber";
import { TextareaModule } from "@openng/optimus-ui/textarea";
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { SelectModule } from "@openng/optimus-ui/select";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { ConfirmationService } from "@openng/optimus-ui/api";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import { ClasificadoresService } from "../../../core/services/clasificadores.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

/** Fila aplanada del listado, para ordenamiento/filtro global con p-table. */
interface DetalleRow {
  id: string;
  idClasificador: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  orden: number;
  esActivo: boolean;
  estado: "ACTIVO" | "INACTIVO";
}

/** Modelo editable del dialog (igual que sparked pages/crud). */
interface DetalleFormModel {
  id: string;
  idClasificador: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  orden: number;
}

interface OpcionClasificador {
  label: string;
  value: string;
}

@Component({
  selector: "app-detalle-clasificador",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    DialogModule,
    SelectModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./detalle-clasificador.html",
  styleUrl: "./detalle-clasificador.scss",
  providers: [MessageService, ConfirmationService],
})
export class DetalleClasificador {
  private readonly detallesService = inject(DetallesClasificadorService);
  private readonly clasificadoresService = inject(ClasificadoresService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  /** Columnas para exportar a CSV (molde sparked pages/crud). */
  protected readonly cols = [
    { field: "codigo", header: "Código" },
    { field: "nombre", header: "Nombre" },
    { field: "descripcion", header: "Descripción" },
    { field: "orden", header: "Orden" },
    { field: "estado", header: "Estado" },
  ];

  /** Datos del filtro: los clasificadores disponibles. */
  protected readonly clasificadores = rxResource({
    stream: () => this.clasificadoresService.listar({ limite: 100, pagina: 1 }),
  });

  /** Opciones del filtro de clasificador (la primera es "Todos"). */
  protected readonly opcionesClasificador = computed<OpcionClasificador[]>(() => {
    const resultado = this.clasificadores.value();
    const opciones: OpcionClasificador[] = [{ label: "Todos", value: "" }];
    if (!resultado) return opciones;
    for (const item of resultado.items) {
      opciones.push({
        label: item.dominio ? `${item.id} · ${item.dominio}` : item.id,
        value: item.id,
      });
    }
    return opciones;
  });

  /** Clasificador seleccionado en el filtro; "" = listar todos. */
  protected readonly filtroClasificador = signal<string>("");

  /** Listado reactivo: al cambiar el filtro se recarga desde el backend. */
  protected readonly detalles = rxResource({
    params: () => ({ idClasificador: this.filtroClasificador() }),
    stream: ({ params }) =>
      this.detallesService.listar({
        limite: 100,
        pagina: 1,
        idClasificador: params.idClasificador || undefined,
      }),
  });

  /** Filas aplanadas; undefined mientras carga (p-table no renderiza aún). */
  protected readonly filas = computed<DetalleRow[] | undefined>(() => {
    const resultado = this.detalles.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      idClasificador: item.idClasificador ?? "",
      codigo: item.codigo ?? "",
      nombre: item.nombre ?? "",
      descripcion: item.descripcion ?? "",
      orden: item.orden,
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVO" : "INACTIVO",
    }));
  });

  /** Etiqueta del row para los mensajes del CRUD. */
  private etiqueta(row: { codigo: string | null; nombre: string | null }): string {
    return row.codigo || row.nombre || "(sin código)";
  }

  /** Estado del CRUD (molde sparked pages/crud). */
  protected detalleDialog = false;
  protected submitted = false;
  protected guardando = false;
  protected deleteSeleccionando = false;
  protected seleccionados: DetalleRow[] | null = null;
  protected detalle: DetalleFormModel = detalleVacio();
  protected esNuevo = false;

  protected ordenInvalido(): boolean {
    const orden = this.detalle.orden;
    return (
      orden === null || orden === undefined || !Number.isInteger(Number(orden))
    );
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.detalle = {
      ...detalleVacio(),
      idClasificador: this.filtroClasificador(),
    };
    this.esNuevo = true;
    this.submitted = false;
    this.detalleDialog = true;
  }

  protected editDetalle(row: DetalleRow): void {
    this.detalle = {
      id: row.id,
      idClasificador: row.idClasificador,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      orden: row.orden,
    };
    this.esNuevo = false;
    this.submitted = false;
    this.detalleDialog = true;
  }

  protected hideDialog(): void {
    this.detalleDialog = false;
    this.submitted = false;
  }

  protected saveDetalle(): void {
    this.submitted = true;

    const idClasificador = (this.detalle.idClasificador ?? "").trim();
    const orden = Number(this.detalle.orden ?? 0);

    if (!idClasificador) return;
    if (orden === null || Number.isNaN(orden) || !Number.isInteger(orden)) return;

    const codigo = (this.detalle.codigo ?? "").trim() || null;
    const nombre = (this.detalle.nombre ?? "").trim() || null;
    const descripcion = (this.detalle.descripcion ?? "").trim() || null;

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.detallesService.crear({ codigo, nombre, descripcion, orden, idClasificador })
      : this.detallesService.actualizar(this.detalle.id, {
          codigo,
          nombre,
          descripcion,
          orden,
        });

    peticion.subscribe({
      next: (guardado) => {
        this.guardando = false;
        this.detalleDialog = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación exitosa",
          detail: this.esNuevo
            ? `Detalle ${this.etiqueta(guardado)} creado`
            : `Detalle ${this.etiqueta(guardado)} actualizado`,
          life: 3000,
        });
        this.detalle = detalleVacio();
        this.detalles.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: this.extractErrorMessage(error),
          life: 5000,
        });
      },
    });
  }

  protected deleteDetalle(row: DetalleRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el detalle ${this.etiqueta(row)}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.detallesService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Detalle ${this.etiqueta(row)} eliminado`,
              life: 3000,
            });
            this.detalle = detalleVacio();
            this.detalles.reload();
          },
          error: (error: unknown) =>
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: this.extractErrorMessage(error),
              life: 5000,
            }),
        });
      },
    });
  }

  protected deleteSeleccionados(): void {
    const filas = this.seleccionados ?? [];
    if (!filas.length) return;

    this.confirmationService.confirm({
      message: `¿Eliminar los ${filas.length} detalles seleccionados?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.deleteSeleccionando = true;
        forkJoin(filas.map((fila) => this.detallesService.eliminar(fila.id))).subscribe({
          next: () => {
            this.deleteSeleccionando = false;
            this.seleccionados = null;
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: "Detalles eliminados",
              life: 3000,
            });
            this.detalles.reload();
          },
          error: (error: unknown) => {
            this.deleteSeleccionando = false;
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: this.extractErrorMessage(error),
              life: 5000,
            });
            this.detalles.reload();
          },
        });
      },
    });
  }

  protected extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403) return "No tenés permiso para gestionar los detalles de clasificador.";
      if (error.status === 409) return "Ya existe un registro con esa clave.";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}

function detalleVacio(): DetalleFormModel {
  return {
    id: "",
    idClasificador: "",
    codigo: "",
    nombre: "",
    descripcion: "",
    orden: 0,
  };
}
