# Pendientes — NexusPlay

Tareas acordadas con el usuario, en espera de más contexto o de un próximo turno.

## 1. Módulo de juegos (backend)

Pendiente hasta recibir instrucciones más detalladas del usuario. No asumir estructura de datos
todavía. Cuando se retome, construir siguiendo la misma arquitectura hexagonal aplanada ya usada
en el módulo de usuario (`src/domain`, `src/application`, `src/infrastructure`, sin carpetas por
feature), con endpoint(s) reales respaldados por Prisma — **nada hardcodeado** en el frontend.

## 2. Frontend — flujo de autenticación

- Conectar formulario de registro (`RegisterUserDto` ya existe en backend: email, plainPassword,
  firstName, lastName, middleName?, displayName?, role?, birthDate?, locale?) — actualmente el
  cliente solo tiene login.
- Revisar manejo de errores de red/expiración de token en la UI (ya hay base en `utils/http.ts`
  y `hooks/useAuth.tsx`).

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
