import { Routes } from "@angular/router";
import { permissionGuard } from "../../core/guards/permission.guard";

export default [
  { path: "", pathMatch: "full", redirectTo: "perfil" },
  {
    path: "dashboard",
    loadComponent: () => import("./dashboard/dashboard").then((m) => m.Dashboard),
  },
  {
    path: "dashboard-admin",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./dashboard-admin/dashboard-admin").then((m) => m.DashboardAdmin),
  },
  {
    path: "dashboard-laboratorio",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./dashboard-laboratorio/dashboard-laboratorio").then(
        (m) => m.DashboardLaboratorio,
      ),
  },
  {
    path: "dashboard-paciente",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./dashboard-paciente/dashboard-paciente").then(
        (m) => m.DashboardPaciente,
      ),
  },
  {
    path: "perfil",
    loadComponent: () =>
      import("./perfil-usuario/perfil-usuario").then((m) => m.PerfilUsuario),
  },
] satisfies Routes;
