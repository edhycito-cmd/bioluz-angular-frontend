import { Routes } from "@angular/router";
import { permissionGuard } from "../../core/guards/permission.guard";

export default [
  { path: "", pathMatch: "full", redirectTo: "examenes" },
  {
    path: "valores-referencia",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./valores-referencia/valores-referencia").then(
        (m) => m.ValoresReferenciaPage,
      ),
  },
  {
    path: "condicion-fisiologica",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./condicion-fisiologica/condicion-fisiologica").then(
        (m) => m.CondicionFisiologicaPage,
      ),
  },
  {
    path: "area-analisis",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./area-analisis/area-analisis").then((m) => m.AreaAnalisisPage),
  },
  {
    path: "examenes",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./examenes/examenes").then((m) => m.ExamenesPage),
  },
  {
    path: "plantillas",
    canActivate: [permissionGuard],
    loadComponent: () =>
      import("./plantillas/plantillas").then((m) => m.PlantillasPage),
  },
] satisfies Routes;
