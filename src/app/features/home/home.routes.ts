import { Routes } from "@angular/router";
export default [
  {
    path: "dashboard",
    //data: { breadcrumb: "Button" },
     loadComponent: () =>
          import("./dashboard/dashboard.component").then(
            (m) => m.DashboardComponent,
          ),
  },
];
