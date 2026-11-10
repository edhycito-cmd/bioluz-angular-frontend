/** Coincide con `Institucion.toPublicObject()` del backend. */
export interface Institucion {
  id: string;
  nombre: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearInstitucionPayload {
  nombre: string;
}

export type ActualizarInstitucionPayload = Partial<CrearInstitucionPayload>;
