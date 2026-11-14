import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { Observable, forkJoin, map, of, switchMap } from "rxjs";
import { Table, TableModule } from "@openng/optimus-ui/table";
import { ButtonModule } from "@openng/optimus-ui/button";
import { RippleModule } from "@openng/optimus-ui/ripple";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { InputIconModule } from "@openng/optimus-ui/inputicon";
import { IconFieldModule } from "@openng/optimus-ui/iconfield";
import { ExamenesService } from "../../../core/services/examenes.service";
import { InformesService } from "../../../core/services/informes.service";
import { ResultadosService } from "../../../core/services/resultados.service";
import { PaginatedResult } from "../../../core/models/pagination.model";

interface ResultadoReporteRow {
  id: string;
  examen: string;
  informe: string;
  valorNumerico: number | null;
  valorTexto: string;
  interpretacion: string;
  documento: string;
}

import { AppPageHeader } from "../../../layout/component/app.page-header";
import { AppEmptyState } from "../../../layout/component/app.empty-state";

@Component({
  selector: "app-reporte-resultados",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block" },
  imports: [
    AppPageHeader,
    AppEmptyState,
    TableModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    InputIconModule,
    IconFieldModule,
  ],
  templateUrl: "./resultados.html",
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
    stream: () => this.listarTodo((query) => this.resultadosService.listar(query)),
  });

  private readonly examenes = rxResource({
    stream: () => this.listarTodo((query) => this.examenesService.listar(query)),
  });

  private readonly informes = rxResource({
    stream: () => this.listarTodo((query) => this.informesService.listar(query)),
  });

  protected readonly filas = computed<ResultadoReporteRow[] | undefined>(() => {
    const items = this.resultados.value();
    if (items === undefined) return undefined;
    return items.map((item) => ({
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

  /**
   * Descarga todas las páginas del listado (el backend limita cada página a
   * 100 registros). Sin esto, el reporte y la exportación CSV verían solo la
   * primera página cuando el catálogo supera ese tope.
   */
  private listarTodo<T>(
    listar: (query: { limite: number; pagina: number }) => Observable<PaginatedResult<T>>,
  ): Observable<T[]> {
    return listar({ limite: 100, pagina: 1 }).pipe(
      switchMap((primera) => {
        const totalPaginas = Math.max(1, primera.totalPaginas);
        if (totalPaginas === 1) return of(primera.items);

        const restantes = Array.from({ length: totalPaginas - 1 }, (_, i) =>
          listar({ limite: 100, pagina: i + 2 }).pipe(map((p) => p.items)),
        );
        return forkJoin(restantes).pipe(
          map((paginas) => [...primera.items, ...paginas.flat()]),
        );
      }),
    );
  }

  private examenLabel(id: string): string {
    return (
      this.examenes.value()?.find((item) => item.id === id)?.nombre ?? id
    );
  }

  private informeLabel(id: string): string {
    const informe = this.informes.value()?.find((item) => item.id === id);
    return informe
      ? `${informe.id.slice(0, 8)} · ${new Date(
          informe.fechaInforme,
        ).toLocaleDateString("es-ES")}`
      : id;
  }
}
