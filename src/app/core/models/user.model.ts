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
