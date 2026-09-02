# Pendientes — NexusPlay

Tareas acordadas con el usuario, en espera de más contexto o de un próximo turno.

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
- Revisar manejo de errores de red/expiración de token en la UI (ya hay base en `utils/http.ts`
  y `hooks/useAuth.tsx`).

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

## 3. Frontend — página de inicio (home autenticado)

Diseño premium, elegante, coherente con la paleta de `index.css` (acento morado `--accent`,
soporte claro/oscuro ya definido). Requisitos del usuario:

- Grid de juegos disponibles (dato real desde backend, ver punto 1 — nada hardcodeado).
- Menú lateral izquierdo (sidebar).
- Barra de búsqueda en la parte superior.
- Ícono de perfil en la esquina superior derecha: dropdown con acceso a configuración de perfil
  y cerrar sesión (JWT stateless — `signOut` ya solo limpia el token local).
- Sección de configuración de usuario (editar perfil — usa `PATCH /users/me/profile`, ya existe).

## 4. Frontend — panel de administración (solo rol ADMIN)

- Listado de usuarios **paginado** (backend ya expone `GET /users?role=&isActive=&page=&pageSize=`
  vía `ListUsersUseCase`, protegido con `canManageUsers()`).
- Crear usuarios.
- Ver el conteo total de usuarios (el backend ya devuelve `total` en la respuesta paginada).

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
