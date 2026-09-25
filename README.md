# Angular Clean Lite — Frontend (Angular 22)

Frontend standalone en **Angular 22** que se integra completamente con el backend
[`muspa-angular-lite-frontend`](../muspa-angular-lite-frontend): autenticación JWT (con refresh automático),
gestión de roles/policies de Casbin, y las features más nuevas de Angular — **Signals**, **Signal
Forms** y **control flow nativo** (`@if`/`@for`/`@let`).

Compilado y validado en este entorno con `ng build` (dev y producción) contra Angular 22.1.7 —
sin errores.

## Stack

- Angular 22 standalone (sin `NgModule`), builder `@angular/build:application` (esbuild)
- **Signals** para todo el estado de la app (`AuthService.currentUser`, `isAuthenticated` computed)
- **Signal Forms** (`@angular/forms/signals`) para los formularios de login/registro/autorización —
  reemplaza a Reactive Forms. Directiva clave: `FormField` / `[formField]` (no confundir con el
  nombre `Field` que aparece en algunos borradores de la doc — en la 22.1 estable la directiva
  pública se llama `FormField`).
- Control flow nativo (`@if`, `@for`, `@let`) — no se usa `CommonModule`/`*ngIf` en ningún lado
- `HttpClient` con interceptores funcionales (`withInterceptors`)
- TypeScript 6.0 (requerido por Angular 22.1+)

## Integración con el backend

| Feature backend | Dónde vive en el frontend |
|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/refresh` | `AuthService` |
| `GET /users/me` | `AuthService.loadProfile()` → signal `currentUser` |
| `PATCH /users/:id/activate` \| `/deactivate` | `AuthService.activateUser()` / `deactivateUser()` |
| `POST/DELETE /authorization/roles` \| `/policies` | `AuthorizationService` + página `/admin/authorization` |
| Respuesta envuelta en `{ success, data }` (ResponseInterceptor del backend) | Todos los servicios tipan la respuesta como `ApiEnvelope<T>` y hacen `map(res => res.data)` |
| Errores `{ statusCode, path, timestamp, message }` (HttpExceptionFilter del backend) | `extractErrorMessage()` en cada componente lee `error.error.message` |
| Guard JWT global + `PermissionsGuard` (Casbin) | `authInterceptor` adjunta el Bearer token; un 403 del backend se muestra como error de servidor en el formulario correspondiente |

**Limitación conocida:** el backend no expone un endpoint de **listado** de usuarios (solo
`/users/me` y acciones por `:id`). Por eso la página de Autorización pide el `userId` a mano en vez
de mostrar una tabla — copiálo desde el Dashboard. Si más adelante agregás un `GET /users` al
backend, es un buen próximo paso agregar acá una tabla real con Signals + `resource()`.

## Setup

```bash
npm install
```

### Desarrollo (con proxy al backend)

`proxy.conf.json` reenvía `/api` a `http://localhost:3000` — así evitás configurar CORS a mano en dev.
Necesitás el backend (`muspa-angular-lite-frontend`) corriendo en el puerto 3000 en paralelo
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
│   ├── models/          → interfaces que reflejan 1:1 los DTOs del backend
│   ├── services/         → AuthService (signals), AuthorizationService, TokenStorageService
│   ├── interceptors/      → authInterceptor (adjunta Bearer token)
│   │                        errorInterceptor (401 → refresh automático con cola anti-duplicados,
│   │                        logout si el refresh también falla)
│   └── guards/            → authGuard (rutas privadas, rehidrata sesión en reload)
│                             guestGuard (login/register: redirige si ya hay sesión)
├── features/
│   ├── auth/login, auth/register   → Signal Forms + validación (incluye confirm-password cruzado)
│   ├── dashboard                    → perfil del usuario (signal currentUser)
│   └── admin/authorization          → asignar/revocar rol, agregar/quitar policy (Casbin)
├── app.config.ts   → providers standalone (router, HttpClient + interceptores)
├── app.routes.ts   → rutas con lazy loading (loadComponent)
└── app.component.* → shell raíz con navbar condicional
```

## Sobre el manejo de sesión

- Los tokens (access + refresh) se guardan en `localStorage` vía `TokenStorageService`. Si migrás a
  un esquema de cookies `httpOnly` servidas por un backend-for-frontend, es el único archivo que
  necesitás tocar.
- Al recargar la página, `authGuard` detecta que hay un refresh token persistido pero el signal
  `currentUser` está vacío (memoria se resetea en cada carga), y llama a `GET /users/me` antes de
  decidir si te manda a `/login`.
- Si una request cualquiera devuelve 401, `errorInterceptor` dispara `POST /auth/refresh` una sola
  vez (aunque fallen varias requests en paralelo — se encolan y esperan el mismo refresh) y reintenta
  la request original con el token nuevo. Si el refresh también falla, hace logout y redirige a
  `/login`.
