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
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { EmpresasService } from "../../../core/services/empresas.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";
import type { Empresa } from "../../../core/models/empresa.model";

interface EmpresaRow {
  id: string;
  nombre: string;
  nit: string;
  slogan: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

interface EmpresaFormModel {
  nombre: string;
  nit: string;
  slogan: string;
}

const empresaVacia = (): EmpresaFormModel => ({
  nombre: "",
  nit: "",
  slogan: "",
});

@Component({
  selector: "app-empresa",
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
    TagModule,
    DialogModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./empresa.html",
  styleUrl: "./empresa.scss",
  providers: [MessageService, ConfirmationService],
})
export class EmpresaPage {
  private readonly empresasService = inject(EmpresasService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "nombre", header: "Nombre" },
    { field: "nit", header: "NIT" },
    { field: "slogan", header: "Eslogan" },
    { field: "estado", header: "Estado" },
  ];

  protected readonly empresas = rxResource({
    stream: () => this.empresasService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly filas = computed<EmpresaRow[] | undefined>(() => {
    const resultado = this.empresas.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => this.aFila(item));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: EmpresaRow[] | null = null;
  protected empresa: EmpresaFormModel = empresaVacia();
  protected esNuevo = false;
  protected idEditando: string | null = null;

  /** Validaciones explícitas del formulario antes de llamar a la API. */
  protected errores(): Partial<Record<keyof EmpresaFormModel, string>> {
    const errores: Partial<Record<keyof EmpresaFormModel, string>> = {};
    const nombre = this.empresa.nombre.trim();
    const nit = this.empresa.nit.trim();

    if (!nombre) errores.nombre = "El nombre es obligatorio.";
    else if (nombre.length > 150)
      errores.nombre = "El nombre no debe superar los 150 caracteres.";

    if (!nit) errores.nit = "El NIT es obligatorio.";
    else if (nit.length > 20)
      errores.nit = "El NIT no debe superar los 20 caracteres.";

    if (this.empresa.slogan.trim().length > 500)
      errores.slogan = "El eslogan no debe superar los 500 caracteres.";

    return errores;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.empresa = empresaVacia();
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editEmpresa(row: EmpresaRow): void {
    this.idEditando = row.id;
    this.empresa = {
      nombre: row.nombre,
      nit: row.nit,
      slogan: row.slogan,
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
    const errores = this.errores();
    if (Object.keys(errores).length > 0) return;

    const payload = {
      nombre: this.empresa.nombre.trim(),
      nit: this.empresa.nit.trim(),
      slogan: this.empresa.slogan.trim() || null,
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.empresasService.crear(payload)
      : this.empresasService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: (guardada) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación realizada correctamente",
          detail: this.esNuevo
            ? `Se creó la empresa ${guardada.nombre}.`
            : `Se actualizó la empresa ${guardada.nombre}.`,
          life: 3000,
        });
        this.empresas.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No fue posible guardar la empresa",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: EmpresaRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la empresa ${row.nombre}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.empresasService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación realizada correctamente",
              detail: `Se eliminó la empresa ${row.nombre}.`,
              life: 3000,
            });
            this.empresas.reload();
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

  private aFila(item: Empresa): EmpresaRow {
    return {
      id: item.id,
      nombre: item.nombre,
      nit: item.nit,
      slogan: item.slogan ?? "",
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVA" : "INACTIVA",
    };
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403) return "No tiene permiso para gestionar empresas.";
      if (error.status === 409) return "Ya existe una empresa con esos datos.";
    }
    return "Se produjo un error inesperado. Intente nuevamente.";
  }
}
