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
import { CondicionesFisiologicasService } from "../../../core/services/condiciones-fisiologicas.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

interface CondicionRow {
  id: string;
  codigo: string;
  nombre: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

interface CondicionFormModel {
  codigo: string;
  nombre: string;
}

const condicionVacia = (): CondicionFormModel => ({ codigo: "", nombre: "" });

@Component({
  selector: "app-condicion-fisiologica",
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
  templateUrl: "./condicion-fisiologica.html",
  styleUrl: "./condicion-fisiologica.scss",
  providers: [MessageService, ConfirmationService],
})
export class CondicionFisiologicaPage {
  private readonly condicionesService = inject(
    CondicionesFisiologicasService,
  );
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "codigo", header: "Código" },
    { field: "nombre", header: "Nombre" },
    { field: "estado", header: "Estado" },
  ];

  private readonly condiciones = rxResource({
    stream: () => this.condicionesService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly filas = computed<CondicionRow[] | undefined>(() => {
    const resultado = this.condiciones.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVA" : "INACTIVA",
    }));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: CondicionRow[] | null = null;
  protected condicion: CondicionFormModel = condicionVacia();
  protected esNuevo = false;
  protected idEditando: string | null = null;

  protected errores(): Partial<Record<keyof CondicionFormModel, string>> {
    const errores: Partial<Record<keyof CondicionFormModel, string>> = {};
    const codigo = this.condicion.codigo.trim();
    const nombre = this.condicion.nombre.trim();

    if (!codigo) errores.codigo = "El código es obligatorio.";
    else if (codigo.length > 40)
      errores.codigo = "El código no debe superar los 40 caracteres.";

    if (!nombre) errores.nombre = "El nombre es obligatorio.";
    else if (nombre.length > 100)
      errores.nombre = "El nombre no debe superar los 100 caracteres.";

    return errores;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.condicion = condicionVacia();
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editCondicion(row: CondicionRow): void {
    this.idEditando = row.id;
    this.condicion = { codigo: row.codigo, nombre: row.nombre };
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
    if (Object.keys(this.errores()).length > 0) return;

    const payload = {
      codigo: this.condicion.codigo.trim().toUpperCase(),
      nombre: this.condicion.nombre.trim(),
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.condicionesService.crear(payload)
      : this.condicionesService.actualizar(
          this.idEditando as string,
          payload,
        );

    peticion.subscribe({
      next: (guardada) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación realizada correctamente",
          detail: this.esNuevo
            ? `Se creó la condición ${guardada.nombre}.`
            : `Se actualizó la condición ${guardada.nombre}.`,
          life: 3000,
        });
        this.condiciones.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No fue posible guardar la condición fisiológica",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: CondicionRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la condición ${row.nombre}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.condicionesService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación realizada correctamente",
              detail: `Se eliminó la condición ${row.nombre}.`,
              life: 3000,
            });
            this.condiciones.reload();
          },
          error: (error: unknown) =>
            this.messageService.add({
              severity: "error",
              summary: "Se produjo un error",
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
        return "No tiene permiso para gestionar condiciones fisiológicas.";
      if (error.status === 409)
        return "Ya existe una condición con ese código.";
    }
    return "Se produjo un error inesperado. Intente nuevamente.";
  }
}
