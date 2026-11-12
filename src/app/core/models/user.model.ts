/** Coincide con el `user` que devuelven /auth/login y /auth/register. */
export interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * Coincide con `User.toPublicObject()` del backend
 * (GET /usuario/perfil → data.user).
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

/** Coincide con `Persona.toPublicObject()` del backend. */
export interface Persona {
  id: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  generoId: number;
  tipoDocumentoIdentidadId: number | null;
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
  telefono: string | null;
  email: string | null;
  distincion: string | null;
  domicilio: string | null;
  usuarioId: string | null;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

/** Respuesta de GET /usuario/perfil. */
export interface UserProfileResult {
  user: UserProfile;
  persona: Persona | null;
}

/** Coincide con `UsuarioConPersona` del backend (GET /usuario). */
export interface UsuarioListado {
  user: {
    id: string;
    email: string;
    esActivo: boolean;
  };
  persona: {
    id: string;
    nombres: string;
    primerApellido: string;
    segundoApellido: string | null;
    numeroDocumento: string | null;
    telefono: string | null;
    fechaNacimiento: string | null;
    email: string | null;
    distincion: string | null;
    domicilio: string | null;
  } | null;
}

export interface UsuarioListadoQuery {
  limite?: number;
  pagina?: number;
  filtro?: string;
  esActivo?: boolean;
  numeroDocumento?: string;
  telefono?: string;
}

/** Detalle administrativo de un usuario para el dialog de edición (GET /usuario/:id). */
export interface UsuarioDetalle {
  user: {
    id: string;
    email: string;
    name: string;
    esActivo: boolean;
    googleId: string | null;
  };
  persona: Persona | null;
  rol: { id: string; nombre: string } | null;
  medico: {
    id: string;
    idPersona: string;
    especialidad: string;
    esActivo: boolean;
    fechaCreacion: string;
    fechaModificacion: string | null;
  } | null;
  personal: {
    id: string;
    idPersona: string;
    registro: string;
    firma: string | null;
    esActivo: boolean;
    fechaCreacion: string;
    fechaModificacion: string | null;
  } | null;
}

/** Body de PATCH /usuario/:id (edición administrativa). */
export interface ActualizarUsuarioPayload {
  /** Correo de acceso del usuario; se puede modificar desde la edición. */
  login: string;
  /** Solo se envía para usuarios sin googleId y cuando se desea cambiarla. */
  password?: string;
  idRol?: string;
  persona: {
    nombres: string;
    primerApellido: string;
    segundoApellido?: string | null;
    generoId: number;
    tipoDocumentoIdentidadId?: number | null;
    numeroDocumento?: string | null;
    fechaNacimiento?: string | null;
    telefono?: string | null;
    email: string;
    distincion?: string | null;
    domicilio?: string | null;
  };
  medico?: { especialidad: string };
  personal?: { registro: string; firma?: string | null };
}

/** Coincide con `RegistrarUsuarioConPersonaDto` del backend (POST /usuario/registrar-con-persona). */
export interface RegistrarUsuarioConPersonaPayload {
  login: string;
  password: string;
  /** Rol que se asigna al usuario al momento del alta administrativa. */
  idRol: string;
  persona: {
    nombres: string;
    primerApellido: string;
    segundoApellido?: string | null;
    generoId: number;
    tipoDocumentoIdentidadId?: number | null;
    numeroDocumento?: string | null;
    fechaNacimiento?: string | null;
    telefono?: string | null;
    email: string;
    distincion?: string | null;
    domicilio?: string | null;
  };
}

