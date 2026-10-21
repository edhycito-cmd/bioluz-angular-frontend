import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import { DetalleClasificador } from '../models/clasificador.model';
import { PaginatedResult } from '../models/pagination.model';

@Injectable({ providedIn: 'root' })
export class DetallesClasificadorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/detalles-clasificador`;

  /** Detalles de un clasificador, ej. `genero_id` → MASCULINO / FEMENINO / OTRO. */
  listarPorClasificador(
    idClasificador: string,
    query: { limite?: number; pagina?: number } = {},
  ): Observable<PaginatedResult<DetalleClasificador>> {
    let params = new HttpParams();

    params = params.set('limite', query.limite ?? 50);
    params = params.set('pagina', query.pagina ?? 1);

    return this.http
      .get<ApiEnvelope<PaginatedResult<DetalleClasificador>>>(
        `${this.baseUrl}/clasificador/${idClasificador}`,
        { params },
      )
      .pipe(map((res) => res.data));
  }
}
