import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { guestGuard } from "./core/guards/guest.guard";

export const routes: Routes = [
  // Un redirect no puede llevar guards (NG04014). El guestGuard de /login se
  // encarga de rebotar a /dashboard si el usuario ya tiene sesión.
  { path: "", pathMatch: "full", redirectTo: "login" },
  {
    path: "login",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/login/login.component").then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: "register",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/register/register.component").then(
        (m) => m.RegisterComponent,
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
  { path: "**", redirectTo: "dashboard" },
];
