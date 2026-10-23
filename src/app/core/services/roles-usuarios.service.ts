import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import {
  ActualizarRolUsuarioPayload,
  AsignarRolUsuarioPayload,
  RolUsuario,
  RolUsuarioListadoQuery,
} from '../models/rol-usuario.model';
import { RolUsuarioPaginatedResult } from '../models/rol-usuario.model';

@Injectable({ providedIn: 'root' })
export class RolesUsuariosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/roles-usuarios`;

  listar(query: RolUsuarioListadoQuery = {}): Observable<RolUsuarioPaginatedResult> {
    let params = new HttpParams();

    params = params.set('limite', query.limite ?? 100);
    params = params.set('pagina', query.pagina ?? 1);
    if (query.filtro) params = params.set('filtro', query.filtro);
    if (query.idUsuario) params = params.set('idUsuario', query.idUsuario);
    if (query.idRol) params = params.set('idRol', query.idRol);
    if (typeof query.esActivo === 'boolean') params = params.set('esActivo', String(query.esActivo));

    return this.http
      .get<ApiEnvelope<RolUsuarioPaginatedResult>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  /** Asignaciones (activas e históricas) de un usuario concreto. */
  listarDeUsuario(
    idUsuario: string,
    query: Omit<RolUsuarioListadoQuery, 'idUsuario'> = {},
  ): Observable<RolUsuarioPaginatedResult> {
    let params = new HttpParams();

    params = params.set('limite', query.limite ?? 100);
    params = params.set('pagina', query.pagina ?? 1);
    if (query.esActivo !== undefined) params = params.set('esActivo', String(query.esActivo));

    return this.http
      .get<ApiEnvelope<RolUsuarioPaginatedResult>>(`${this.baseUrl}/usuario/${idUsuario}`, { params })
      .pipe(map((res) => res.data));
  }

  asignar(payload: AsignarRolUsuarioPayload): Observable<RolUsuario> {
    return this.http
      .post<ApiEnvelope<RolUsuario>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  actualizar(id: string, payload: ActualizarRolUsuarioPayload): Observable<RolUsuario> {
    return this.http
      .patch<ApiEnvelope<RolUsuario>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /** Habilita una asignación revocada: nueva vigencia, esActivo = true y alta en Casbin. */
  habilitar(id: string): Observable<RolUsuario> {
    return this.http
      .patch<ApiEnvelope<RolUsuario>>(`${this.baseUrl}/${id}/habilitar`, {})
      .pipe(map((res) => res.data));
  }

  /** Revoca la asignación: fechaFin = hoy, esActivo = false y baja el rol en Casbin. */
  revocar(id: string): Observable<RolUsuario> {
    return this.http
      .delete<ApiEnvelope<RolUsuario>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }
}
