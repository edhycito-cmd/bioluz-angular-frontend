# AGENT.md — Guía del Proyecto MUSPA Frontend

## Resumen

SPA de **MUSPA** en **Angular 22 standalone** que consume el backend
`../muspa-nestjs-clean-lite-backend`. Autenticación JWT con refresh automático, Google Sign-In,
permisos Casbin, administración de usuarios/roles/catálogos, perfil con cambio de contraseña y
tema global persistido.

La interfaz visible está **completamente en español**. La página por defecto es **`/perfil`**.

## Estado actual

- Angular 22.1, **Signals**, **Signal Forms**, control flow nativo, `rxResource` y componentes
  standalone (sin `NgModule`).
- Login/registro con validación, mostrar/ocultar contraseña y confirmación de contraseña en el
  registro y en el alta administrativa.
- Google Identity Services + callback del flujo OAuth redirect, que navega a `/perfil`.
- Sesión en `localStorage`; `authGuard` rehidrata el perfil al recargar; interceptor de 401 con
  refresh único y cola de peticiones concurrentes.
- Árbol de menús y permisos desde `GET /api/menus/arbol`; guard de ruta y directiva de acciones.
- CRUD de clasificadores, detalles de clasificador y roles-usuarios; alta/activación de usuarios;
  gestión directa de roles/policies; configuración global del tema.
- Tema global en `app_configuraciones` (backend); se aplica en el arranque y se guarda desde
  `/admin/configuracion`.
- Build de producción correcto con **803.32 kB** iniciales; advertencia por presupuesto de 700 kB.
- **No hay tests unitarios**: `find src -name '*.spec.ts'` devuelve 0 archivos.

## Stack

- Angular 22 standalone, builder `@angular/build:application` (esbuild)
- TypeScript 6.0
- **Optimus UI 2** (`@openng/optimus-ui`, `@openng/optimus-ui-themes`) + Tailwind CSS v4
- Signals, computed, `rxResource`, `@if` / `@for` / `@let`
- Signal Forms (`@angular/forms/signals`): `form`, `FormField`, `[formField]`, validadores
  (`required`, `email`, `minLength`, `pattern`, `validate`) y `submit`
- `HttpClient` + interceptores funcionales (`withInterceptors`)
- `LOCALE_ID: 'es'` y `registerLocaleData(localeEs)`
- Karma/Jasmine configurado, sin specs actuales

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm start` | `ng serve` en `http://localhost:4200`, con proxy `/api` → `http://localhost:3002` |
| `npm run build` | Build de producción (`production` por defecto) |
| `npm run watch` | Build de desarrollo en watch |
| `npm test` | Karma/Jasmine; hoy no hay specs, por lo que no ejecuta casos |
| `ng generate component ...` | Generar componente standalone (usar nombres sin sufijo) |

El backend debe estar corriendo en el puerto **3002** para desarrollo (`proxy.conf.json`).

## Arquitectura de carpetas

```
src/
├── app/
│   ├── core/
│   │   ├── models/           → DTOs del backend (auth, user, menu, permisos, rol, clasificador...)
│   │   ├── services/         → AuthService, UsersService, MenuService, PermissionsService,
│   │   │                        ConfiguracionService, ClasificadoresService,
│   │   │                        DetallesClasificadorService, RolesService,
│   │   │                        RolesUsuariosService, AuthorizationService,
│   │   │                        TokenStorageService, GoogleSignInService
│   │   ├── interceptors/     → authInterceptor, errorInterceptor
│   │   ├── guards/           → authGuard, guestGuard, permissionGuard
│   │   └── directives/       → HasPermission
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── google-callback/
│   │   ├── home/
│   │   │   ├── dashboard/
│   │   │   └── perfil-usuario/
│   │   └── admin/
│   │       ├── users/
│   │       ├── authorization/
│   │       ├── configuration/
│   │       ├── clasificadores/
│   │       ├── detalles-clasificador/
│   │       └── roles-usuarios/
│   ├── layout/
│   │   ├── component/        → app.layout, app.topbar, app.sidebar, app.menu,
│   │   │                        app.menuitem, app.configurator,
│   │   │                        app.floatingconfigurator, footer
│   │   └── service/          → LayoutService, ThemeService
│   ├── app.config.ts         → providers, interceptores, Optimus, locale y tema inicial
│   ├── app.routes.ts         → rutas raíz y layout
│   └── app.ts / app.html     → `<router-outlet />`
├── environments/             → environment.ts (prod), environment.development.ts (dev)
├── assets/                   → styles.scss, tailwind.css
└── main.ts                   → locale español + bootstrap
```

## Arranque de la aplicación

1. `main.ts` registra el locale español y ejecuta `bootstrapApplication(App, appConfig)`.
2. `app.config.ts` provee router, `HttpClient` con `[authInterceptor, errorInterceptor]`, Optimus
   con traducciones en español y `provideAppInitializer(() => ThemeService.load())`.
3. `ThemeService.load()` consulta `GET /api/configuraciones/tema` (público) durante el arranque y
   aplica el tema en el siguiente tick. Si falla, continúa con los defaults de `LayoutService`.
4. El router resuelve la ruta. `/` redirige a `/perfil`; las rutas privadas pasan por el layout con
   `authGuard`.

## Rutas y guards

| Ruta | Guard | Notas |
|---|---|---|
| `/` | — | `redirectTo: 'perfil'` |
| `/login` | `guestGuard` | Si ya hay sesión, redirige a `/perfil` |
| `/register` | `guestGuard` | Ídem |
| `/auth/callback` | — | Debe quedar sin `guestGuard` para recibir tokens/error de Google |
| `/dashboard` | `authGuard` (layout) | Dashboard de ejemplo; no es la página inicial |
| `/perfil` | `authGuard` (layout) | Página por defecto y perfil + cambio de contraseña |
| `/admin` | Layout autenticado | Redirige a `/admin/usuarios` (sin guard propio) |
| `/admin/usuarios` | `permissionGuard` | `/api/usuario` / `/admin/usuarios` |
| `/admin/authorization` | `permissionGuard` | `/admin/authorization` |
| `/admin/clasificador` | `permissionGuard` | `/admin/clasificador` |
| `/admin/detalles-clasificador` | `permissionGuard` | `/admin/detalles-clasificador` |
| `/admin/roles-usuarios` | `permissionGuard` | `/admin/roles-usuarios` |
| `/admin/configuracion` | `permissionGuard` | `/admin/configuracion` |
| `**` | — | Redirige a `/perfil`; el layout decide si va a `/login` |

**Importante:** el redirect raíz no puede tener guards (`NG04014`). Por eso `/` y `**` redirigen a
`/perfil`, y el `authGuard` del layout rebota a `/login` cuando no hay sesión.

`permissionGuard` usa `state.url` como recurso Casbin y exige `read`. Si no hay permiso, devuelve
`/perfil`, no una pantalla 403. El guard no cubre `/perfil` ni `/dashboard`; para esas rutas alcanza
con autenticación.

## Autenticación y sesión

- **Estado**: `AuthService` expone `profile` (signal), `currentUser` (computed), `persona`
  (computed) e `isAuthenticated` (computed sobre el perfil cargado).
- **Tokens**: `TokenStorageService` usa `localStorage` con las claves `ncl_access_token` y
  `ncl_refresh_token`. La sesión se considera existente si hay refresh token.
- **Login/registro/Google**: guardan tokens con `startSession()`, limpian permisos anteriores,
  cargan perfil y permisos, y solo entonces completan el observable. El componente navega a
  `/perfil`.
- **Rehidratación**: al recargar, `authGuard` ve que hay refresh token pero no perfil; llama a
  `loadProfile()`. Si falla, redirige a `/login`.
- **`loadProfile()`**: `GET /api/usuario/perfil` → setea `profile` → encadena
  `PermissionsService.ensureLoaded()` (árbol de menús). No usar permisos antes de esta cadena.
- **401**: `errorInterceptor` excluye las rutas públicas (`/auth/login`, `/auth/register`,
  `/auth/refresh`, `/auth/google`). En una ruta protegida ejecuta un solo refresh y encola las
  peticiones concurrentes; si falla, `logout()` y `/login`.
- **403**: no dispara refresh; se muestra el `message` del backend. Es el caso de un usuario sin rol
  vigente al iniciar sesión.
- **Logout**: `AuthService.logout()` limpia tokens, perfil y permisos; **no llama a
  `POST /auth/logout`**. El topbar navega a `/login` después.
- **Recordarme**: el campo se envía en el payload y es validado por el backend, pero no cambia la
  duración de la sesión en el estado actual.
- **Contraseña**: `/perfil` usa `PATCH /api/usuario/perfil/contrasena` con `currentPassword` y
  `newPassword`; la confirmación es solo validación local.

## Google Sign-In

- `GoogleSignInService` carga GIS, genera el nonce y renderiza el botón oficial en el contenedor de
  `/login`.
- Flujo recomendado: `POST /api/auth/google` con `{ credential, nonce }`; guarda los JWT y navega a
  `/perfil`.
- Flujo redirect: `/auth/callback` lee `accessToken`/`refreshToken`, ejecuta
  `location.replaceState('/auth/callback')` para limpiar la query, guarda la sesión, carga perfil y
  navega a `/perfil` con `replaceUrl`.
- Si no hay `googleClientId` o el SDK falla, se oculta Google y queda el login tradicional.
- Para GIS, el origen de la SPA debe estar registrado en **Authorized JavaScript origins**. Para
  redirect, también el callback del backend en **Authorized redirect URIs** y `FRONTEND_URL` debe
  apuntar a la SPA.

## Permisos Casbin

- Fuente única: `GET /api/menus/arbol` (JWT). El backend filtra los menús sin `read`, agrega las
  acciones `frontend` y siempre incluye `/inicio`.
- `MenuService.obtenerArbol()` hace la petición; `PermissionsService.ensureLoaded()` indexa por
  `path` normalizado (sin query/hash ni slash final).
- `PermissionsService.can(recurso, ...acciones)` exige **todas** las acciones pedidas. Sin regla,
  sin carga o con error → `false` (deny-by-default).
- `HasPermission` (`*appHasPermission="'create'"`) es estructural y reactiva: monta/desmonta el
  bloque cuando cambian los permisos o los inputs.
- `permissionGuard` protege las rutas de administración; el menú ya viene filtrado, pero el guard
  evita el acceso directo por URL.
- El perfil (`/perfil`) no se muestra en el menú; se accede desde el avatar. El ítem se filtra en
  `AppMenu` por compatibilidad con bases antiguas.
- Si se agrega una ruta administrativa, hay que crear el nodo en `sec_menus` y la policy
  `frontend` en el backend; si no, el guard redirige a `/perfil`.

## Tema global

- `LayoutService` mantiene el estado visual (`preset`, `primary`, `surface`, `darkTheme`,
  `menuMode`); `ThemeService` aplica presets de Optimus y persiste en el backend.
- En arranque, `ThemeService.load()` lee `GET /api/configuraciones/tema` (público) y aplica el
  tema en el siguiente tick. La lectura no bloquea si falla.
- `/admin/configuracion` llama `ThemeService.reload()` para partir del valor persistido y
  `ThemeService.save()` para `PUT /api/configuraciones/tema`.
- Solo el rol con `update` sobre `/admin/configuracion` puede guardar. El resto ve un mensaje de
  aviso.
- El botón sol/luna del topbar y el flotante del login cambian el estado en memoria; **no
  persisten** el cambio global. Para persistir, guardar desde Configuración.
- El seed del backend crea `tema` con `Aura`, `emerald`, `surface: null`, modo claro y menú
  estático; no sobreescribe cambios manuales.

## Módulos y servicios

### Usuarios (`/admin/usuarios`)

- `UsersService.listar()` → `GET /usuario` paginado.
- `UsersService.registrarConPersona()` → `POST /usuario/registrar-con-persona`; el backend crea el
  usuario inactivo, asigna `USUARIO` y crea la persona. La UI avisa que queda inactivo hasta su
  activación.
- `AuthService.activateUser()` / `deactivateUser()` → `PATCH /usuario/:id/activate|deactivate`.
- La tabla permite búsqueda, ordenamiento, selección, exportación CSV y acciones condicionadas por
  `create`/`update`. No hay edición ni borrado de usuarios en esta pantalla.

### Autorización (`/admin/authorization`)

- `AuthorizationService` llama a `POST/DELETE /authorization/roles` y
  `/authorization/policies`.
- Los formularios piden IDs/roles/recurso/acción/ámbito. Los botones se ocultan según
  `create`/`delete` sobre `/admin/authorization`.
- Es administración directa de Casbin; el CRUD con vigencia está en `roles-usuarios`.

### Clasificadores y detalles

- `ClasificadoresService`: CRUD `/clasificadores`.
- `DetallesClasificadorService`: CRUD `/detalles-clasificador`, con filtro por `idClasificador` y
  endpoint `/clasificador/:idClasificador`.
- Ambas tablas exportan CSV y usan búsqueda/ordenamiento/selección.

### Roles de usuarios (`/admin/roles-usuarios`)

- `RolesUsuariosService`: listar, listar por usuario, asignar, actualizar, habilitar y revocar.
- `RolesService`: catálogo de roles para el select.
- En edición se pueden cambiar `idRol` y `fechaInicio`; el usuario queda fijo. La edición
  solo está disponible para asignaciones activas.
- Revocar hace `DELETE /roles-usuarios/:id`; el backend marca la asignación inactiva, fija
  `fechaFin` y quita el rol de Casbin.
- Habilitar aparece solo en asignaciones revocadas y hace
  `PATCH /roles-usuarios/:id/habilitar`; el backend inicia una nueva vigencia, limpia
  `fechaFin` y vuelve a asignar el rol en Casbin.

### Configuración (`/admin/configuracion`)

- `ConfiguracionService` lee/escribe el tema.
- `ThemeService` aplica la previsualización y guarda.
- Incluye preset, color principal, superficie, modo oscuro y `menuMode` (`static`/`overlay`).

## Convenciones de código

- Componentes standalone; sin `NgModule`.
- Nombres de archivo/clase sin sufijos: `login.ts` / `Login`, `users.ts` / `Users`.
- `ChangeDetectionStrategy.Eager` en los componentes existentes.
- Estado con `signal`/`computed`; listados con `rxResource`; recarga con `resource.reload()`.
- Formularios con Signal Forms; no mezclar con Reactive Forms en componentes nuevos sin motivo.
- Control flow nativo; no `CommonModule`, `*ngIf` ni `*ngFor`.
- Servicios con `inject()` y `providedIn: 'root'`.
- UI y mensajes en español. Términos técnicos (`Dashboard`) se traducen en la capa de presentación
  (`Panel`).
- Los modelos de `core/models/` deben reflejar los DTOs reales del backend.
- Los errores HTTP se extraen de `error.error.message` (string o array); agregar fallback en
  español.

## Contrato con la API

- Base: `environment.apiUrl` (`/api` en dev; URL absoluta en prod).
- Respuesta exitosa: `{ success: true, data: T }` → `map(res => res.data)`.
- Error: `{ statusCode, path, timestamp, message }`; `message` puede ser string o `string[]`.
- Endpoints usados: ver `README.md`. Los servicios existentes ya encapsulan URL y params.
- `MenuService` construye la URL del árbol con `environment.apiUrl` (`/menus/arbol`).
- El backend devuelve 403 si el usuario no tiene rol vigente; no interpretarlo como sesión expirada.

## Cómo agregar una página administrativa

1. Crear `features/admin/<nombre>/<nombre>.ts|html|scss` standalone con `ChangeDetectionStrategy.Eager`.
2. Agregar la ruta en `features/admin/admin.routes.ts` con `canActivate: [permissionGuard]`.
3. Crear el modelo y servicio en `core/models` / `core/services` si consume un endpoint nuevo.
4. Agregar el nodo en `prisma/seeds/20260101000200-menus.seed.ts` y el recurso en
   `FRONTEND_RESOURCES` de `20260101000300-roles.seed.ts` (backend).
5. Sembrar (`npm run prisma:seed`) y asignar la policy al rol correspondiente.
6. Proteger botones con `*appHasPermission="'create|update|delete'"`.
7. Si corresponde, agregar el enlace al menú de respaldo de `AppMenu` para desarrollo offline.
8. Verificar `permissionGuard` entrando por URL directa y con un rol sin permiso.

## Build, presupuesto y tests

- `npm run build` compila correctamente. Bundle inicial actual: **803.32 kB**; presupuesto de
  advertencia: **700 kB**; error: **1.5 MB**. La advertencia no rompe el build.
- Salida: `dist/bioluz-angular-frontend/browser`.
- No hay tests unitarios en `src/`; `npm test` no ejecuta casos. Las verificaciones actuales son
  build y pruebas manuales.
- Antes de producción, revisar `src/environments/environment.ts`: hoy contiene una URL de backend
  de red local; reemplazarla por la URL pública real y configurar el origen en Google Cloud Console.

## Errores comunes y soluciones

| Síntoma | Causa probable | Solución |
|---|---|---|
| Al entrar a una ruta admin vuelve a `/perfil` | Sin `read` sobre ese path o falta el menú/policy en el backend | Revisar `sec_menus`, policies `frontend` y `npm run prisma:seed` |
| Los botones de crear/eliminar no aparecen | `PermissionsService` no cargó o el rol no tiene la acción | Verificar `GET /menus/arbol` y la policy del rol |
| `GET /api/...` falla en desarrollo | Backend no está en `localhost:3002` o proxy mal configurado | Levantar backend y revisar `proxy.conf.json` |
| El refresh entra en loop o cierra sesión | Refresh token inválido/revocado o usuario sin rol vigente | Volver a iniciar sesión; revisar `sec_sesiones_usuario` y `sec_roles_usuarios` |
| Login con Google no muestra el botón | `googleClientId` vacío o SDK bloqueado | Configurar Client ID y origen autorizado; el login normal sigue disponible |
| El callback de Google vuelve con error | Origen/callback no autorizado o Client ID distinto | Revisar Google Cloud Console, `FRONTEND_URL` y `GOOGLE_CLIENT_ID` |
| El tema no se aplica al recargar | Falta `app_configuraciones.tema` o falló la lectura inicial | Ejecutar seeds; probar `GET /api/configuraciones/tema` |
| Cambio el modo oscuro en el topbar y no persiste | Ese toggle es solo en memoria | Guardar desde `/admin/configuracion` |
| Build con warning de presupuesto | Bundle inicial > 700 kB | Ajustar `angular.json` o dividir dependencias |
| `npm test` no ejecuta nada | No hay archivos `*.spec.ts` | Crear specs o no usar el script como validación |

## Notas importantes

- No commitear `node_modules`, `dist`, `.angular`, `coverage` ni archivos de entorno con secretos.
- Los tokens viven en `localStorage`; si se migra a cookies `httpOnly`, el único punto de cambio es
  `TokenStorageService` (y la estrategia de refresh).
- No mostrar el Client ID como secreto: es público; el secreto es `GOOGLE_CLIENT_SECRET` del backend.
- El menú y los permisos son datos del backend. No hardcodear menús administrativos en Angular
  salvo el fallback de `AppMenu`.
- Mantener la página por defecto en `/perfil`; si se cambia, actualizar `app.routes.ts`,
  `home.routes.ts`, login, callback de Google y `guestGuard`.
- El alta administrativa crea usuarios inactivos: recordar activarlos antes de probar el login.
- `Dashboard` es una etiqueta heredada del backend; en la UI se muestra como **Panel**.

## Hitos recientes

- Traducción completa de la interfaz al español (Angular y Optimus).
- Ruta por defecto `/perfil`; `/dashboard` queda como ruta explícita.
- Callback de Google y login/registro navegan a `/perfil`.
- Perfil con cambio de contraseña y validación de confirmación.
- Menú de avatar con Perfil, Configuración y Cerrar sesión; perfil fuera del menú lateral.
- Tema global persistido en el backend y reubicado en `/admin/configuracion`.
- CRUD de clasificadores, detalles y roles-usuarios; alta de usuarios con persona.
- Guards por rol, permisos por acción y menú dinámico desde Casbin.
