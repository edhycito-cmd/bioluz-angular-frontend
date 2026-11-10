import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { MessageService, ConfirmationService } from "@openng/optimus-ui/api";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ToastModule } from "@openng/optimus-ui/toast";
import { ToolbarModule } from "@openng/optimus-ui/toolbar";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { SelectModule } from "@openng/optimus-ui/select";
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { AreasAnalisisService } from "../../../core/services/areas-analisis.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

interface AreaRow {
  id: string;
  nombre: string;
  idArea: string | null;
  areaPadre: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

interface Opcion {
  label: string;
  value: string;
}

@Component({
  selector: "app-area-analisis",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DialogModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./area-analisis.html",
  styleUrl: "./area-analisis.scss",
  providers: [MessageService, ConfirmationService],
})
export class AreaAnalisisPage {
  private readonly areasService = inject(AreasAnalisisService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "nombre", header: "Nombre" },
    { field: "areaPadre", header: "Área padre" },
    { field: "estado", header: "Estado" },
  ];

  private readonly areas = rxResource({
    stream: () => this.areasService.listar({ limite: 100, pagina: 1 }),
  });

  /** Opciones de área padre; se excluye la propia área para evitar ciclos. */
  protected areaOptions(): Opcion[] {
    return (this.areas.value()?.items ?? [])
      .filter((area) => area.id !== this.idEditando)
      .map((area) => ({
        label: area.nombre,
        value: area.id,
      }));
  }

  protected readonly filas = computed<AreaRow[] | undefined>(() => {
    const resultado = this.areas.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      idArea: item.idArea,
      areaPadre: this.areaNombre(item.idArea),
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVA" : "INACTIVA",
    }));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: AreaRow[] | null = null;
  protected nombre = "";
  protected idArea: string | null = null;
  protected esNuevo = false;
  protected idEditando: string | null = null;

  protected errorNombre(): string | null {
    const nombre = this.nombre.trim();
    if (!nombre) return "El nombre es obligatorio.";
    if (nombre.length > 150)
      return "El nombre no debe superar los 150 caracteres.";
    return null;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.nombre = "";
    this.idArea = null;
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editArea(row: AreaRow): void {
    this.idEditando = row.id;
    this.nombre = row.nombre;
    this.idArea = row.idArea;
    this.esNuevo = false;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected hideDialog(): void {
    this.dialogVisible = false;
    this.submitted = false;
  }

  protected guardar(): void {
    this.submitted = true;
    if (this.errorNombre()) return;
    if (this.idEditando && this.idArea === this.idEditando) return;

    const payload = {
      nombre: this.nombre.trim(),
      idArea: this.idArea || null,
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.areasService.crear(payload)
      : this.areasService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: (guardada) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación exitosa",
          detail: this.esNuevo
            ? `Área ${guardada.nombre} creada`
            : `Área ${guardada.nombre} actualizada`,
          life: 3000,
        });
        this.areas.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No se pudo guardar el área de análisis",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: AreaRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el área ${row.nombre}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.areasService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Área ${row.nombre} eliminada`,
              life: 3000,
            });
            this.areas.reload();
          },
          error: (error: unknown) =>
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: this.mensajeError(error),
              life: 5000,
            }),
        });
      },
    });
  }

  private areaNombre(id: string | null): string {
    if (!id) return "—";
    return (
      this.areas.value()?.items.find((area) => area.id === id)?.nombre ?? id
    );
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403)
        return "No tenés permiso para gestionar áreas de análisis.";
      if (error.status === 409)
        return "No se puede eliminar el área porque tiene registros asociados.";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}
