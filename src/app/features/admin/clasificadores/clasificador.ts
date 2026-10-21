import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from "@angular/core";
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
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { ConfirmationService } from "@openng/optimus-ui/api";
import { ClasificadoresService } from "../../../core/services/clasificadores.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

/** Fila aplanada del listado, para ordenamiento/filtro global con p-table. */
interface ClasificadorRow {
  id: string;
  dominio: string;
  descripcion: string;
  orden: number;
  esActivo: boolean;
  estado: "ACTIVO" | "INACTIVO";
}

/** Modelo editable del dialog (igual que sparked pages/crud). */
interface ClasificadorFormModel {
  id: string;
  dominio: string;
  descripcion: string;
  orden: number;
  esActivo: boolean;
}

@Component({
  selector: "app-clasificador",
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
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./clasificador.html",
  styleUrl: "./clasificador.scss",
  providers: [MessageService, ConfirmationService],
})
export class Clasificador {
  private readonly clasificadoresService = inject(ClasificadoresService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  /** Columnas para exportar a CSV (molde sparked pages/crud). */
  protected readonly cols = [
    { field: "id", header: "Id" },
    { field: "dominio", header: "Dominio" },
    { field: "descripcion", header: "Descripción" },
    { field: "orden", header: "Orden" },
    { field: "estado", header: "Estado" },
  ];

  protected readonly clasificadores = rxResource({
    stream: () => this.clasificadoresService.listar({ limite: 100, pagina: 1 }),
  });

  /** Filas aplanadas; undefined mientras carga (p-table no renderiza aún). */
  protected readonly filas = computed<ClasificadorRow[] | undefined>(() => {
    const resultado = this.clasificadores.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      dominio: item.dominio ?? "",
      descripcion: item.descripcion ?? "",
      orden: item.orden,
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVO" : "INACTIVO",
    }));
  });

  /** Estado del CRUD (molde sparked pages/crud). */
  protected clasificadorDialog = false;
  protected submitted = false;
  protected guardando = false;
  protected deleteseleccionando = false;
  protected seleccionados: ClasificadorRow[] | null = null;
  protected clasificador: ClasificadorFormModel = clasificadorVacio();
  protected esNuevo = false;

  protected ordenInvalido(): boolean {
    const orden = this.clasificador.orden;
    return orden === null || orden === undefined || !Number.isInteger(Number(orden));
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.clasificador = { id: "", dominio: "", descripcion: "", orden: 0, esActivo: true };
    this.esNuevo = true;
    this.submitted = false;
    this.clasificadorDialog = true;
  }

  protected editClasificador(row: ClasificadorRow): void {
    this.clasificador = {
      id: row.id,
      dominio: row.dominio,
      descripcion: row.descripcion,
      orden: row.orden,
      esActivo: row.esActivo,
    };
    this.esNuevo = false;    this.submitted = false;
    this.clasificadorDialog = true;
  }

  protected hideDialog(): void {
    this.clasificadorDialog = false;
    this.submitted = false;
  }

  protected saveClasificador(): void {
    this.submitted = true;

    const id = (this.clasificador.id ?? "").trim();
    const orden = Number(this.clasificador.orden ?? 0);

    if (this.esNuevo && !id) return;
    if (orden === null || Number.isNaN(orden) || !Number.isInteger(orden)) return;

    const dominio = (this.clasificador.dominio ?? "").trim() || null;
    const descripcion = (this.clasificador.descripcion ?? "").trim() || null;

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.clasificadoresService.crear({ id, dominio, descripcion, orden })
      : this.clasificadoresService.actualizar(this.clasificador.id as string, {
          dominio,
          descripcion,
          orden,
        });

    peticion.subscribe({
      next: (guardado) => {
        this.guardando = false;
        this.clasificadorDialog = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación exitosa",
          detail: this.esNuevo
            ? `Clasificador ${guardado.id} creado`
            : `Clasificador ${guardado.id} actualizado`,
          life: 3000,
        });
        this.clasificador = clasificadorVacio();
        this.clasificadores.reload();
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

  protected deleteClasificador(row: ClasificadorRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el clasificador ${row.id}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.clasificadoresService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Clasificador ${row.id} eliminado`,
              life: 3000,
            });
            this.clasificador = clasificadorVacio();
            this.clasificadores.reload();
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
      message: `¿Eliminar los ${filas.length} clasificadores seleccionados?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.deleteseleccionando = true;
        forkJoin(
          filas.map((fila) => this.clasificadoresService.eliminar(fila.id)),
        ).subscribe({
          next: () => {
            this.deleteseleccionando = false;
            this.seleccionados = null;
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: "Clasificadores eliminados",
              life: 3000,
            });
            this.clasificadores.reload();
          },
          error: (error: unknown) => {
            this.deleteseleccionando = false;
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: this.extractErrorMessage(error),
              life: 5000,
            });
            this.clasificadores.reload();
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
      if (error.status === 403) return "No tenés permiso para gestionar clasificadores.";
      if (error.status === 409) return "Ya existe un registro con esa clave.";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}

function clasificadorVacio(): ClasificadorFormModel {
  return {
    id: "",
    dominio: "",
    descripcion: "",
    orden: 0,
    esActivo: true,
  };
}
