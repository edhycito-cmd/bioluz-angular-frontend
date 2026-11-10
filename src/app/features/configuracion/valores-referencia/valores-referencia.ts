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
import { CondicionesFisiologicasService } from "../../../core/services/condiciones-fisiologicas.service";
import { DetallesClasificadorService } from "../../../core/services/detalles-clasificador.service";
import { ValoresReferenciaService } from "../../../core/services/valores-referencia.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

interface ValorRow {
  id: string;
  tipoDato: string;
  valorMinimo: number | null;
  valorMaximo: number | null;
  texto: string;
  descripcion: string;
  tipos: string;
  idUnidadMedida: string | null;
  unidad: string;
  idCondicion: string | null;
  condicion: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

interface ValorFormModel {
  tipoDato: string;
  valorMinimo: number | null;
  valorMaximo: number | null;
  texto: string;
  descripcion: string;
  tipos: string;
  idUnidadMedida: string | null;
  idCondicion: string | null;
}

interface Opcion {
  label: string;
  value: string;
}

const valorVacio = (): ValorFormModel => ({
  tipoDato: "NUMERICO",
  valorMinimo: null,
  valorMaximo: null,
  texto: "",
  descripcion: "",
  tipos: "",
  idUnidadMedida: null,
  idCondicion: null,
});

@Component({
  selector: "app-valores-referencia",
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
  templateUrl: "./valores-referencia.html",
  styleUrl: "./valores-referencia.scss",
  providers: [MessageService, ConfirmationService],
})
export class ValoresReferenciaPage {
  private readonly valoresService = inject(ValoresReferenciaService);
  private readonly condicionesService = inject(CondicionesFisiologicasService);
  private readonly detallesService = inject(DetallesClasificadorService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "tipoDato", header: "Tipo de dato" },
    { field: "valorMinimo", header: "Mínimo" },
    { field: "valorMaximo", header: "Máximo" },
    { field: "texto", header: "Texto" },
    { field: "condicion", header: "Condición" },
    { field: "unidad", header: "Unidad" },
    { field: "estado", header: "Estado" },
  ];

  private readonly valores = rxResource({
    stream: () => this.valoresService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly condiciones = rxResource({
    stream: () => this.condicionesService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly unidades = rxResource({
    stream: () =>
      this.detallesService.listarPorCodigoClasificador("UNIDAD_MEDIDA"),
  });

  protected readonly condicionOptions = computed<Opcion[]>(() =>
    (this.condiciones.value()?.items ?? []).map((condicion) => ({
      label: condicion.nombre,
      value: condicion.id,
    })),
  );

  protected readonly unidadOptions = computed<Opcion[]>(() =>
    (this.unidades.value() ?? []).map((unidad) => ({
      label: unidad.nombre ?? unidad.codigo ?? unidad.id,
      value: unidad.id,
    })),
  );

  protected readonly filas = computed<ValorRow[] | undefined>(() => {
    const resultado = this.valores.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      tipoDato: item.tipoDato,
      valorMinimo: item.valorMinimo,
      valorMaximo: item.valorMaximo,
      texto: item.texto ?? "",
      descripcion: item.descripcion ?? "",
      tipos: item.tipos ?? "",
      idUnidadMedida: item.idUnidadMedida,
      unidad: this.unidadNombre(item.idUnidadMedida),
      idCondicion: item.idCondicion,
      condicion: this.condicionNombre(item.idCondicion),
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVA" : "INACTIVA",
    }));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: ValorRow[] | null = null;
  protected valor: ValorFormModel = valorVacio();
  protected esNuevo = false;
  protected idEditando: string | null = null;

  protected errores(): Partial<Record<keyof ValorFormModel, string>> {
    const errores: Partial<Record<keyof ValorFormModel, string>> = {};
    const tipoDato = this.valor.tipoDato.trim();

    if (!tipoDato) errores.tipoDato = "El tipo de dato es obligatorio.";
    else if (tipoDato.length > 50)
      errores.tipoDato = "El tipo de dato no debe superar los 50 caracteres.";

    if (this.valor.texto.trim().length > 255)
      errores.texto = "El texto no debe superar los 255 caracteres.";
    if (this.valor.tipos.trim().length > 100)
      errores.tipos = "Los tipos no deben superar los 100 caracteres.";

    const min = this.valor.valorMinimo;
    const max = this.valor.valorMaximo;
    if (min !== null && max !== null && min > max) {
      errores.valorMaximo =
        "El valor máximo debe ser mayor o igual al mínimo.";
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
    this.valor = valorVacio();
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editValor(row: ValorRow): void {
    this.idEditando = row.id;
    this.valor = {
      tipoDato: row.tipoDato,
      valorMinimo: row.valorMinimo,
      valorMaximo: row.valorMaximo,
      texto: row.texto,
      descripcion: row.descripcion,
      tipos: row.tipos,
      idUnidadMedida: row.idUnidadMedida,
      idCondicion: row.idCondicion,
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
      tipoDato: this.valor.tipoDato.trim(),
      valorMinimo: this.valor.valorMinimo,
      valorMaximo: this.valor.valorMaximo,
      texto: this.valor.texto.trim() || null,
      descripcion: this.valor.descripcion.trim() || null,
      tipos: this.valor.tipos.trim() || null,
      idUnidadMedida: this.valor.idUnidadMedida || null,
      idCondicion: this.valor.idCondicion || null,
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.valoresService.crear(payload)
      : this.valoresService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: (guardado) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación exitosa",
          detail: this.esNuevo
            ? `Valor de referencia ${guardado.tipoDato} creado`
            : `Valor de referencia ${guardado.tipoDato} actualizado`,
          life: 3000,
        });
        this.valores.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No se pudo guardar el valor de referencia",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: ValorRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el valor de referencia ${row.tipoDato}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.valoresService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación exitosa",
              detail: `Valor de referencia ${row.tipoDato} eliminado`,
              life: 3000,
            });
            this.valores.reload();
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

  private condicionNombre(id: string | null): string {
    if (!id) return "—";
    return (
      this.condiciones
        .value()
        ?.items.find((condicion) => condicion.id === id)?.nombre ?? id
    );
  }

  private unidadNombre(id: string | null): string {
    if (!id) return "—";
    const unidad = (this.unidades.value() ?? []).find(
      (detalle) => detalle.id === id,
    );
    return unidad?.nombre ?? unidad?.codigo ?? id;
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403)
        return "No tenés permiso para gestionar valores de referencia.";
      if (error.status === 409)
        return "No se puede eliminar el valor de referencia porque tiene registros asociados.";
    }
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }
}
