import { Routes } from "@angular/router";

export default [
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: "perfil",
    loadComponent: () =>
      import("./perfil-usuario/perfil-usuario").then(
        (m) => m.PerfilUsuario,
      ),
  },
] satisfies Routes;
