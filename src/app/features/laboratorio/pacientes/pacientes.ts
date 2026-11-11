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
import { PacientesService } from "../../../core/services/pacientes.service";
import { PersonasService } from "../../../core/services/personas.service";
import { HasPermission } from "../../../core/directives/has-permission.directive";

interface PacienteRow {
  id: string;
  idPersona: string;
  persona: string;
  codigo: string;
  esActivo: boolean;
  estado: "ACTIVO" | "INACTIVO";
}

interface PacienteFormModel {
  idPersona: string | null;
  codigo: string;
}

interface Opcion {
  label: string;
  value: string;
}

const pacienteVacio = (): PacienteFormModel => ({
  idPersona: null,
  codigo: "",
});

@Component({
  selector: "app-paciente",
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
  templateUrl: "./pacientes.html",
  styleUrl: "./pacientes.scss",
  providers: [MessageService, ConfirmationService],
})
export class PacientesPage {
  private readonly pacientesService = inject(PacientesService);
  private readonly personasService = inject(PersonasService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "codigo", header: "Código" },
    { field: "persona", header: "Persona" },
    { field: "estado", header: "Estado" },
  ];

  private readonly pacientes = rxResource({
    stream: () => this.pacientesService.listar({ limite: 100, pagina: 1 }),
  });

  private readonly personas = rxResource({
    stream: () => this.personasService.listar({ limite: 100, pagina: 1 }),
  });

  protected readonly personaOptions = computed<Opcion[]>(() =>
    (this.personas.value()?.items ?? []).map((persona) => ({
      label: this.nombrePersona(persona),
      value: persona.id,
    })),
  );

  protected readonly filas = computed<PacienteRow[] | undefined>(() => {
    const resultado = this.pacientes.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      idPersona: item.idPersona,
      persona: this.personaNombre(item.idPersona),
      codigo: item.codigo,
      esActivo: item.esActivo,
      estado: item.esActivo ? "ACTIVO" : "INACTIVO",
    }));
  });

  protected dialogVisible = false;
  protected submitted = false;
  protected guardando = false;
  protected seleccionados: PacienteRow[] | null = null;
  protected paciente: PacienteFormModel = pacienteVacio();
  protected esNuevo = false;
  protected idEditando: string | null = null;

  protected errores(): Partial<Record<keyof PacienteFormModel, string>> {
    const errores: Partial<Record<keyof PacienteFormModel, string>> = {};
    const codigo = this.paciente.codigo.trim();

    if (!this.paciente.idPersona)
      errores.idPersona = "La persona es obligatoria.";
    if (!codigo) errores.codigo = "El código es obligatorio.";
    else if (codigo.length > 50)
      errores.codigo = "El código no debe superar los 50 caracteres.";

    return errores;
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  protected openNew(): void {
    this.paciente = pacienteVacio();
    this.idEditando = null;
    this.esNuevo = true;
    this.submitted = false;
    this.dialogVisible = true;
  }

  protected editPaciente(row: PacienteRow): void {
    this.idEditando = row.id;
    this.paciente = {
      idPersona: row.idPersona,
      codigo: row.codigo,
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
      idPersona: this.paciente.idPersona as string,
      codigo: this.paciente.codigo.trim().toUpperCase(),
    };

    this.guardando = true;
    const peticion = this.esNuevo
      ? this.pacientesService.crear(payload)
      : this.pacientesService.actualizar(this.idEditando as string, payload);

    peticion.subscribe({
      next: (guardado) => {
        this.guardando = false;
        this.dialogVisible = false;
        this.submitted = false;
        this.messageService.add({
          severity: "success",
          summary: "Operación realizada correctamente",
          detail: this.esNuevo
            ? `Se creó el paciente ${guardado.codigo}.`
            : `Se actualizó el paciente ${guardado.codigo}.`,
          life: 3000,
        });
        this.pacientes.reload();
      },
      error: (error: unknown) => {
        this.guardando = false;
        this.messageService.add({
          severity: "error",
          summary: "No fue posible guardar el paciente",
          detail: this.mensajeError(error),
          life: 5000,
        });
      },
    });
  }

  protected eliminar(row: PacienteRow): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el paciente ${row.codigo}?`,
      header: "Confirmar",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Sí",
      rejectLabel: "No",
      accept: () => {
        this.pacientesService.eliminar(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: "success",
              summary: "Operación realizada correctamente",
              detail: `Se eliminó el paciente ${row.codigo}.`,
              life: 3000,
            });
            this.pacientes.reload();
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

  private nombrePersona(persona: {
    nombres: string;
    primerApellido: string;
    segundoApellido: string | null;
    numeroDocumento: string | null;
  }): string {
    const nombre = [
      persona.nombres,
      persona.primerApellido,
      persona.segundoApellido,
    ]
      .filter(Boolean)
      .join(" ");
    return persona.numeroDocumento
      ? `${nombre} · ${persona.numeroDocumento}`
      : nombre;
  }

  private personaNombre(id: string): string {
    const persona = this.personas
      .value()
      ?.items.find((item) => item.id === id);
    return persona ? this.nombrePersona(persona) : id;
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | undefined;
      if (Array.isArray(body?.message)) return body.message.join(", ");
      if (typeof body?.message === "string") return body.message;
      if (error.status === 403)
        return "No tiene permiso para gestionar pacientes.";
      if (error.status === 409)
        return "Ya existe un paciente con ese código.";
    }
    return "Se produjo un error inesperado. Intente nuevamente.";
  }
}
