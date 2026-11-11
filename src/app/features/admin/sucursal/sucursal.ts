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
import { SelectModule } from "@openng/optimus-ui/select";
import { TagModule } from "@openng/optimus-ui/tag";
import { DialogModule } from "@openng/optimus-ui/dialog";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ConfirmDialogModule } from "@openng/optimus-ui/confirmdialog";
import { SucursalesService } from "../../../core/services/sucursales.service";
import { EmpresasService } from "../../../core/services/empresas.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

interface SucursalRow {
  id: string;
  idEmpresa: string;
  empresa: string;
  codigo: number;
  direccion: string;
  telefono: string;
  municipio: string;
  esActivo: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

interface SucursalFormModel {
  idEmpresa: string | null;
  codigo: number | null;
  direccion: string;
  telefono: string;
  municipio: string;
}

interface Opcion {
  label: string;
  value: string;
}

const sucursalVacia = (): SucursalFormModel => ({
  idEmpresa: null,
  codigo: 1,
  direccion: "",
  telefono: "",
  municipio: "",
});

@Component({
  selector: "app-sucursal",
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
    SelectModule,
    TagModule,
    DialogModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    HasPermission,
  ],
  templateUrl: "./sucursal.html",
  styleUrl: "./sucursal.scss",
  providers: [MessageService, ConfirmationService],
})
export class SucursalPage {
  private readonly sucursalesService = inject(SucursalesService);
  private readonly empresasService = inject(EmpresasService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "empresa", header: "Empresa" },
    { field: "codigo", header: "Código" },
    { field: "direccion", header: "Dirección" },
    { field: "municipio", header: "Municipio" },
    { field: "telefono", header: "Teléfono" },
    { field: "estado", header: "Estado" },
  ];

  private readonly sucursales = rxResource({
    stream: () => this.sucursalesService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly empresas = rxResource({
    stream: () => this.empresasService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly empresaOptions = computed<Opcion[]>(() =>
    (this.empresas.value()?.items ?? []).map((empresa) => ({
      label: `${empresa.nombre} (${empresa.nit})`,
      value: empresa.id,
    })),
  );

  protected readonly filas = computed<SucursalRow[] | undefined>(() => {
    const resultado = this.sucursales.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      idEmpresa: item.idEmpresa,
      empresa: this.empresaNombre(item.idEmpresa),
      codigo: item.codigo,
      direccion: item.direccion,
      telefono: item.telefono ?? "",
      municipio: item.municipio,
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVA" : "INACTIVA",
    }));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: SucursalRow[] | null = null;
  protected sucursal: SucursalFormModel = sucursalVacia();
  protected esNuevo = false;
  protected idEditando: string | null = null;

  protected errores(): Partial<Record<keyof SucursalFormModel, string>> {
    const errores: Partial<Record<keyof SucursalFormModel, string>> = {};
    const codigo = Number(this.sucursal.codigo);

    if (!this.sucursal.idEmpresa)
      errores.idEmpresa = "La empresa es obligatoria.";
    if (
      this.sucursal.codigo === null ||
      this.sucursal.codigo === undefined ||
      Number.isNaN(codigo) ||
      !Number.isInteger(codigo)
    ) {
      errores.codigo = "El código debe ser un número entero.";
    }
    if (!this.sucursal.direccion.trim())
      errores.direccion = "La dirección es obligatoria.";
    if (!this.sucursal.municipio.trim())
      errores.municipio = "El municipio es obligatorio.";
    else if (this.sucursal.municipio.trim().length > 100)
      errores.municipio = "El municipio no debe superar los 100 caracteres.";
    if (this.sucursal.telefono.trim().length > 40)
      errores.telefono = "El teléfono no debe superar los 40 caracteres.";

    return errores;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.sucursal = sucursalVacia();
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editSucursal(row: SucursalRow): void {
    this.idEditando = row.id;
    this.sucursal = {
      idEmpresa: row.idEmpresa,
      codigo: row.codigo,
      direccion: row.direccion,
      telefono: row.telefono,
      municipio: row.municipio,
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
      idEmpresa: this.sucursal.idEmpresa as string,
      codigo: Number(this.sucursal.codigo),
      direccion: this.sucursal.direccion.trim(),
      telefono: this.sucursal.telefono.trim() || null,
      municipio: this.sucursal.municipio.trim(),
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.sucursalesService.crear(payload)
      : this.sucursalesService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: (guardada) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación realizada correctamente",
          detail: this.esNuevo
            ? `Se creó la sucursal ${guardada.codigo}.`
            : `Se actualizó la sucursal ${guardada.codigo}.`,
          life: 3000,
        });
        this.sucursales.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No fue posible guardar la sucursal",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: SucursalRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la sucursal ${row.codigo} · ${row.municipio}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.sucursalesService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación realizada correctamente",
              detail: `Se eliminó la sucursal ${row.codigo}.`,
              life: 3000,
            });
            this.sucursales.reload();
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

  private empresaNombre(id: string): string {
    return (
      this.empresas.value()?.items.find((empresa) => empresa.id === id)
        ?.nombre ?? id
    );
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403)
        return "No tiene permiso para gestionar sucursales.";
      if (error.status === 409)
        return "Ya existe una sucursal con ese código en la empresa.";
    }
    return "Se produjo un error inesperado. Intente nuevamente.";
  }
}
