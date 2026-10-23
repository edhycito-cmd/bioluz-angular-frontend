import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/auth.model';
import { PaginatedResult } from '../models/pagination.model';
import {
  RegistrarUsuarioConPersonaPayload,
  UsuarioListado,
  UsuarioListadoQuery,
} from '../models/user.model';

/** Respuesta de POST /usuario/registrar-con-persona. */
export interface RegistrarUsuarioConPersonaResult {
  user: { id: string; email: string; name: string };
  persona: unknown;
}

/** Body de PATCH /usuario/perfil/contrasena. */
export interface CambiarContrasenaPayload {
  currentPassword: string;
  newPassword: string;
}

/** Respuesta de PATCH /usuario/perfil/contrasena. */
export interface CambiarContrasenaResult {
  success: boolean;
  user: { id: string; email: string; name: string };
}

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

  /** Crea un usuario nuevo junto con su persona (POST /usuario/registrar-con-persona). */
  registrarConPersona(
    payload: RegistrarUsuarioConPersonaPayload,
  ): Observable<ApiEnvelope<RegistrarUsuarioConPersonaResult>> {
    return this.http.post<ApiEnvelope<RegistrarUsuarioConPersonaResult>>(
      `${this.baseUrl}/registrar-con-persona`,
      payload,
    );
  }

  /** Cambia la contraseña del usuario autenticado (PATCH /usuario/perfil/contrasena). */
  cambiarContrasena(
    payload: CambiarContrasenaPayload,
  ): Observable<CambiarContrasenaResult> {
    return this.http
      .patch<ApiEnvelope<CambiarContrasenaResult>>(
        `${this.baseUrl}/perfil/contrasena`,
        payload,
      )
      .pipe(map((res) => res.data));
  }
}
