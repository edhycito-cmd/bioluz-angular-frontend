import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import { Rol, RolListadoQuery } from '../models/rol.model';
import { PaginatedResult } from '../models/pagination.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/roles`;

  listar(query: RolListadoQuery = {}): Observable<PaginatedResult<Rol>> {
    let params = new HttpParams();

    params = params.set('limite', query.limite ?? 100);
    params = params.set('pagina', query.pagina ?? 1);
    if (query.filtro) params = params.set('filtro', query.filtro);
    if (query.tipo) params = params.set('tipo', query.tipo);
    if (typeof query.esActivo === 'boolean') params = params.set('esActivo', String(query.esActivo));

    return this.http
      .get<ApiEnvelope<PaginatedResult<Rol>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  /** Devuelve todos los roles, recorriendo todas las páginas del backend. */
  listarTodos(): Observable<Rol[]> {
    return this.listar({ limite: 100, pagina: 1 }).pipe(
      switchMap((primera) => {
        const paginasRestantes = Math.max(0, primera.totalPaginas - 1);
        if (paginasRestantes === 0) return of(primera.items);

        const peticiones = Array.from({ length: paginasRestantes }, (_, i) =>
          this.listar({ limite: 100, pagina: i + 2 }),
        );
        return forkJoin(peticiones).pipe(
          map((resto) => [
            ...primera.items,
            ...resto.flatMap((pagina) => pagina.items),
          ]),
        );
      }),
    );
  }

  obtener(id: string): Observable<Rol> {
    return this.http
      .get<ApiEnvelope<Rol>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }
}
