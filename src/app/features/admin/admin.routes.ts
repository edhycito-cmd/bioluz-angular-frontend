import { Routes } from "@angular/router";
export default [
  {
    path: "usuarios",
    loadComponent: () => import("./users/users").then((m) => m.Users),
  },
]  as Routes;
