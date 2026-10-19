import { Routes } from "@angular/router";

export default [
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  {
    path: "dashboard",
    loadComponent: () => import("./dashboard/dashboard").then((m) => m.Dashboard),
  },
  {
    path: "perfil",
    loadComponent: () =>
      import("./perfil-usuario/perfil-usuario").then((m) => m.PerfilUsuario),
  },
] satisfies Routes;
