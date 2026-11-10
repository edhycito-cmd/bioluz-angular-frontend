import { HttpErrorResponse } from "@angular/common/http";

/** Extrae el mensaje legible del formato de error global del backend. */
export function extractApiErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado. Intentá de nuevo.",
): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string | string[] } | undefined;
    if (Array.isArray(body?.message)) return body.message.join(" ");
    if (body?.message) return body.message;
    if (error.status === 0) return "No se pudo conectar con el servidor.";
    if (error.status === 403) return "No tenés permiso para realizar esta acción.";
    if (error.status === 404) return "El registro ya no existe.";
  }

  return fallback;
}
