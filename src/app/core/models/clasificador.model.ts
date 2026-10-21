import { PaginatedResult, PaginationQuery } from "./pagination.model";

/** Coincide con `ClasificadorProps.toPublicObject()` del backend (GET /clasificadores). */
export interface Clasificador {
  id: string;
  dominio: string | null;
  descripcion: string | null;
  orden: number;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface ClasificadorListadoQuery extends PaginationQuery {
  esActivo?: boolean;
}

/** Payload de POST /clasificadores. El `id` es la PK natural (VarChar 50). */
export interface CrearClasificadorPayload {
  id: string;
  dominio?: string | null;
  descripcion?: string | null;
  orden?: number;
}

/** Payload de PATCH /clasificadores/:id. */
export interface ActualizarClasificadorPayload {
  dominio?: string | null;
  descripcion?: string | null;
  orden?: number;
}

/** Coincide con `DetalleClasificadorProps.toPublicObject()` (GET /detalles-clasificador). */
export interface DetalleClasificador {
  id: string;
  codigo: string | null;
  nombre: string | null;
  descripcion: string | null;
  orden: number;
  idClasificador: string | null;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}
