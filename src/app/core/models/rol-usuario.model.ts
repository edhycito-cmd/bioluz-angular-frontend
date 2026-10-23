import { PaginatedResult, PaginationQuery } from "./pagination.model";

/** Coincide con `RolUsuarioProps.toPublicObject()` del backend (GET /roles-usuarios). */
export interface RolUsuario {
  id: string;
  idRol: string;
  idUsuario: string;
  fechaInicio: string;
  fechaFin: string | null;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface RolUsuarioListadoQuery extends PaginationQuery {
  idUsuario?: string;
  idRol?: string;
  esActivo?: boolean;
}

/** Payload de POST /roles-usuarios (asignar rol a usuario). */
export interface AsignarRolUsuarioPayload {
  idUsuario: string;
  idRol: string;
  fechaInicio?: string | null;
}

/** Payload de PATCH /roles-usuarios/:id (usuario y estado no son actualizables desde aquí). */
export interface ActualizarRolUsuarioPayload {
  idRol?: string;
  fechaInicio?: string;
}

export type RolUsuarioPaginatedResult = PaginatedResult<RolUsuario>;
