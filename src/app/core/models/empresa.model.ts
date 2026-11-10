/** Coincide con `Empresa.toPublicObject()` del backend. */
export interface Empresa {
  id: string;
  nombre: string;
  nit: string;
  slogan: string | null;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearEmpresaPayload {
  nombre: string;
  nit: string;
  slogan?: string | null;
}

export type ActualizarEmpresaPayload = Partial<CrearEmpresaPayload>;

/** Coincide con `Sucursal.toPublicObject()` del backend. */
export interface Sucursal {
  id: string;
  idEmpresa: string;
  codigo: number;
  direccion: string;
  telefono: string | null;
  municipio: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearSucursalPayload {
  idEmpresa: string;
  codigo: number;
  direccion: string;
  telefono?: string | null;
  municipio: string;
}

export type ActualizarSucursalPayload = Partial<CrearSucursalPayload>;
