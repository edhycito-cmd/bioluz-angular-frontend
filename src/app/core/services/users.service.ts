import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import { PaginatedResult } from '../models/pagination.model';
import { UsuarioListado, UsuarioListadoQuery } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuario`;

  listar(query: UsuarioListadoQuery = {}): Observable<PaginatedResult<UsuarioListado>> {
    let params = new HttpParams();

    if (query.limite !== undefined) params = params.set('limite', query.limite);
    if (query.pagina !== undefined) params = params.set('pagina', query.pagina);
    if (query.filtro) params = params.set('filtro', query.filtro);
    if (query.esActivo !== undefined) params = params.set('esActivo', query.esActivo);
    if (query.numeroDocumento) params = params.set('numeroDocumento', query.numeroDocumento);
    if (query.telefono) params = params.set('telefono', query.telefono);

    return this.http
      .get<ApiEnvelope<PaginatedResult<UsuarioListado>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }
}
