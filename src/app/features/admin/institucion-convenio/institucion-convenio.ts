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
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { InstitucionesService } from "../../../core/services/instituciones.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

interface InstitucionRow {
  id: string;
  nombre: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

@Component({
  selector: "app-institucion-convenio",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    InputTextModule,
    TagModule,
    DialogModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./institucion-convenio.html",
  styleUrl: "./institucion-convenio.scss",
  providers: [MessageService, ConfirmationService],
})
export class InstitucionConvenioPage {
  private readonly institucionesService = inject(InstitucionesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "nombre", header: "Nombre" },
    { field: "estado", header: "Estado" },
  ];

  private readonly instituciones = rxResource({
    stream: () => this.institucionesService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly filas = computed<InstitucionRow[] | undefined>(() => {
    const resultado = this.instituciones.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVA" : "INACTIVA",
    }));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: InstitucionRow[] | null = null;
  protected nombre = "";
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
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editInstitucion(row: InstitucionRow): void {
    this.idEditando = row.id;
    this.nombre = row.nombre;
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

    const payload = { nombre: this.nombre.trim() };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.institucionesService.crear(payload)
      : this.institucionesService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: (guardada) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación exitosa",
          detail: this.esNuevo
            ? `Institución ${guardada.nombre} creada`
            : `Institución ${guardada.nombre} actualizada`,
          life: 3000,
        });
        this.instituciones.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No se pudo guardar la institución",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: InstitucionRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la institución ${row.nombre}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.institucionesService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Institución ${row.nombre} eliminada`,
              life: 3000,
            });
            this.instituciones.reload();
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

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403)
        return "No tenés permiso para gestionar instituciones.";
      if (error.status === 409)
        return "Ya existe una institución con ese nombre.";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}
