import { PaginatedResult, PaginationQuery } from "./pagination.model";

/** Coincide con `RolProps.toPublicObject()` del backend (GET /roles). */
export interface Rol {
  id: string;
  rol: string;
  descripcion: string;
  tipo: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface RolListadoQuery extends PaginationQuery {
  tipo?: string;
  esActivo?: boolean;
}

export interface RolEsactivoQuery {
  limite?: number;
  pagina?: number;
  filtro?: string;
  tipo?: string;
  esActivo?: boolean;
}

export type RolesPaginatedResult = PaginatedResult<Rol>;
