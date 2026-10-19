/** Coincide con `PaginatedResult<T>` del backend. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limite: number;
  pagina: number;
  totalPaginas: number;
}

export interface PaginationQuery {
  limite?: number;
  pagina?: number;
  filtro?: string;
}
