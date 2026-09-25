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
    this.model = [
      {
        label: "Inicio",
        items: [
          { label: "Dashboard", icon: "pi pi-fw pi-home", routerLink: ["/"] },
          { label: "Dashboard Rol", icon: "pi pi-fw pi-home", routerLink: ["/"] },
          { label: "Mi Perfil", icon: "pi pi-fw pi-home", routerLink: ["/"] },
        ],
      },
      {
        label: "Administración",
        items: [
          {
            label: "Usuarios",
            icon: "pi pi-fw pi-id-card",
            routerLink: ["/features/admin/users"],
          },
          {
            label: "Roles y Permisos",
            icon: "pi pi-fw pi-check-square",
            routerLink: ["/uikit/input"],
          },
          {
            label: "Configuración",
            icon: "pi pi-fw pi-mobile",
            class: "rotated-icon",
            routerLink: ["/uikit/button"],
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

      {
        label: "Ayuda",
        items: [
          {
            label: "Documentation",
            icon: "pi pi-fw pi-book",
            routerLink: ["/documentation"],
          },
        ],
      },
    ];
  }
}
