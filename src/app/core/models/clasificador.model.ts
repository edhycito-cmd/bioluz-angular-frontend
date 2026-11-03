import { PaginatedResult, PaginationQuery } from "./pagination.model";

/** Coincide con `ClasificadorProps.toPublicObject()` del backend (GET /clasificadores). */
export interface Clasificador {
  id: string;
  codigo: string | null;
  dominio: string;
  nombre: string | null;
  descripcion: string | null;
  orden: number;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface ClasificadorListadoQuery extends PaginationQuery {
  esActivo?: boolean;
}

/**
 * Payload de POST /clasificadores. El `id` UUID lo asigna la base de datos;
 * `codigo` y `dominio` son obligatorios.
 */
export interface CrearClasificadorPayload {
  codigo: string;
  dominio: string;
  nombre?: string | null;
  descripcion?: string | null;
  orden?: number;
}

/** Payload de PATCH /clasificadores/:id. `codigo` y `dominio` no son modificables. */
export interface ActualizarClasificadorPayload {
  nombre?: string | null;
  descripcion?: string | null;
  orden?: number;
}

/** Coincide con `DetalleClasificadorProps.toPublicObject()` (GET /clasificadores/detalle). */
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

export interface DetalleClasificadorListadoQuery extends PaginationQuery {
  idClasificador?: string;
  esActivo?: boolean;
}

/** Payload de POST /clasificadores/detalle. La PK es UUID generada por el backend. */
export interface CrearDetalleClasificadorPayload {
  codigo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  orden?: number;
  idClasificador?: string | null;
}

/** Payload de PATCH /clasificadores/detalle/:id. */
export interface ActualizarDetalleClasificadorPayload {
  codigo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  orden?: number;
  idClasificador?: string | null;
}
