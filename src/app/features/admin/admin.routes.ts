import { Routes } from "@angular/router";
import { permissionGuard } from "../../core/guards/permission.guard";

export default [
  { path: "", pathMatch: "full", redirectTo: "usuarios" },
  {
    path: "usuarios",
    canActivate: [permissionGuard],
    loadComponent: () => import("./users/users").then((m) => m.Users),
  },
  {
    path: "authorization",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./authorization/authorization").then((m) => m.Authorization),
  },
  {
    path: "configuracion",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./configuration/configuration").then((m) => m.Configuration),
  },
  {
    path: "clasificador",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./clasificadores/clasificador").then((m) => m.Clasificador),
  },
] satisfies Routes;
