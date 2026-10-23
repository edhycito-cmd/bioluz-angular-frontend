/** Valores del tema global persistidos en `app_configuraciones` (clave `tema`). */
export interface TemaConfig {
  preset: string;
  primary: string;
  surface: string | null;
  darkTheme: boolean;
  menuMode: string;
}

/** Forma pública de una configuración que devuelve el backend. */
export interface ConfiguracionItem<T = Record<string, unknown>> {
  id: string;
  clave: string;
  valor: T;
  descripcion: string | null;
  esActivo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}
