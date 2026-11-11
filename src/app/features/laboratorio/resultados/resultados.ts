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
import { InputNumberModule } from "@openng/optimus-ui/inputnumber";
import { TextareaModule } from "@openng/optimus-ui/textarea";
import { SelectModule } from "@openng/optimus-ui/select";
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { ExamenesService } from "../../../core/services/examenes.service";
import { InformesService } from "../../../core/services/informes.service";
import { ResultadosService } from "../../../core/services/resultados.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

interface ResultadoRow {
  id: string;
  idExamen: string;
  examen: string;
  idInforme: string;
  informe: string;
  valorNumerico: number | null;
  valorTexto: string;
  interpretacion: string;
  documento: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

interface ResultadoFormModel {
  idExamen: string | null;
  idInforme: string | null;
  valorNumerico: number | null;
  valorTexto: string;
  interpretacion: string;
  documento: string;
}

interface Opcion {
  label: string;
  value: string;
}

const resultadoVacio = (): ResultadoFormModel => ({
  idExamen: null,
  idInforme: null,
  valorNumerico: null,
  valorTexto: "",
  interpretacion: "",
  documento: "",
});

@Component({
  selector: "app-resultado",
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
    SelectModule,
    TagModule,
    DialogModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./resultados.html",
  styleUrl: "./resultados.scss",
  providers: [MessageService, ConfirmationService],
})
export class ResultadosPage {
  private readonly resultadosService = inject(ResultadosService);
  private readonly examenesService = inject(ExamenesService);
  private readonly informesService = inject(InformesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "examen", header: "Examen" },
    { field: "informe", header: "Informe" },
    { field: "valorNumerico", header: "Valor numérico" },
    { field: "valorTexto", header: "Valor texto" },
    { field: "interpretacion", header: "Interpretación" },
    { field: "estado", header: "Estado" },
  ];

  private readonly resultados = rxResource({
    stream: () => this.resultadosService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly examenes = rxResource({
    stream: () => this.examenesService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly informes = rxResource({
    stream: () => this.informesService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly examenOptions = computed<Opcion[]>(() =>
    (this.examenes.value()?.items ?? []).map((examen) => ({
      label: examen.nombre,
      value: examen.id,
    })),
  );

  protected readonly informeOptions = computed<Opcion[]>(() =>
    (this.informes.value()?.items ?? []).map((informe) => ({
      label: this.informeLabel(informe.id, informe.fechaInforme),
      value: informe.id,
    })),
  );

  protected readonly filas = computed<ResultadoRow[] | undefined>(() => {
    const resultado = this.resultados.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      idExamen: item.idExamen,
      examen: this.examenNombre(item.idExamen),
      idInforme: item.idInforme,
      informe: this.informeNombre(item.idInforme),
      valorNumerico: item.valorNumerico,
      valorTexto: item.valorTexto ?? "",
      interpretacion: item.interpretacion ?? "",
      documento: item.documento ?? "",
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVA" : "INACTIVA",
    }));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: ResultadoRow[] | null = null;
  protected resultado: ResultadoFormModel = resultadoVacio();
  protected esNuevo = false;
  protected idEditando: string | null = null;

  protected errores(): Partial<Record<keyof ResultadoFormModel, string>> {
    const errores: Partial<Record<keyof ResultadoFormModel, string>> = {};

    if (!this.resultado.idExamen)
      errores.idExamen = "El examen es obligatorio.";
    if (!this.resultado.idInforme)
      errores.idInforme = "El informe es obligatorio.";
    if (this.resultado.valorTexto.trim().length > 255) {
      errores.valorTexto =
        "El valor de texto no debe superar los 255 caracteres.";
    }
    if (
      this.resultado.valorNumerico === null &&
      !this.resultado.valorTexto.trim()
    ) {
      errores.valorTexto =
        "Introduzca un valor numérico o un valor de texto para el resultado.";
    }

    return errores;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.resultado = resultadoVacio();
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editResultado(row: ResultadoRow): void {
    this.idEditando = row.id;
    this.resultado = {
      idExamen: row.idExamen,
      idInforme: row.idInforme,
      valorNumerico: row.valorNumerico,
      valorTexto: row.valorTexto,
      interpretacion: row.interpretacion,
      documento: row.documento,
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
      idExamen: this.resultado.idExamen as string,
      idInforme: this.resultado.idInforme as string,
      valorNumerico: this.resultado.valorNumerico,
      valorTexto: this.resultado.valorTexto.trim() || null,
      interpretacion: this.resultado.interpretacion.trim() || null,
      documento: this.resultado.documento.trim() || null,
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.resultadosService.crear(payload)
      : this.resultadosService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación realizada correctamente",
          detail: this.esNuevo
            ? "Se creó el resultado."
            : "Se actualizó el resultado.",
          life: 3000,
        });
        this.resultados.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No fue posible guardar el resultado",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: ResultadoRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el resultado del examen ${row.examen}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.resultadosService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación realizada correctamente",
              detail: "Se eliminó el resultado.",
              life: 3000,
            });
            this.resultados.reload();
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

  private examenNombre(id: string): string {
    return (
      this.examenes.value()?.items.find((item) => item.id === id)?.nombre ?? id
    );
  }

  private informeNombre(id: string): string {
    const informe = this.informes.value()?.items.find((item) => item.id === id);
    return informe
      ? this.informeLabel(informe.id, informe.fechaInforme)
      : id;
  }

  private informeLabel(id: string, fechaInforme: string): string {
    return `${id.slice(0, 8)} · ${new Date(
      fechaInforme,
    ).toLocaleDateString("es-ES")}`;
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403)
        return "No tiene permiso para gestionar resultados.";
      if (error.status === 409)
        return "No se puede eliminar el resultado porque tiene registros asociados.";
    }
    return "Se produjo un error inesperado. Intente nuevamente.";
  }
}
