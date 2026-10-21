# Muspa Angular Lite — Frontend (Angular 22)

Frontend standalone en **Angular 22** que se integra con el backend
[`muspa-nestjs-clean-lite-backend`](../muspa-nestjs-clean-lite-backend): autenticación JWT (con refresh
automático), gestión de roles/policies de Casbin, y las features más nuevas de Angular — **Signals**,
**Signal Forms** y **control flow nativo** (`@if`/`@for`/`@let`).

Compilado y validado en este entorno con `ng build` (dev y producción) contra Angular 22.1 —
sin errores.

## Stack

- Angular 22 standalone (sin `NgModule`), builder `@angular/build:application` (esbuild)
- **Signals** para todo el estado de la app (`AuthService.currentUser`, `isAuthenticated` computed)
- **Signal Forms** (`@angular/forms/signals`) para los formularios de login/registro/autorización —
  reemplaza a Reactive Forms. Directiva clave: `FormField` / `[formField]`.
- Control flow nativo (`@if`, `@for`, `@let`) — no se usa `CommonModule`/`*ngIf` en ningún lado
- `HttpClient` con interceptores funcionales (`withInterceptors`)
- Optimus UI + Tailwind CSS v4 (PostCSS)
- Convención de nombres sin sufijos (`login.ts` / `Login`, no `login.component.ts`), según la guía
  de estilo de Angular
- TypeScript 6.0 (requerido por Angular 22)

## Integración con el backend

El backend expone todo bajo el prefijo global `/api` y envuelve las respuestas exitosas en
`{ success: true, data }` (ResponseInterceptor).

| Feature backend | Dónde vive en el frontend |
|---|---|
| `POST /api/auth/register`, `/api/auth/login`, `/api/auth/refresh` | `AuthService` |
| `GET /api/usuario/perfil` | `AuthService.loadProfile()` → signal `currentUser` |
| `PATCH /api/usuario/:id/activate` \| `/deactivate` | `AuthService.activateUser()` / `deactivateUser()` |
| `POST/DELETE /api/authorization/roles` \| `/policies` | `AuthorizationService` + página `/admin/authorization` |
| Respuesta `{ success, data }` | Los servicios tipan la respuesta como `ApiEnvelope<T>` y hacen `map(res => res.data)` |
| Errores `{ statusCode, path, timestamp, message }` | `extractErrorMessage()` en cada componente lee `error.error.message` |

**Estado:** el CRUD completo está implementado para los tres módulos, siguiendo el diseño de
`sparked-main` (`pages/crud`): toolbar (Nuevo / Eliminar / Exportar), tabla con búsqueda global,
ordenamiento por columna, checkboxes de selección, tags de estado y botones circulares de
acción, dialog de alta/edición y confirmdialog de borrado, con toasts de resultado.

- `/admin/usuarios` — listado + busqueda, alta con persona (`POST /api/usuario/registrar-con-persona`),
  activar/desactivar (`PATCH /api/usuario/:id/activate|deactivate`), exportar CSV.
  Services: `UsersService`, `DetallesClasificadorService` (opciones de género/tipo de documento).
- `/admin/clasificador` — CRUD completo contra `GET/POST/PATCH/DELETE /api/clasificadores`.
  Service: `ClasificadoresService`.
- `/admin/roles-usuarios` — asignar roles a usuarios contra
  `GET/POST/PATCH/DELETE /api/roles-usuarios` y listado de roles `GET /api/roles`.
  Services: `RolesUsuariosService`, `RolesService`.
- `/perfil` — muestra los datos de `data.user` + `data.persona`.

**Permisos:** el ítem de menú `/admin/roles-usuarios` se incluye en los seeds del backend
(`prisma/seeds/20260101000200-menus.seed.ts` y `FRONTEND_RESOURCES` de
`20260101000300-roles.seed.ts`); correr `npm run prisma:seed` si la base es anterior.

## Setup

```bash
npm install
```

### Desarrollo (con proxy al backend)

`proxy.conf.json` reenvía `/api` a `http://localhost:3002` — así evitás configurar CORS a mano en dev.
Necesitás el backend (`muspa-nestjs-clean-lite-backend`) corriendo en el puerto 3002 en paralelo
(`npm run start:dev` en ese proyecto).

```bash
npm start   # ng serve, con el proxy ya configurado en angular.json
```

Abrí `http://localhost:4200`.

### Producción

Antes de buildear, editá `src/environments/environment.ts` con la URL pública real de tu backend
(`apiUrl`). El backend ya tiene `app.enableCors()` habilitado.

```bash
npm run build
```

El resultado queda en `dist/muspa-angular-lite-frontend/browser` — es un sitio 100% estático,
servible desde cualquier CDN/hosting estático (Nginx, S3+CloudFront, Vercel, etc.).

## Estructura

```
src/app/
├── core/
│   ├── models/           → interfaces que reflejan 1:1 los DTOs del backend
│   ├── services/         → AuthService (signals), AuthorizationService, TokenStorageService
│   ├── interceptors/     → authInterceptor (adjunta Bearer token)
│   │                        errorInterceptor (401 → refresh automático con cola anti-duplicados,
│   │                        logout si el refresh también falla)
│   └── guards/           → authGuard (rutas privadas, rehidrata sesión en reload)
│                             guestGuard (login/register: redirige si ya hay sesión)
├── features/
│   ├── auth/login, auth/register   → Signal Forms + validación
│   ├── home/dashboard              → widgets de dashboard
│   ├── home/perfil-usuario         → perfil del usuario (usuario + persona, signals)
│   └── admin/users, admin/configuration, admin/authorization
├── layout/component/     → shell (topbar, sidebar, menú, configurador de tema)
├── app.config.ts         → providers standalone (router, HttpClient + interceptores, Optimus)
├── app.routes.ts         → rutas con lazy loading (loadComponent)
└── app.ts / app.html     → shell raíz con <router-outlet />
```

## Sobre el manejo de sesión

- Los tokens (access + refresh) se guardan en `localStorage` vía `TokenStorageService`. Si migrás a
  un esquema de cookies `httpOnly` servidas por un backend-for-frontend, es el único archivo que
  necesitás tocar.
- Al recargar la página, `authGuard` detecta que hay un refresh token persistido pero el signal
  `currentUser` está vacío (memoria se resetea en cada carga), y llama a `GET /api/usuario/perfil`
  antes de decidir si te manda a `/login`.
- Si una request cualquiera devuelve 401, `errorInterceptor` dispara `POST /api/auth/refresh` una sola
  vez (aunque fallen varias requests en paralelo — se encolan y esperan el mismo refresh) y reintenta
  la request original con el token nuevo. Si el refresh también falla, hace logout y redirige a
  `/login`.
