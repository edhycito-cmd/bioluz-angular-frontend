import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { RouterModule } from "@angular/router";
import { MenuItem } from "@openng/optimus-ui/api";
import { MenuArbolItem } from "../../core/models/menu.model";
import { MenuService } from "../../core/services/menu.service";
import { AppMenuitem } from "./app.menuitem";

/**
 * Etiquetas del menú que llegan en inglés desde datos existentes y deben
 * mostrarse en español sin modificar el backend.
 */
const ETIQUETAS_VISIBLES: Readonly<Record<string, string>> = {
  Dashboard: "Panel",
  Home: "Inicio",
};

const etiquetaVisible = (label: string): string =>
  ETIQUETAS_VISIBLES[label] ?? label;

/**
 * Adapta un nodo del árbol del backend (`GET /api/menus/arbol`) a `MenuItem`.
 * El backend ya envía `label`, `icon`, `path`, `routerLink`, `visible` e
 * `items`; aquí solo se normaliza la forma para no acoplar la plantilla al DTO.
 */
const aMenuItem = (nodo: MenuArbolItem): MenuItem => ({
  id: nodo.id,
  label: etiquetaVisible(nodo.label),
  icon: nodo.icon,
  path: nodo.path,
  routerLink: nodo.routerLink,
  url: nodo.url,
  target: nodo.target,
  visible: nodo.visible,
  separator: nodo.separator,
  class: nodo.class,
  items: nodo.items.length > 0 ? nodo.items.map(aMenuItem) : undefined,
});

/**
 * El perfil dejó de ser una opción del menú lateral: se accede desde el avatar
 * del topbar. Se filtra también aquí para las bases ya sembradas con el menú
 * `/perfil`, sin necesidad de volver a ejecutar los seeds.
 */
const sinPerfil = (items: MenuItem[]): MenuItem[] =>
  items
    .filter((item) => item['path'] !== '/perfil' && item['routerLink']?.join('/') !== '/perfil')
    .map((item) => ({
      ...item,
      items: item.items ? sinPerfil(item.items) : undefined,
    }));

/**
 * Menú de respaldo: se usa únicamente si el backend no responde, para que la
 * navegación siga disponible. La fuente de verdad es el árbol de la API.
 */
const MENU_POR_DEFECTO: MenuItem[] = [
  {
    label: "Inicio",
    path: "/dashboard",
    items: [
      {
        label: "Panel",
        icon: "pi pi-fw pi-home",
        routerLink: ["/dashboard"],
      },
    ],
  },
  {
    label: "Administración",
    path: "/admin",
    items: [
      {
        label: "Usuarios",
        icon: "pi pi-fw pi-id-card",
        routerLink: ["/admin/usuarios"],
      },
      {
        label: "Roles y Permisos",
        icon: "pi pi-fw pi-check-square",
        routerLink: ["/admin/authorization"],
      },
      {
        label: "Clasificadores",
        icon: "pi pi-list-check",
        routerLink: ["/admin/clasificador"],
      },
      {
        label: "Detalles Clasificadores",
        icon: "pi pi-fw pi-th-large",
        routerLink: ["/admin/detalles-clasificador"],
      },
      {
        label: "Roles de Usuarios",
        icon: "pi pi-fw pi-user-edit",
        routerLink: ["/admin/roles-usuarios"],
      },
      {
        label: "Configuración",
        icon: "pi pi-fw pi-mobile",
        class: "rotated-icon",
        routerLink: ["/admin/configuracion"],
      },
    ],
  },
];

@Component({
  selector: "app-menu",
  imports: [AppMenuitem, RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<ul class="layout-menu">
    @for (item of model(); track item.label) {
      @if (!item.separator) {
        <li app-menuitem [item]="item" [root]="true"></li>
      } @else {
        <li class="menu-separator"></li>
      }
    }
  </ul> `,
})
export class AppMenu {
  private readonly menuService = inject(MenuService);

  /**
   * Carga dinámica del árbol. `rxResource` gestiona el ciclo de vida de la
   * petición: la cancela al destruir el componente y expone `isLoading`/`error`.
   */
  private readonly arbol = rxResource({
    stream: () => this.menuService.obtenerArbol(),
  });

  /** Estado de carga, disponible si se quiere reflejar en la UI. */
  protected readonly cargando = this.arbol.isLoading;

  /**
   * Misma estructura (`MenuItem[]`) que consume la plantilla, construida a
   * partir de la respuesta de `GET /api/menus/arbol`.
   */
  readonly model = computed<MenuItem[]>(() => {
    if (this.arbol.hasValue()) {
      return sinPerfil(this.arbol.value()!.map(aMenuItem));
    }
    // Mientras carga no se muestra nada; si falla, el menú de respaldo.
    return this.arbol.error() ? sinPerfil(MENU_POR_DEFECTO) : [];
  });
}
