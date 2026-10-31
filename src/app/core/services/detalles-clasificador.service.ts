import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../environments/environment";
import { ApiEnvelope } from "../models/auth.model";
import {
  ActualizarDetalleClasificadorPayload,
  CrearDetalleClasificadorPayload,
  DetalleClasificador,
} from "../models/clasificador.model";
import { PaginatedResult } from "../models/pagination.model";

@Injectable({ providedIn: "root" })
export class DetallesClasificadorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clasificadores/detalle`;

  /**
   * Detalles de un clasificador, ej. `genero_id` → MASCULINO / FEMENINO / OTRO.
   * (Usado por los selects de otros módulos.)
   */
  listarPorCodigoClasificador(
    codigo: string,
  ): Observable<DetalleClasificador[]> {
    return this.http
      .get<
        ApiEnvelope<DetalleClasificador[]>
      >(`${this.baseUrl}/codigo/${codigo}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Listado paginado, opcionalmente filtrado por clasificador y/o estado
   * (permisión `read` sobre `/api/detalles-clasificador`).
   */
  listar(
    query: {
      limite?: number;
      pagina?: number;
      idClasificador?: string;
      esActivo?: boolean;
    } = {},
  ): Observable<PaginatedResult<DetalleClasificador>> {
    const params: Record<string, string | number> = {
      limite: query.limite ?? 100,
      pagina: query.pagina ?? 1,
    };
    if (query.idClasificador) params["idClasificador"] = query.idClasificador;
    if (typeof query.esActivo === "boolean")
      params["esActivo"] = String(query.esActivo);

    return this.http
      .get<ApiEnvelope<PaginatedResult<DetalleClasificador>>>(this.baseUrl, {
        params,
      })
      .pipe(map((res) => res.data));
  }

  obtener(id: string): Observable<DetalleClasificador> {
    return this.http
      .get<ApiEnvelope<DetalleClasificador>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  crear(
    payload: CrearDetalleClasificadorPayload,
  ): Observable<DetalleClasificador> {
    return this.http
      .post<ApiEnvelope<DetalleClasificador>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  actualizar(
    id: string,
    payload: ActualizarDetalleClasificadorPayload,
  ): Observable<DetalleClasificador> {
    return this.http
      .patch<ApiEnvelope<DetalleClasificador>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /** El backend hace borrado lógico (esActivo = false). */
  eliminar(id: string): Observable<DetalleClasificador> {
    return this.http
      .delete<ApiEnvelope<DetalleClasificador>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }
}
