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
import { TextareaModule } from "@openng/optimus-ui/textarea";
import { SelectModule } from "@openng/optimus-ui/select";
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import { PlantillasService } from "../../../core/services/plantillas.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

interface PlantillaRow {
  id: string;
  nombre: string;
  formatoInformeId: number;
  formato: string;
  plantilla: string;
  resumen: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

interface PlantillaFormModel {
  nombre: string;
  formatoInformeId: number | null;
  plantilla: string;
}

interface Opcion {
  label: string;
  value: number;
}

const plantillaVacia = (): PlantillaFormModel => ({
  nombre: "",
  formatoInformeId: null,
  plantilla: "",
});

@Component({
  selector: "app-plantilla",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TagModule,
    DialogModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./plantillas.html",
  styleUrl: "./plantillas.scss",
  providers: [MessageService, ConfirmationService],
})
export class PlantillasPage {
  private readonly plantillasService = inject(PlantillasService);
  private readonly detallesService = inject(DetallesClasificadorService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "nombre", header: "Nombre" },
    { field: "formato", header: "Formato" },
    { field: "resumen", header: "Contenido" },
    { field: "estado", header: "Estado" },
  ];

  private readonly plantillas = rxResource({
    stream: () => this.plantillasService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly formatos = rxResource({
    stream: () =>
      this.detallesService.listarPorCodigoClasificador("FORMATO_INFORME"),
  });

  protected readonly formatoOptions = computed<Opcion[]>(() =>
    (this.formatos.value() ?? []).map((formato) => ({
      label: formato.nombre ?? formato.codigo ?? `Formato ${formato.orden}`,
      value: formato.orden,
    })),
  );

  protected readonly filas = computed<PlantillaRow[] | undefined>(() => {
    const resultado = this.plantillas.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => {
      const texto = item.plantilla ?? "";
      return {
        id: item.id,
        nombre: item.nombre,
        formatoInformeId: item.formatoInformeId,
        formato: this.formatoLabel(item.formatoInformeId),
        plantilla: texto,
        resumen: texto.length > 120 ? `${texto.slice(0, 120)}…` : texto,
        esActivo: item.esActivo,
        estado: item.esActivo ? "ACTIVA" : "INACTIVA",
      };
    });
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: PlantillaRow[] | null = null;
  protected plantilla: PlantillaFormModel = plantillaVacia();
  protected esNuevo = false;
  protected idEditando: string | null = null;

  protected errores(): Partial<Record<keyof PlantillaFormModel, string>> {
    const errores: Partial<Record<keyof PlantillaFormModel, string>> = {};
    const nombre = this.plantilla.nombre.trim();

    if (!nombre) errores.nombre = "El nombre es obligatorio.";
    else if (nombre.length > 150)
      errores.nombre = "El nombre no debe superar los 150 caracteres.";
    if (
      this.plantilla.formatoInformeId === null ||
      this.plantilla.formatoInformeId === undefined
    ) {
      errores.formatoInformeId = "El formato de informe es obligatorio.";
    }
    if (!this.plantilla.plantilla.trim())
      errores.plantilla = "El contenido de la plantilla es obligatorio.";

    return errores;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.plantilla = plantillaVacia();
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editPlantilla(row: PlantillaRow): void {
    this.idEditando = row.id;
    this.plantilla = {
      nombre: row.nombre,
      formatoInformeId: row.formatoInformeId,
      plantilla: row.plantilla,
    };
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
      nombre: this.plantilla.nombre.trim(),
      formatoInformeId: this.plantilla.formatoInformeId as number,
      plantilla: this.plantilla.plantilla,
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.plantillasService.crear(payload)
      : this.plantillasService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: (guardada) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación realizada correctamente",
          detail: this.esNuevo
            ? `Se creó la plantilla ${guardada.nombre}.`
            : `Se actualizó la plantilla ${guardada.nombre}.`,
          life: 3000,
        });
        this.plantillas.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No fue posible guardar la plantilla",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: PlantillaRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la plantilla ${row.nombre}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.plantillasService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación realizada correctamente",
              detail: `Se eliminó la plantilla ${row.nombre}.`,
              life: 3000,
            });
            this.plantillas.reload();
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

  private formatoLabel(id: number): string {
    const formato = (this.formatos.value() ?? []).find(
      (item) => item.orden === id,
    );
    return formato?.nombre ?? formato?.codigo ?? String(id);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403)
        return "No tiene permiso para gestionar plantillas.";
      if (error.status === 409)
        return "No se puede eliminar la plantilla porque tiene registros asociados.";
    }
    return "Se produjo un error inesperado. Intente nuevamente.";
  }
}
