import { Routes } from "@angular/router";

export default [
  { path: "", pathMatch: "full", redirectTo: "usuarios" },
  {
    path: "usuarios",
    loadComponent: () =>
      import("./users/users.component").then((m) => m.UsersComponent),
  },
  {
    path: "authorization",
    loadComponent: () =>
      import("./authorization/authorization.component").then(
        (m) => m.AuthorizationComponent,
      ),
  },
  {
    path: "configuracion",
    loadComponent: () =>
      import("./configuration/configuration.component").then(
        (m) => m.ConfigurationComponent,
      ),
  },
] satisfies Routes;
