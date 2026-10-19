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
      import("./perfil-usuario/perfil-usuario.component").then(
        (m) => m.PerfilUsuarioComponent,
      ),
  },
] satisfies Routes;
