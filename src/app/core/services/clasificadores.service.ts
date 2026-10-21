import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import {
  ActualizarClasificadorPayload,
  Clasificador,
  CrearClasificadorPayload,
} from '../models/clasificador.model';
import { PaginatedResult } from '../models/pagination.model';

@Injectable({ providedIn: 'root' })
export class ClasificadoresService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clasificadores`;

  listar(
    query: { limite?: number; pagina?: number; filtro?: string; esActivo?: boolean } = {},
  ): Observable<PaginatedResult<Clasificador>> {
    const params: Record<string, string | number> = {
      limite: query.limite ?? 100,
      pagina: query.pagina ?? 1,
    };
    if (query.filtro) params['filtro'] = query.filtro;
    if (typeof query.esActivo === 'boolean') params['esActivo'] = String(query.esActivo);

    return this.http
      .get<ApiEnvelope<PaginatedResult<Clasificador>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  obtener(id: string): Observable<Clasificador> {
    return this.http
      .get<ApiEnvelope<Clasificador>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  crear(payload: CrearClasificadorPayload): Observable<Clasificador> {
    return this.http
      .post<ApiEnvelope<Clasificador>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  actualizar(id: string, payload: ActualizarClasificadorPayload): Observable<Clasificador> {
    return this.http
      .patch<ApiEnvelope<Clasificador>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /** El backend hace borrado lógico (esActivo = false). */
  eliminar(id: string): Observable<Clasificador> {
    return this.http
      .delete<ApiEnvelope<Clasificador>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }
}
