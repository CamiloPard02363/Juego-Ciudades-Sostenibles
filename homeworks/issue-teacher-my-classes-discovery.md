# Cambio 4: diagnóstico de Mis clases para profesores

## Resultado de la inspección

El menú actual `Materias` navega a `/materias`, que renderiza `CategoriesPage`. Esa pantalla usa `GamesSection` en modo `categories` y consulta `GET /categories`; muestra categorías temáticas de juegos con su conteo de juegos publicados. No administra cursos, grupos ni clases.

## Soporte encontrado

El proyecto sí tiene organizaciones y membresías:

- `Organization` y `OrganizationMembership`.
- `GET /organizations/mine` para organizaciones del usuario autenticado.
- `GET /organizations/:id/members` para miembros de una organización.
- Roles globales y roles dentro de una organización.

Pero no existe soporte específico para:

- clases o cursos;
- grupos de estudiantes por clase;
- profesor propietario de una clase;
- actividades asignadas a una clase;
- endpoints, hooks o páginas de clases.

Las organizaciones no se deben tratar automáticamente como clases: representan instituciones/equipos y tienen reglas distintas.

## Conclusión

Aplica el escenario C. No es correcto cambiar el texto `Materias` por `Mis clases`, porque convertiría una pantalla de categorías educativas en una pantalla de grupos inexistente.

## MVP mínimo recomendado

Crear posteriormente una funcionalidad independiente de clases con:

1. entidad/modelo de clase con propietario o profesor responsable;
2. relación entre clase y estudiantes;
3. endpoint autenticado para listar solo las clases relacionadas con el usuario;
4. página `/mis-clases` o ruta equivalente;
5. acceso `Mis clases` únicamente para `TEACHER`;
6. estado vacío sin datos inventados.

Ese trabajo requeriría autorización para ampliar backend y definir el modelo de datos. En esta rama no se modifica `Materias`, el backend, las rutas ni los menús existentes.
