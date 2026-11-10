import { Routes } from "@angular/router";
import { permissionGuard } from "../../core/guards/permission.guard";

export default [
  { path: "", pathMatch: "full", redirectTo: "ordenes" },
  {
    path: "ordenes",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./ordenes/ordenes").then((m) => m.ReporteOrdenesPage),
  },
  {
    path: "resultados",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./resultados/resultados").then((m) => m.ReporteResultadosPage),
  },
] satisfies Routes;
