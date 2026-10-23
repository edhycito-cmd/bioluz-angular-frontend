# MUSPA Angular Lite — Frontend (Angular 22)

SPA standalone en **Angular 22** que consume
[`muspa-nestjs-clean-lite-backend`](../muspa-nestjs-clean-lite-backend). Incluye autenticación
JWT con refresh automático, Google Sign-In, permisos Casbin reflejados en menú y botones,
administración de usuarios/roles/catálogos, cambio de contraseña y tema global persistido.

Usa las features recientes de Angular: **Signals**, **Signal Forms**, **control flow nativo**
(`@if` / `@for` / `@let`), **rxResource** y **standalone components**. Toda la interfaz visible
está en español.

## Estado actual

- Página inicial y fallback: **`/perfil`**. `/dashboard` sigue existiendo como ruta explícita.
- Login email/password y registro con confirmación de contraseña; ambos formularios validan en
  cliente y muestran los errores del backend en español.
- Login con **Google Identity Services** (recomendado) y soporte del flujo OAuth redirect.
- Sesión con **access token solo en memoria** y **refresh token en cookie HttpOnly**; la sesión
  se rehidrata al recargar con `POST /auth/refresh` y el refresh se serializa entre pestañas con
  Web Locks.
- Menú lateral dinámico desde `GET /api/menus/arbol`; perfil y cierre de sesión desde el avatar
  del topbar. El perfil ya no aparece como ítem del menú lateral.
- Guard de autenticación, guard de invitados y guard de permisos por ruta; directiva
  `*appHasPermission` para ocultar acciones sin permiso.
- Módulos administrativos: usuarios + personas, roles y permisos, clasificadores, detalles de
  clasificador, roles de usuarios y configuración global.
- Tema global (preset, color primario, superficie, modo oscuro y ubicación del menú) persistido en
  `app_configuraciones`; solo se guarda desde `/admin/configuracion`.
- Cambio de contraseña desde **Perfil**, con validación de contraseña actual, nueva contraseña y
  confirmación.
- `ng build` de producción compila correctamente. El bundle inicial actual es **803.32 kB** y
  supera el presupuesto de advertencia de **700 kB** (el límite de error es 1.5 MB).

## Stack

- Angular 22 standalone, builder `@angular/build:application` (esbuild)
- **Signals** para estado de sesión, permisos y configuraciones (`AuthService`, `PermissionsService`)
- **Signal Forms** (`@angular/forms/signals`) en login, registro, perfil y autorización
- Control flow nativo (`@if`, `@for`, `@let`), sin `CommonModule` ni `*ngIf`
- `HttpClient` con interceptores funcionales (`withInterceptors`)
- **Optimus UI 2** (`@openng/optimus-ui`) + **Tailwind CSS v4** con PostCSS
- `rxResource` para carga reactiva de listados y del árbol de menús
- Convención de nombres sin sufijos (`login.ts` / `Login`, no `login.component.ts`)
- TypeScript 6.0, `LOCALE_ID: 'es'` y datos de locale español registrados en `main.ts`

## Rutas principales

| Ruta | Guard / acceso | Descripción |
|---|---|---|
| `/` | Redirige | Redirige a `/perfil` |
| `/login` | `guestGuard` | Login email/password + Google |
| `/register` | `guestGuard` | Alta de cuenta con confirmación de contraseña |
| `/auth/callback` | Sin guard | Retorno del flujo OAuth redirect de Google; canjea la cookie de sesión (sin tokens en la URL) |
| `/dashboard` | `authGuard` (layout) | Dashboard con widgets de ejemplo |
| `/perfil` | `authGuard` (layout) | Página por defecto; datos de usuario/persona y cambio de contraseña |
| `/admin` | `authGuard` (layout) | Redirige a `/admin/usuarios` |
| `/admin/usuarios` | `permissionGuard` | Listado, alta con persona, activar/desactivar y exportar CSV |
| `/admin/authorization` | `permissionGuard` | Asignar/revocar roles y agregar/quitar policies Casbin |
| `/admin/clasificador` | `permissionGuard` | CRUD de clasificadores |
| `/admin/detalles-clasificador` | `permissionGuard` | CRUD de detalles con filtro por clasificador |
| `/admin/roles-usuarios` | `permissionGuard` | CRUD de asignaciones rol-usuario |
| `/admin/configuracion` | `permissionGuard` | Tema global: preset, colores, modo oscuro y menú |
| `**` | Redirige | Fallback a `/perfil`; el layout rebota a `/login` si no hay sesión |

El `permissionGuard` comprueba la acción `read` sobre el path actual (`state.url`) contra el árbol
de permisos `frontend`. Si no hay permiso, redirige a `/perfil`; no muestra una pantalla de error.

## Integración con el backend

El backend expone todo bajo `/api` y envuelve las respuestas exitosas en
`{ success: true, data }` (`ResponseInterceptor`). Los servicios tipan `ApiEnvelope<T>` y hacen
`map(res => res.data)`. Los errores llegan como `{ statusCode, path, timestamp, message }`.

| API del backend | Uso en el frontend |
|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh` | `AuthService` |
| `GET /usuario/perfil` | `AuthService.loadProfile()` → signals `currentUser`, `persona` |
| `PATCH /usuario/perfil/contrasena` | `UsersService.cambiarContrasena()` desde `/perfil` |
| `GET /usuario` | `UsersService.listar()` en administración |
| `POST /usuario/registrar-con-persona` | `UsersService.registrarConPersona()` |
| `PATCH /usuario/:id/activate` / `deactivate` | `AuthService.activateUser()` / `deactivateUser()` |
| `GET /menus/arbol` | `MenuService` + `PermissionsService` |
| `GET /configuraciones/tema` / `PUT /configuraciones/tema` | `ConfiguracionService` + `ThemeService` |
| `GET/POST/PATCH/DELETE /clasificadores` | `ClasificadoresService` |
| `GET/POST/PATCH/DELETE /detalles-clasificador` | `DetallesClasificadorService` |
| `GET /roles`, `GET/POST/PATCH/DELETE /roles-usuarios`, `PATCH /roles-usuarios/:id/habilitar` | `RolesService`, `RolesUsuariosService` |
| `POST/DELETE /authorization/roles` y `/authorization/policies` | `AuthorizationService` |

## Autenticación y sesión

- `TokenStorageService` mantiene **solo el access token en memoria**. No se guardan tokens en
  `localStorage` ni `sessionStorage`. En la primera carga tras actualizar desde la versión
  anterior, elimina las claves legacy `ncl_access_token`/`ncl_refresh_token`.
- El **refresh token** vive en una cookie `HttpOnly` que administra el backend; JavaScript no
  puede leerla. `AuthService` usa `withCredentials` en login, registro, Google, refresh y logout.
- `authInterceptor` agrega `Authorization: Bearer <accessToken>` salvo en endpoints públicos de
  autenticación.
- `authGuard` rehidrata la sesión al recargar o abrir una pestaña: si no hay perfil en memoria,
  llama a `POST /auth/refresh` (cookie) y luego a `GET /usuario/perfil` antes de decidir si
  redirige a `/login`.
- `errorInterceptor` reacciona a **401** en endpoints protegidos: ejecuta un único
  `POST /auth/refresh` por pestaña aunque fallen varias peticiones a la vez, propaga el error a
  todas las peticiones en espera si el refresh falla (sin dejarlas colgadas), reintenta la
  petición original con el token nuevo y limpia la sesión/navega a `/login` si corresponde.
  `AuthService` serializa además el refresh entre pestañas con **Web Locks** (HTTPS o localhost)
  para evitar que dos pestañas usen simultáneamente el mismo refresh token rotado. En HTTP puro
  fuera de localhost el navegador no expone Web Locks; por eso producción debe usar HTTPS.
- Un **403** (por ejemplo, usuario sin rol vigente) no dispara refresh; el error se muestra en la
  pantalla que hizo la petición.
- El botón **Cerrar sesión** del avatar limpia el estado local, invoca `POST /auth/logout` para
  revocar la sesión y borrar la cookie, y navega a `/login`.
- El checkbox **Recordarme** del login se envía al backend: con `true` la sesión y la cookie son
  persistentes (`JWT_REFRESH_EXPIRES_IN`, por defecto 30 días); con `false` son de navegador
  (`JWT_REFRESH_SESSION_EXPIRES_IN`, por defecto 12 horas).
- En producción, la SPA y la API deben servirse por HTTPS y `CORS_ORIGINS` debe contener el origen
  exacto de la SPA. Si están en sitios distintos, configurar `AUTH_COOKIE_SAMESITE=none` y
  `AUTH_COOKIE_SECURE=true`.
- El formulario de perfil valida la nueva contraseña (8–64 caracteres, mayúscula, minúscula,
  número, carácter especial, sin espacios) y exige que la confirmación coincida.

## Login con Google

Hay dos caminos soportados por el backend:

1. **Google Identity Services (recomendado)** — `GoogleSignInService` renderiza el botón oficial,
   recibe un ID token (`credential`) y lo envía junto a un `nonce` y el valor de `rememberMe` a
   `POST /api/auth/google`. El backend valida firma, `aud`, `iss`, `exp`, `email_verified` y
   nonce, deja el refresh token en cookie HttpOnly y devuelve el access token. No hay tokens en
   la URL.
2. **OAuth redirect** — `GET /api/auth/google` → Google → callback del backend →
   `/auth/callback`. El backend deja la cookie HttpOnly y redirige sin tokens en la URL;
   `GoogleCallback` canjea la cookie con `POST /auth/refresh`, carga perfil/permisos y navega a
   **`/perfil`**. Este flujo usa sesión de navegador (sin `rememberMe`).

Configuración:

- Completar `googleClientId` en `src/environments/environment.development.ts` (dev) y
  `src/environments/environment.ts` (producción) con el mismo Client ID que `GOOGLE_CLIENT_ID` del
  backend. Es un identificador público, no un secreto.
- En Google Cloud Console → Credentials → OAuth client ID (Web), registrar el origen desde el que
  se sirve la SPA en **Authorized JavaScript origins**. El *Authorized redirect URI* solo hace
  falta para el flujo redirect.
- Si `googleClientId` está vacío o el SDK no carga, el botón de Google se oculta y el login por
  email/password sigue funcionando.

## Permisos y navegación

- `GET /menus/arbol` es la única fuente de permisos del frontend. El backend ya filtró los menús
  sin `read` y entrega `acciones` (`read`, `update`, `create`, `delete`) por nodo.
- `PermissionsService` carga el árbol una vez por sesión, lo indexa por `path` normalizado y aplica
  **deny-by-default** si no hay regla o la carga falló.
- `permissionGuard` evita el acceso directo por URL a páginas de administración.
- `HasPermission` (`*appHasPermission="'create'"`) monta o desmonta botones y bloques según las
  acciones del usuario. Ejemplos: Nuevo/Eliminar en tablas, activar/desactivar usuarios y guardar
  configuración.
- Inicio (`/inicio`) es un menú común que el backend agrega siempre; `/perfil` tiene permisos
  comunes, pero no se muestra en el menú lateral y se abre desde el avatar.
- Si se agrega una página administrativa, debe existir el nodo correspondiente en `sec_menus` y la
  policy `frontend` en los seeds del backend. Sin eso, el guard redirige a `/perfil`.

## Módulos administrativos

- **Usuarios** (`/admin/usuarios`): listado con búsqueda global, ordenamiento, selección y
  exportación CSV; alta de usuario + persona con `POST /usuario/registrar-con-persona`; el usuario
  creado queda **inactivo** hasta activarlo; activar/desactivar con confirmación; contraseña y
  confirmación con botones para mostrar/ocultar.
- **Autorización** (`/admin/authorization`): formularios para asignar/revocar roles directamente en
  Casbin y para agregar/quitar policies por `rol`, `recurso`, `acción` y ámbito
  (`backend`/`frontend`). Los botones respetan `create`/`delete` de la página.
- **Clasificadores** (`/admin/clasificador`): CRUD con id/dominio/descripción/orden, búsqueda,
  ordenamiento, selección, exportación y confirmación de borrado.
- **Detalles de clasificador** (`/admin/detalles-clasificador`): CRUD con filtro por clasificador;
  al cambiar el filtro se recarga el listado. Incluye exportación y acciones condicionadas por
  permisos.
- **Roles de usuarios** (`/admin/roles-usuarios`): listado y alta de asignaciones con selects de
  usuario y rol; edición de rol y fecha de inicio; habilitación de asignaciones revocadas;
  revocación con confirmación; exportación.
- **Configuración** (`/admin/configuracion`): tema global y ubicación del menú. Solo los roles con
  `update` sobre `/admin/configuracion` pueden guardar; el resto ve un aviso.

## Tema global

- La fuente de verdad es `app_configuraciones.tema` en el backend, no `localStorage`.
- `ThemeService.load()` se ejecuta en `provideAppInitializer` al arrancar la SPA y aplica el tema
  en el siguiente tick. Si falla la consulta, la app continúa con los valores por defecto.
- Presets disponibles: **Aura**, **Lara** y **Nora**. Se pueden elegir color principal, color de
  superficie, modo oscuro y `menuMode` (`static`/`overlay`).
- `/admin/configuracion` recarga el valor persistido, permite previsualizar los cambios y los guarda
  con `PUT /api/configuraciones/tema`.
- El botón sol/luna del topbar y el flotante del login cambian el modo oscuro en memoria; para que
  el cambio quede para todos los usuarios hay que guardarlo desde Configuración.

## UI en español

- `main.ts` registra `localeEs` y `app.config.ts` provee `LOCALE_ID: 'es'`.
- `provideOptimus` incluye traducciones propias para tablas, filtros, calendario, paginación,
  diálogos y mensajes de accesibilidad.
- El menú traduce etiquetas heredadas del backend (`Dashboard` → `Panel`, `Home` → `Inicio`) y
  filtra el ítem `/perfil` para bases que todavía lo tengan sembrado.
- Los formularios, toasts, confirmaciones, títulos, estados y textos de error visibles están en
  español.

## Setup

```bash
npm install
```

### Desarrollo

`proxy.conf.json` reenvía `/api` a `http://localhost:3002`. Levantá el backend en ese puerto:

```bash
# en muspa-nestjs-clean-lite-backend
npm run start:dev

# en muspa-angular-lite-frontend
npm start
```

Abrí `http://localhost:4200`.

### Producción

Antes de buildear, editá `src/environments/environment.ts` con la URL pública real del backend
(`apiUrl`). El backend ya tiene CORS habilitado.

```bash
npm run build
```

El resultado queda en `dist/muspa-angular-lite-frontend/browser`. Es un sitio estático, servible
desde Nginx, S3 + CloudFront, Vercel o cualquier CDN.

> El build de producción actual compila, pero muestra una advertencia porque el bundle inicial
> supera el presupuesto de 700 kB: **803.32 kB** iniciales (≈145 kB de transferencia estimada).
> Ajustar el presupuesto o dividir el bundle si se quiere dejar el build sin warnings.

### Tests

El proyecto incluye Karma/Jasmine en `package.json` y `angular.json`, pero **no hay archivos
`*.spec.ts`** en `src/`. `npm test` arranca el runner sin casos. Las verificaciones actuales son
`ng build` (desarrollo y producción) y pruebas manuales de los flujos.

## Estructura

```
src/app/
├── core/
│   ├── models/           → interfaces que reflejan los DTOs del backend
│   ├── services/         → AuthService, UsersService, MenuService, PermissionsService,
│   │                        ConfiguracionService, ThemeService vive en layout/service,
│   │                        ClasificadoresService, DetallesClasificadorService,
│   │                        RolesService, RolesUsuariosService, AuthorizationService,
│   │                        TokenStorageService, GoogleSignInService
│   ├── interceptors/     → authInterceptor (Bearer), errorInterceptor (401 → refresh)
│   ├── guards/           → authGuard, guestGuard, permissionGuard
│   └── directives/       → HasPermission (`*appHasPermission`)
├── features/
│   ├── auth/
│   │   ├── login/        → email/password + Google + mostrar/ocultar contraseña
│   │   ├── register/     → alta + confirmación de contraseña
│   │   └── google-callback/
│   ├── home/
│   │   ├── dashboard/    → widgets de ejemplo
│   │   └── perfil-usuario/ → datos de usuario/persona + cambio de contraseña
│   └── admin/
│       ├── users/
│       ├── authorization/
│       ├── configuration/
│       ├── clasificadores/
│       ├── detalles-clasificador/
│       └── roles-usuarios/
├── layout/
│   ├── component/        → app.layout, app.topbar, app.menu, app.menuitem,
│   │                        app.configurator, app.floatingconfigurator, footer
│   └── service/          → LayoutService, ThemeService
├── app.config.ts         → router, HttpClient + interceptores, Optimus, locale y tema inicial
├── app.routes.ts         → rutas lazy y guards
└── app.ts / app.html     → shell raíz con <router-outlet />
```

## Notas de implementación

- Los formularios principales usan **Signal Forms**; la validación y los mensajes se declaran en el
  propio formulario.
- Los listados usan `rxResource`; los cambios (alta, edición, activar/desactivar, revocar) llaman a
  `reload()` sobre el resource correspondiente.
- Las tablas siguen el patrón de `sparked-main`: toolbar, búsqueda global, ordenamiento,
  checkboxes, tags de estado, diálogo de alta/edición, confirmación de borrado y toasts.
- `ChangeDetectionStrategy.Eager` se usa en los componentes de la app.
- `AppMenu` tiene un menú de respaldo si falla `GET /menus/arbol`, para no dejar la navegación
  vacía; la fuente normal es la API.
- El topbar muestra iniciales del nombre de la persona (o del email), nombre completo y un menú
  con **Perfil**, **Configuración** y **Cerrar sesión**.
