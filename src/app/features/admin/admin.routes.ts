import { Routes } from "@angular/router";

export default [
  { path: "", pathMatch: "full", redirectTo: "usuarios" },
  {
    path: "usuarios",
    loadComponent: () => import("./users/users").then((m) => m.Users),
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
      import("./configuration/configuration").then((m) => m.Configuration),
  },
] satisfies Routes;
