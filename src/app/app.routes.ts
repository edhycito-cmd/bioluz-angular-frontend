import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { guestGuard } from "./core/guards/guest.guard";

export const routes: Routes = [
  // Un redirect no puede llevar guards (NG04014). La raíz apunta a la página
  // por defecto; el authGuard del layout rebota a /login si no hay sesión.
  { path: "", pathMatch: "full", redirectTo: "perfil" },
  {
    path: "login",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/login/login").then((m) => m.Login),
  },
  {
    path: "register",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/register/register").then((m) => m.Register),
  },
  {
    // Retorno del flujo OAuth redirect de Google. No lleva guestGuard: el
    // componente lee los tokens de la query, limpia la URL y carga la sesión.
    path: "auth/callback",
    loadComponent: () =>
      import("./features/auth/google-callback/google-callback").then(
        (m) => m.GoogleCallback,
      ),
  },
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./layout/component/app.layout").then((m) => m.AppLayout),
    children: [
      {
        path: "",
        loadChildren: () => import("./features/home/home.routes"),
      },
      {
        path: "admin",
        loadChildren: () => import("./features/admin/admin.routes"),
      },
    ],
  },
  // Última instancia: el authGuard del layout se encarga de rebotar a /login
  // si no hay sesión. Debe ser la última ruta del array.
  { path: "**", redirectTo: "perfil" },
];
