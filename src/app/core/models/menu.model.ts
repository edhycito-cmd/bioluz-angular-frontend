/**
 * Nodo del árbol que devuelve `GET /menus/arbol`.
 *
 * El backend ya entrega la forma que consume `AppMenu` (compatible con
 * `MenuItem` de Optimus/PrimeNG), por lo que el componente no necesita
 * transformar la jerarquía.
 */
export interface MenuArbolItem {
  id: string;
  label: string;
  nombre: string;
  path: string;
  icon?: string;
  class?: string;
  target?: string;
  /** Presente solo en enlaces externos. */
  url?: string;
  /** Presente solo en hojas internas. */
  routerLink?: string[];
  visible: boolean;
  separator?: boolean;
  /**
   * Acciones Casbin (`frontend`) que el usuario autenticado tiene sobre el menú:
   * `read`, `update`, `create`, `delete` (el backend las combina como `read|update|...`).
   */
  acciones?: string[];
  items: MenuArbolItem[];
}
