/** Entidades operativas del laboratorio. */

export interface Paciente {
  id: string;
  idPersona: string;
  codigo: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearPacientePayload {
  idPersona: string;
  codigo: string;
}

export type ActualizarPacientePayload = Partial<CrearPacientePayload>;

export interface OrdenLaboratorio {
  id: string;
  idSucursal: string;
  idPaciente: string;
  idMedico: string;
  idInstitucion: string;
  edadAnios: number;
  edadMeses: number;
  edadDias: number;
  fechaSolicitud: string;
  nroFolio: number;
  generoId: number;
  estado: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearOrdenLaboratorioPayload {
  idSucursal: string;
  idPaciente: string;
  idMedico: string;
  idInstitucion: string;
  edadAnios: number;
  edadMeses: number;
  edadDias: number;
  fechaSolicitud: string;
  nroFolio: number;
  generoId: number;
  estado: string;
}

export type ActualizarOrdenLaboratorioPayload =
  Partial<CrearOrdenLaboratorioPayload>;

export interface Resultado {
  id: string;
  idExamen: string;
  idInforme: string;
  valorNumerico: number | null;
  valorTexto: string | null;
  interpretacion: string | null;
  documento: string | null;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearResultadoPayload {
  idExamen: string;
  idInforme: string;
  valorNumerico?: number | null;
  valorTexto?: string | null;
  interpretacion?: string | null;
  documento?: string | null;
}

export type ActualizarResultadoPayload = Partial<CrearResultadoPayload>;

export interface Informe {
  id: string;
  idOrden: string;
  idAreaAnalisis: string;
  idPersona: string;
  idCondicion: string | null;
  tipoMuestraId: string;
  fechaInforme: string;
  firmado: boolean;
  estado: string;
  formatoInforme: number;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearInformePayload {
  idOrden: string;
  idAreaAnalisis: string;
  idPersona: string;
  tipoMuestraId: string;
  fechaInforme: string;
  formatoInforme: number;
  idCondicion?: string | null;
  firmado?: boolean;
  estado?: string;
}

export type ActualizarInformePayload = Partial<CrearInformePayload>;

export interface Medico {
  id: string;
  idPersona: string;
  especialidad: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CrearMedicoPayload {
  idPersona: string;
  especialidad: string;
}

export type ActualizarMedicoPayload = Partial<CrearMedicoPayload>;
