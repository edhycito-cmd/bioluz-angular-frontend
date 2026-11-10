import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { ToolbarModule } from "@openng/optimus-ui/toolbar";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ExamenesService } from "../../../core/services/examenes.service";
import { InformesService } from "../../../core/services/informes.service";
import { ResultadosService } from "../../../core/services/resultados.service";

interface ResultadoReporteRow {
  id: string;
  examen: string;
  informe: string;
  valorNumerico: number | null;
  valorTexto: string;
  interpretacion: string;
  documento: string;
}

@Component({
  selector: "app-reporte-resultados",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TableModule,
    ButtonModule,
    RippleModule,
    ToolbarModule,
    InputTextModule,
    InputIconModule,
    IconFieldModule,
  ],
  templateUrl: "./resultados.html",
  styleUrl: "./resultados.scss",
})
export class ReporteResultadosPage {
  private readonly resultadosService = inject(ResultadosService);
  private readonly examenesService = inject(ExamenesService);
  private readonly informesService = inject(InformesService);

  protected readonly dt = viewChild.required<Table>("dt");

  protected readonly cols = [
    { field: "examen", header: "Examen" },
    { field: "informe", header: "Informe" },
    { field: "valorNumerico", header: "Valor numérico" },
    { field: "valorTexto", header: "Valor texto" },
    { field: "interpretacion", header: "Interpretación" },
    { field: "documento", header: "Documento" },
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

  protected readonly filas = computed<ResultadoReporteRow[] | undefined>(() => {
    const resultado = this.resultados.value();
    if (resultado === undefined) return undefined;
    return resultado.items.map((item) => ({
      id: item.id,
      examen: this.examenLabel(item.idExamen),
      informe: this.informeLabel(item.idInforme),
      valorNumerico: item.valorNumerico,
      valorTexto: item.valorTexto ?? "",
      interpretacion: item.interpretacion ?? "",
      documento: item.documento ?? "",
    }));
  });

  protected onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  protected exportCSV(): void {
    this.dt().exportCSV();
  }

  private examenLabel(id: string): string {
    return (
      this.examenes.value()?.items.find((item) => item.id === id)?.nombre ?? id
    );
  }

  private informeLabel(id: string): string {
    const informe = this.informes.value()?.items.find((item) => item.id === id);
    return informe
      ? `${informe.id.slice(0, 8)} · ${new Date(
          informe.fechaInforme,
        ).toLocaleDateString("es-ES")}`
      : id;
  }
}
