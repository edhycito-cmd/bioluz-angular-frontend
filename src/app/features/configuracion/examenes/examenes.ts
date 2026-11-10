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
import { ExamenesService } from "../../../core/services/examenes.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

const TIPOS_RESULTADO = ["NUMERICO", "TEXTO", "DESCRIPTIVO"];

interface ExamenRow {
  id: string;
  idAreaAnalisis: string;
  area: string;
  nombre: string;
  tipoResultado: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

interface ExamenFormModel {
  idAreaAnalisis: string | null;
  nombre: string;
  tipoResultado: string;
}

interface Opcion {
  label: string;
  value: string;
}

const examenVacio = (): ExamenFormModel => ({
  idAreaAnalisis: null,
  nombre: "",
  tipoResultado: "NUMERICO",
});

@Component({
  selector: "app-examen",
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
  templateUrl: "./examenes.html",
  styleUrl: "./examenes.scss",
  providers: [MessageService, ConfirmationService],
})
export class ExamenesPage {
  private readonly examenesService = inject(ExamenesService);
  private readonly areasService = inject(AreasAnalisisService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "area", header: "Área de análisis" },
    { field: "nombre", header: "Nombre" },
    { field: "tipoResultado", header: "Tipo de resultado" },
    { field: "estado", header: "Estado" },
  ];

  private readonly examenes = rxResource({
    stream: () => this.examenesService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly areas = rxResource({
    stream: () => this.areasService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly areaOptions = computed<Opcion[]>(() =>
    (this.areas.value()?.items ?? []).map((area) => ({
      label: area.nombre,
      value: area.id,
    })),
  );

  protected readonly tipoOptions: Opcion[] = TIPOS_RESULTADO.map((tipo) => ({
    label: tipo,
    value: tipo,
  }));

  protected readonly filas = computed<ExamenRow[] | undefined>(() => {
    const resultado = this.examenes.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      idAreaAnalisis: item.idAreaAnalisis,
      area: this.areaNombre(item.idAreaAnalisis),
      nombre: item.nombre,
      tipoResultado: item.tipoResultado,
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVA" : "INACTIVA",
    }));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: ExamenRow[] | null = null;
  protected examen: ExamenFormModel = examenVacio();
  protected esNuevo = false;
  protected idEditando: string | null = null;

  protected errores(): Partial<Record<keyof ExamenFormModel, string>> {
    const errores: Partial<Record<keyof ExamenFormModel, string>> = {};
    const nombre = this.examen.nombre.trim();

    if (!this.examen.idAreaAnalisis)
      errores.idAreaAnalisis = "El área de análisis es obligatoria.";
    if (!nombre) errores.nombre = "El nombre es obligatorio.";
    else if (nombre.length > 150)
      errores.nombre = "El nombre no debe superar los 150 caracteres.";
    if (!this.examen.tipoResultado)
      errores.tipoResultado = "El tipo de resultado es obligatorio.";

    return errores;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.examen = examenVacio();
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editExamen(row: ExamenRow): void {
    this.idEditando = row.id;
    this.examen = {
      idAreaAnalisis: row.idAreaAnalisis,
      nombre: row.nombre,
      tipoResultado: row.tipoResultado,
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
      idAreaAnalisis: this.examen.idAreaAnalisis as string,
      nombre: this.examen.nombre.trim(),
      tipoResultado: this.examen.tipoResultado,
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.examenesService.crear(payload)
      : this.examenesService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: (guardado) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación exitosa",
          detail: this.esNuevo
            ? `Examen ${guardado.nombre} creado`
            : `Examen ${guardado.nombre} actualizado`,
          life: 3000,
        });
        this.examenes.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No se pudo guardar el examen",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: ExamenRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el examen ${row.nombre}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.examenesService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Examen ${row.nombre} eliminado`,
              life: 3000,
            });
            this.examenes.reload();
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

  private areaNombre(id: string): string {
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
        return "No tenés permiso para gestionar exámenes.";
      if (error.status === 409)
        return "No se puede eliminar el examen porque tiene registros asociados.";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}
