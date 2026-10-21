import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  obtener(id: string): Observable<Rol> {
    return this.http
      .get<ApiEnvelope<Rol>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }
}
