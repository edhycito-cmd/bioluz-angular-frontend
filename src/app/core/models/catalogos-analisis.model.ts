/** Entidades de configuración de análisis (catálogos del laboratorio). */

export interface CondicionFisiologica {
  id: string;
  codigo: string;
  nombre: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearCondicionFisiologicaPayload {
  codigo: string;
  nombre: string;
}

export type ActualizarCondicionFisiologicaPayload =
  Partial<CrearCondicionFisiologicaPayload>;

export interface AreaAnalisis {
  id: string;
  nombre: string;
  idArea: string | null;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearAreaAnalisisPayload {
  nombre: string;
  idArea?: string | null;
}

export type ActualizarAreaAnalisisPayload = Partial<CrearAreaAnalisisPayload>;

export interface Examen {
  id: string;
  idAreaAnalisis: string;
  nombre: string;
  tipoResultado: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearExamenPayload {
  idAreaAnalisis: string;
  nombre: string;
  tipoResultado: string;
}

export type ActualizarExamenPayload = Partial<CrearExamenPayload>;

export interface Plantilla {
  id: string;
  plantilla: string;
  nombre: string;
  formatoInformeId: number;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearPlantillaPayload {
  plantilla: string;
  nombre: string;
  formatoInformeId: number;
}

export type ActualizarPlantillaPayload = Partial<CrearPlantillaPayload>;

export interface ValorReferencia {
  id: string;
  tipoDato: string;
  valorMinimo: number | null;
  valorMaximo: number | null;
  texto: string | null;
  descripcion: string | null;
  tipos: string | null;
  idUnidadMedida: string | null;
  idCondicion: string | null;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearValorReferenciaPayload {
  tipoDato: string;
  valorMinimo?: number | null;
  valorMaximo?: number | null;
  texto?: string | null;
  descripcion?: string | null;
  tipos?: string | null;
  idUnidadMedida?: string | null;
  idCondicion?: string | null;
}

export type ActualizarValorReferenciaPayload =
  Partial<CrearValorReferenciaPayload>;

export interface ValorReferenciaAnalisis {
  id: string;
  idReferencia: string;
  idExamen: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}
