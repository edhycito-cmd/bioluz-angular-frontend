import { Routes } from "@angular/router";
import { permissionGuard } from "../../core/guards/permission.guard";

export default [
  { path: "", pathMatch: "full", redirectTo: "pacientes" },
  {
    path: "pacientes",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./pacientes/pacientes").then((m) => m.PacientesPage),
  },
  {
    path: "ordenes",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./ordenes/ordenes").then((m) => m.OrdenesLaboratorioPage),
  },
  {
    path: "resultados",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./resultados/resultados").then((m) => m.ResultadosPage),
  },
] satisfies Routes;
