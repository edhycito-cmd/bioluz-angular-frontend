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
      import("./authorization/authorization").then((m) => m.Authorization),
  },
  {
    path: "configuracion",
    loadComponent: () =>
      import("./configuration/configuration").then((m) => m.Configuration),
  },
] satisfies Routes;
