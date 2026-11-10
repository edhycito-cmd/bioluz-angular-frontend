import { inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../environments/environment";
import { ApiEnvelope } from "../models/auth.model";
import { PaginatedResult } from "../models/pagination.model";

/**
 * Base para los CRUD que siguen el contrato estándar del backend:
 *
 * - `GET    /api/{endpoint}?limite&pagina&filtro&...`
 * - `GET    /api/{endpoint}/:id`
 * - `POST   /api/{endpoint}`
 * - `PATCH  /api/{endpoint}/:id`
 * - `DELETE /api/{endpoint}/:id`
 *
 * Los servicios concretos solo declaran el endpoint y el tipo de entidad.
 */
export abstract class CrudHttpService<T> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly endpoint: string;

  private get baseUrl(): string {
    return `${environment.apiUrl}/${this.endpoint}`;
  }

  listar(query: Record<string, unknown> = {}): Observable<PaginatedResult<T>> {
    let params = new HttpParams()
      .set("limite", String(query["limite"] ?? 100))
      .set("pagina", String(query["pagina"] ?? 1));

    for (const [key, value] of Object.entries(query)) {
      if (key === "limite" || key === "pagina") continue;
      if (value === undefined || value === null || value === "") continue;
      params = params.set(key, String(value));
    }

    return this.http
      .get<ApiEnvelope<PaginatedResult<T>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  obtener(id: string): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  crear(payload: object): Observable<T> {
    return this.http
      .post<ApiEnvelope<T>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  actualizar(id: string, payload: object): Observable<T> {
    return this.http
      .patch<ApiEnvelope<T>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  eliminar(id: string): Observable<T> {
    return this.http
      .delete<ApiEnvelope<T>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }
}
