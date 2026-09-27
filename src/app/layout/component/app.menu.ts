import { Component, ChangeDetectionStrategy } from "@angular/core";

import { RouterModule } from "@angular/router";
import { MenuItem } from "@openng/optimus-ui/api";
import { AppMenuitem } from "./app.menuitem";

@Component({
  selector: "app-menu",
  standalone: true,
  imports: [AppMenuitem, RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<ul class="layout-menu">
    @for (item of model; track item.label) {
      @if (!item.separator) {
        <li app-menuitem [item]="item" [root]="true"></li>
      } @else {
        <li class="menu-separator"></li>
      }
    }
  </ul> `,
})
export class AppMenu {
  model: MenuItem[] = [];

  ngOnInit() {
    // Cada routerLink debe existir en app.routes.ts. Los.path de los grupos
    // alimentan la expansión/colapso del submenú y el resaltado activo.
    this.model = [
      {
        label: "Inicio",
        path: "/dashboard",
        items: [
          {
            label: "Dashboard",
            icon: "pi pi-fw pi-home",
            routerLink: ["/dashboard"],
          },
          {
            label: "Perfil",
            icon: "pi pi-fw pi-user",
            routerLink: ["/perfil"],
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
            label: "Configuración",
            icon: "pi pi-fw pi-mobile",
            class: "rotated-icon",
            routerLink: ["/admin/configuracion"],
          },
        ],
      },
      {
        label: "Aplicación",
        path: "/pages",
        items: [
          {
            label: "Opción 1",
            icon: "pi pi-fw pi-user",
            path: "/auth",
            items: [
              {
                label: "Submenú 1",
                icon: "pi pi-fw pi-sign-in",
                path: "/hierarchy/submenu_1",
                items: [
                  {
                    label: "Submenu 1.1",
                    icon: "pi pi-fw pi-bookmark",
                    path: "/hierarchy/submenu_1/submenu_1_1",
                    items: [
                      { label: "Submenu 1.1.1", icon: "pi pi-fw pi-bookmark" },
                      { label: "Submenu 1.1.2", icon: "pi pi-fw pi-bookmark" },
                    ],
                  },
                ],
              },
              {
                label: "Submenú 2",
                icon: "pi pi-fw pi-times-circle",
                routerLink: ["/auth/error"],
              },
            ],
          },

          {
            label: "Opción 2",
            icon: "pi pi-fw pi-circle-off",
            routerLink: ["/pages/empty"],
          },
        ],
      },
    ];
  }
}
