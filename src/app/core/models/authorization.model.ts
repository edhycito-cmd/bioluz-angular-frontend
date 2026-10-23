/**
 * Acciones que aceptan las reglas Casbin del backend.
 * Coincide con `FRONTEND_ACTIONS = BACKEND_ACTIONS` de
 * `src/core/application/ports/authorization.port.ts`.
 */
export type PermissionAction = 'read' | 'update' | 'create' | 'delete';

/**
 * Ámbito de la regla Casbin: `frontend` (menús/UI) o `backend` (APIs).
 * Coincide con `APP_TYPES` del backend.
 */
export type PermissionApp = 'frontend' | 'backend';

export interface AssignRolePayload {
  userId: string;
  role: string;
}

export interface PolicyPayload {
  role: string;
  resource: string;
  action: string;
  app: PermissionApp;
}
