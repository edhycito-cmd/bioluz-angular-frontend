import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { guestGuard } from "./core/guards/guest.guard";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
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

  {
    path: "admin/authorization",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/admin/authorization/authorization.component").then(
        (m) => m.AuthorizationComponent,
      ),
  },
  { path: "**", redirectTo: "dashboard" },
];
