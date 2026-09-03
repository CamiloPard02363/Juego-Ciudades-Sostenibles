# Pendientes — NexusPlay

Tareas acordadas con el usuario, en espera de próximo turno.

## Auditoría de seguridad del módulo de juegos — corregida este turno

Tras construir el módulo de juegos, se pidió una revisión exhaustiva de correctitud y seguridad
(autorización, IDOR, inyección, wiring de módulos). La autorización, el filtrado de campos por
DTO y el manejo de errores de dominio salieron limpios. Se encontraron y corrigieron 5 problemas
reales:

- **ReDoS vía `search`** (`mongo-game.repository.ts`): el filtro de búsqueda del catálogo pasaba
  el input del usuario directo a `$regex` de Mongo sin escapar — un patrón tipo `(a+)+$` provoca
  backtracking catastrófico. Fix: `escapeRegex()` antes de construir el filtro. Verificado con
  curl: el mismo patrón ahora responde en ~130ms tratado como texto literal.
- **Payload sin límite de tamaño** (`main.ts`, `memory-match.content-validator.ts`): el body
  JSON no tenía límite explícito antes de que la validación de aplicación (tope de 200 parejas)
  tuviera oportunidad de rechazarlo — riesgo de agotar memoria con un payload gigante. Fix:
  `app.useBodyParser('json', { limit: '512kb' })` + topes de longitud por campo (120/500/2048
  caracteres según título/descripción/URL de imagen). Verificado: payload de 600kb → 413 antes de
  llegar a la lógica de negocio.
- **Condición de carrera en unicidad de slug** (`mongo-game.repository.ts`): el chequeo
  `existsBySlug` antes de crear no es atómico — dos creaciones simultáneas con el mismo título
  podían generar dos juegos con el mismo slug. Fix: índice único real en Mongo
  (`db.games.createIndex({ slug: 1 }, { unique: true })`, creado en `onModuleInit`) +
  `save()` traduce el error de duplicado (`E11000`) a `GameSlugAlreadyTakenError` en vez de dejarlo
  escapar como 500. El chequeo previo se mantiene solo como atajo de UX para el caso común.
  Verificado: segundo juego con título repetido → 409 limpio, no 500.
- **Slug fallback predecible** (`game-slug.vo.ts`): un título sin ningún caracter alfanumérico
  ASCII (solo emojis/símbolos) colapsaba siempre al mismo slug fijo `"juego"`, agravando el
  riesgo de colisión. Fix: `GameSlug.fromTitle` ahora recibe un `fallbackSuffix` (el id ya
  generado del juego) y produce `juego-<8 primeros caracteres del id>` en ese caso. Verificado:
  título `"🎮🎮🎮"` → slug `juego-84d05077`, único por diseño.
- **`JwtAuthGuard` duplicado como provider** (`game.module.ts`): se declaraba como provider
  propio en vez de reusar el patrón ya establecido en `UserModule` (`@UseGuards(JwtAuthGuard)`
  sin declararlo, resolviendo `JwtService` vía el `JwtModule` importado). Fix: se quitó el
  provider redundante — `GameModule` ya importa `UserModule`, que exporta `JwtModule`, así que el
  guard se resuelve igual que en `user.controller.ts`. Verificado: servidor arranca limpio, guard
  sigue protegiendo `/games` (probado con login real).

## Módulo de juegos (backend) — hecho

Se construyó el backend completo del módulo de juegos, con Herbario Urbano (el juego de memoria
por pares del `index.html` original de la raíz) como primer tipo soportado, pero sin nada
hardcodeado: el contenido de cada instancia de juego (títulos, descripciones, imágenes, config de
zonas/tiempo) vive en MongoDB, no en código.

**Infra**: Mongo ya estaba corriendo en Docker (`mongoDBVerifyID`, compartido con otro proyecto
tuyo de verificación de identidad) — se creó una base de datos nueva y aislada,
`nexusplay_games`, sin tocar `DocumentosE14` ni ninguna otra colección existente. Connection
string en `server/.env` como `MONGODB_URI` (nunca en git). Driver oficial `mongodb` (no
Mongoose), mismo criterio que usar Prisma con control manual de queries en vez de un ODM/ORM que
imponga su propio esquema.

**Cómo escala a más tipos de juego sin migraciones** (respuesta a la pregunta explícita del
usuario sobre escalabilidad):
- `GameType` (VO en domain, catálogo fijo tipo `Role`) declara qué tipos existen — hoy solo
  `MEMORY_MATCH`. Agregar un tipo nuevo es una decisión de código (como agregar un rol), no de
  datos: cada tipo trae su propia mecánica de juego en el frontend eventualmente.
- `content` y `config` de un `Game` son genéricos a nivel de dominio (`Record<string, unknown>` /
  `unknown[]`) — la entidad `Game` no conoce la forma exacta de ningún tipo de juego, solo
  orquesta su ciclo de vida (draft/published/flagged/removed, quién puede editarlo).
  La validación de forma específica vive en `application/content-validators/`:
  `ContentValidator` (puerto) + `MemoryMatchContentValidator` (implementación) +
  `ContentValidatorRegistry` (mapea `gameType` → validador). **Agregar un tipo de juego nuevo =
  escribir un validador nuevo y registrarlo — cero migraciones de esquema**, porque Mongo no las
  necesita y el resto de la plataforma (Postgres/usuarios) no se toca.
- Un solo documento Mongo por juego, con `content` embebido (no colección aparte): para
  memory-match no hay razón de negocio para separar los pares del juego — siempre se leen
  juntos, nunca se paginan dentro de un mismo juego.

**Permisos**: cualquier usuario autenticado puede crear un juego (pedido explícito del usuario:
"cualquier usuario, pero solo ese usuario puede crearlo... luego voy a crear un modelo de ML que
identifique contenido inapropiado"). Solo el creador o un ADMIN pueden editar/publicar/eliminar
— `Game.canBeManagedBy(userId, isAdmin)`, mismo patrón de chequeo explícito en application que ya
usa todo lo demás (`RequesterAdminResolver`, nuevo, resuelve `isAdmin` contra Postgres en cada
operación en vez de confiar en el rol del JWT, que podría estar desactualizado hasta 15 min si a
alguien lo degradan a mitad de sesión).

**Estados** (`GameStatus`): `DRAFT` (solo visible para el creador/admin) → `PUBLISHED` (visible
en el catálogo público) → `FLAGGED`/`REMOVED` (para cuando exista el moderador de ML — oculta sin
borrar, para poder auditar). Un juego eliminado es borrado lógico (`REMOVED`), no se borra el
documento.

**Endpoints** (`/games`, todos requieren `JwtAuthGuard`):
- `POST /games` — crear (cualquier usuario autenticado, nace en DRAFT).
- `GET /games` — catálogo paginado; sin filtro solo muestra PUBLISHED; `onlyMine=true` o un
  status no-público requieren ser dueño o admin.
- `GET /games/slug/:slug` — detalle por URL amigable (para la pantalla de descripción del juego).
- `GET /games/:id` — detalle por id.
- `PATCH /games/:id` — editar (creador o admin). El slug es inmutable tras crear.
- `PATCH /games/:id/publish` y `/unpublish` — creador o admin.
- `DELETE /games/:id` — borrado lógico, creador o admin.

**Verificado end-to-end** con curl real: creación con slug autogenerado desde el título,
DRAFT invisible en el catálogo público hasta publicar, edición rechazada con 403 para un usuario
que no es el creador ni admin, y confirmado en Mongo (`db.games.countDocuments()`) que los datos
cayeron en `nexusplay_games` sin tocar la DB del otro proyecto.

**Pendiente para un próximo turno** (frontend, fuera del alcance de este turno):
- Pantalla de detalle del juego (descripción + botón jugar).
- Popup con opciones al dar "jugar" + botón "crear nuevo".
- Rediseño de la pantalla de configuración (los sliders del `index.html` original) a algo más
  intuitivo.
- Conectar `GamesSection.tsx` (hoy con estado vacío real, sin datos hardcodeados) al nuevo
  `GET /games`.

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
