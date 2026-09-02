# Pendientes — NexusPlay

Tareas acordadas con el usuario, en espera de más contexto o de un próximo turno.

## Refresh token — hecho

Antes solo había un JWT de acceso de 1 día sin forma de revocarlo ni renovarlo — al expirar,
re-login completo obligatorio; si un admin desactivaba a alguien, su token seguía sirviendo hasta
que expirara solo. Se implementó el patrón access + refresh token:

**Backend:**
- Access token (JWT, `JWT_EXPIRES_IN` default ahora `15m`) sigue viajando en el body de
  `/auth/login` y en el header `Authorization: Bearer` de cada petición, sin cambios ahí.
- Nuevo refresh token: string opaco de alta entropía (no JWT), 30 días de vida, viaja **solo**
  en una cookie `httpOnly; secure (en prod); sameSite=lax; path=/auth` — nunca en el JSON de
  respuesta ni accesible desde JS del cliente (mitiga robo por XSS).
- Tabla `refresh_tokens` (`RefreshTokenModel`, migración `20260902161755_refresh_tokens`):
  guarda el **hash SHA-256** del token (nunca el valor en claro, mismo criterio que passwords)
  con `expires_at`/`revoked_at`. Nuevo puerto `OpaqueTokenGeneratorPort` (domain) +
  adapter `CryptoOpaqueTokenGenerator` (infrastructure) — deliberadamente SHA-256 y no bcrypt: el
  refresh token ya es aleatorio de alta entropía, hashearlo con bcrypt (lento a propósito, para
  contraseñas de baja entropía) solo desperdiciaría CPU en cada refresh.
- `TokenPairIssuer` (`application/services/`) centraliza "emitir access+refresh juntos" para no
  triplicar esa lógica entre login, el registro encadenado y el refresh mismo.
- **Rotación en cada uso**: `POST /auth/refresh` revoca el refresh token que llega y emite uno
  nuevo — si alguien reutiliza uno ya rotado (señal de robo), se rechaza con 401. Verificado con
  curl real.
- `POST /auth/logout` (nuevo, ya tiene sentido con estado server-side): revoca el refresh token
  en DB y limpia la cookie. Antes no existía endpoint de logout porque JWT puro era stateless.
- `RegisterUserDto` sigue sin `role` (ver hallazgo de seguridad abajo) — sin relación con esto,
  ambos cambios convivieron en el mismo endpoint sin conflicto.

**Frontend:**
- El access token dejó de persistirse en `localStorage` (ya no vale la pena: dura 15 min) — vive
  solo en memoria (`useRef` en `useAuth`). `utils/storage.ts` quedó sin uso y se eliminó.
- `request()` (`utils/http.ts`) manda `credentials: 'include'` siempre, para que la cookie del
  refresh token viaje. Cuando una petición autenticada recibe 401, ya no cierra la sesión de
  inmediato: primero intenta `POST /auth/refresh` (vía un handler que `AuthProvider` registra) y
  reintenta la petición original una vez con el token nuevo; solo si el refresh también falla
  cierra la sesión.
- Al montar la app, en vez de leer un token de `localStorage`, se llama `/auth/refresh` directo
  (la cookie ya viaja sola) para obtener un access token fresco y luego `GET /users/me`.
- `signOut` ahora también llama `POST /auth/logout` (best-effort, no bloquea el cierre local si
  falla) para revocar el refresh token en servidor, no solo olvidar el token en el cliente.
- Verificado end-to-end con curl simulando exactamente las cabeceras de un browser en `:5173`
  (CORS con `credentials`, cookies persistidas entre llamadas): login → cookie seteada → refresh
  rota la cookie y emite access token nuevo → reuso del token viejo rechazado → logout revoca.

## Hallazgo de seguridad crítico — corregido este turno

Al construir el panel admin ("crear usuarios") se encontró que `POST /auth/register` (público,
sin autenticación) aceptaba un campo `role` opcional sin restricción — **cualquiera podía
auto-registrarse como ADMIN** llamando el endpoint directo con `{"role":"ADMIN"}` en el body.
Verificado con un curl real contra la DB antes de corregir.

Fix:
- `RegisterUserDto` ya no declara `role` — con `ValidationPipe({ whitelist: true,
  forbidNonWhitelisted: true })` ya activo, cualquier intento de mandar `role` en el registro
  público ahora responde `400 Bad Request` ("property role should not exist").
- `RegisterUserUseCase` ya no acepta `role` en su input; siempre asigna `Role.student()`.
- Nuevo caso de uso `CreateUserUseCase` + endpoint `POST /users` (admin-only, valida
  `canManageUsers()` igual que `changeRole`/`deactivate`/`reactivate`) para que un ADMIN sí pueda
  crear usuarios con el rol que elija — es la vía correcta para lo que el panel admin necesita.
- Verificado end-to-end: registro público con `role` → 400; `POST /users` sin sesión de ADMIN →
  403; `POST /users` como ADMIN → crea con el rol pedido.

## 1. Módulo de juegos (backend)

Pendiente hasta recibir instrucciones más detalladas del usuario. No asumir estructura de datos
todavía. Cuando se retome, construir siguiendo la misma arquitectura hexagonal aplanada ya usada
en el módulo de usuario (`src/domain`, `src/application`, `src/infrastructure`, sin carpetas por
feature), con endpoint(s) reales respaldados por Prisma — **nada hardcodeado** en el frontend.

## 2. Frontend — flujo de autenticación

- ~~Conectar formulario de registro~~ — **hecho**: `RegisterPage`/`RegisterForm`/
  `useRegisterForm` (patrón calcado de login). Solo pide `email`, `password`, `firstName`,
  `lastName`, `middleName?` — no expone `role`/`displayName`/`birthDate`/`locale` al usuario
  final, el backend asigna STUDENT por defecto. `POST /auth/register` no devuelve token, así que
  `useAuth().signUp` encadena un `POST /auth/login` con las mismas credenciales para entrar
  directo al dashboard. **Este encadenado se reemplaza** cuando llegue la verificación de correo
  con Resend (ver sección más abajo) — en ese momento el registro ya no debe autenticar.
- ~~Revisar manejo de errores de red/expiración de token en la UI~~ — **hecho**: `utils/http.ts`
  expone `setUnauthorizedHandler()`; `request()` lo dispara cuando una petición *autenticada*
  (con `token`) recibe 401 — distinto de un 401 en login/register, que sigue siendo "credenciales
  incorrectas". `AuthProvider` registra `signOut` como ese handler al montar, así que cualquier
  fetch en cualquier componente (admin, perfil, etc.) que descubra el token vencido o revocado
  cierra la sesión sola y vuelve al login, sin que cada componente lo maneje por su cuenta. Cubre
  también el caso de un admin desactivando a alguien a mitad de sesión: su próximo fetch autenticado
  falla con 401 y lo saca.

## 5. Verificación de correo con Resend (backend + frontend)

Pendiente de más instrucciones del usuario sobre el flujo exacto (¿token en URL?, ¿código de 6
dígitos?, ¿expiración?). Anotado para que el diseño respete la arquitectura ya existente:

**Lo que el dominio ya tiene y no necesita cambiar:**
- `User.isEmailVerified` (prop) y `User.verifyEmail()` (método de entidad, ya valida que no esté
  verificado dos veces) — ya modelan el estado. `VerifyUserEmailUseCase` ya existe y llama a
  `user.verifyEmail()` + `userRepository.save(user)`.

**Lo que falta y cómo encaja sin romper SOLID (mismo patrón que `PasswordHasher`):**
- Nuevo **puerto** en domain: `EmailSenderPort` (`domain/ports/email-sender.port.ts`), interfaz
  pura sin dependencia a Resend ni a ningún framework — igual que `password-hasher.port.ts`.
  Ej.: `sendVerificationEmail(to: string, token: string): Promise<void>`.
- Nuevo **adapter** en infrastructure: `ResendEmailSender` (`infrastructure/email/`), implementa
  el puerto usando el SDK de Resend. Es el único lugar que conoce Resend.
- El **caso de uso de registro** (`RegisterUserUseCase`) pasa a inyectar `EMAIL_SENDER` (además
  de `USER_REPOSITORY`, `PASSWORD_HASHER`, `ID_GENERATOR`) y dispara el envío tras crear el
  usuario — sigue sin saber nada de Resend, solo conoce el puerto (Dependency Inversion).
- Probablemente se necesite un **VO o campo nuevo** para el token/código de verificación
  (ej. `EmailVerificationToken`, con expiración) — evaluar si vive como prop adicional en `User`
  o como entidad/tabla separada (`email_verifications`) una vez se defina el flujo exacto. Una
  tabla separada es más limpia (Single Responsibility: `User` no acumula estado transitorio de
  verificación) y permite reenviar/expirar tokens sin tocar la entidad principal.
- `RegisterUserUseCase.execute()` seguiría respetando Single Responsibility si la orquestación
  (crear usuario + generar token + enviar correo) se mantiene en el caso de uso, no en la entidad
  ni en el controller — la entidad sigue conociendo solo sus propias invariantes.
- Frontend: el `signUp` en `useAuth.tsx` que hoy encadena login automático deja de hacerlo — tras
  registrar, se muestra "revisa tu correo" y se lleva al usuario a una pantalla de verificación
  (pendiente de diseño) en vez de autenticar directo.

## 3. Frontend — página de inicio (home autenticado) — hecho

`HomeLayout.tsx` (`client/src/components/home/`) con sidebar izquierdo (`Sidebar.tsx`, oculta
"Administración" si el rol no es ADMIN), barra de búsqueda arriba (`SearchBar.tsx`) y menú de
perfil en la esquina superior derecha (`ProfileMenu.tsx`, dropdown con Configuración/Cerrar
sesión, cierra con click-outside y Escape). El layout usa `fixed inset-0` para escapar del
`#root { max-width: 1126px }` pensado para las pantallas de login/registro.

- `GamesSection.tsx`: **sin datos hardcodeados**. El módulo de juegos (backend) no existe
  todavía, así que no hace fetch a nada — muestra un estado vacío real ("Aún no hay juegos
  disponibles" / "Sin resultados para X" si hay búsqueda). Cuando exista `GET /games`, se
  reemplaza el estado vacío por el fetch real. Ver punto 1.
- `ProfileSettings.tsx`: formulario de edición de perfil conectado a `PATCH /users/me/profile`
  (vía `useAuth().updateProfile`, ya agregado).

## 4. Frontend — panel de administración (solo rol ADMIN) — hecho

`AdminUsersSection.tsx` + `CreateUserForm.tsx`, visibles solo si `user.role === 'ADMIN'` (chequeo
en `HomeLayout`; el backend valida de nuevo con `canManageUsers()`, el frontend nunca es la única
barrera).

- Listado **paginado** real contra `GET /users?page=&pageSize=` (`ListUsersUseCase`).
- Conteo total visible (`total` de la respuesta paginada).
- Crear usuarios vía `POST /users` — **nuevo endpoint, ver hallazgo de seguridad abajo**.

## Notas de seguridad ya resueltas en backend (este turno)

- `GET /users/:id` ya no filtraba por permisos: ahora requiere ser el propio usuario o tener
  `canViewLearningData()` (ADMIN o TEACHER).
- `PATCH /users/:id/deactivate` y `PATCH /users/:id/reactivate` no verificaban permisos: ahora
  requieren `canManageUsers()` (ADMIN), igual que `changeRole`.

## Roles movidos de enum a tabla (este turno)

Los roles ya no viven en un `enum` de Postgres — ahora es una tabla `roles` (`id`, `name`,
`created_at`) referenciada por `users.role_id` (FK). El catálogo de nombres válidos sigue siendo
fijo en el dominio (`Role` VO en `role.vo.ts`, STUDENT/TEACHER/ADMIN) — eso no cambió, sigue
siendo una decisión de negocio, no algo que el admin cree libremente desde la UI. Lo que cambió
es la persistencia: agregar un rol al catálogo ya no requiere `ALTER TYPE`, solo un `INSERT` en
`roles` (vía migración/seed) más, si aplica, extender `VALID_ROLE_NAMES` en el VO.

- Seed idempotente: `server/prisma/seed.ts`, corre con `npm run db:seed` (compila con
  `prisma/tsconfig.seed.json` a `dist-seed/` — carpeta gitignored — porque el cliente Prisma
  generado usa imports `.js` que Node no resuelve en modo `--experimental-strip-types` directo).
- Migración: `20260902121254_roles_table` — crea `roles`, siembra el catálogo fijo, agrega
  `role_id` nullable, hace backfill desde el enum viejo, lo vuelve NOT NULL, dropea la columna
  `role` y el enum `UserRoleDb`.
- Verificado end-to-end con `POST /auth/register` real contra Postgres en Docker.
