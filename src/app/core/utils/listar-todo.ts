import { forkJoin, map, of, switchMap, type Observable } from "rxjs";
import type { PaginatedResult } from "../models/pagination.model";

/**
 * Descarga todas las páginas de un listado (el backend limita cada página a
 * 100 registros) para que las búsquedas del cliente operen sobre el catálogo
 * completo.
 */
export function listarTodo<T>(
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
