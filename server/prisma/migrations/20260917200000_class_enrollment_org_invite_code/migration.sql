-- AlterTable: agrega organization_id opcional a classes (issue #101, punto 3).
ALTER TABLE "classes" ADD COLUMN "organization_id" TEXT;

-- AlterTable: agrega invite_code como NULLABLE primero para poder backfillear
-- las filas existentes sin violar NOT NULL (no hay flujo destructivo: no se
-- borra ni trunca nada, solo se agrega una columna nueva).
ALTER TABLE "classes" ADD COLUMN "invite_code" TEXT;

-- Backfill: genera un código aleatorio de 6 caracteres (mismo alfabeto que
-- RandomInviteCodeGenerator, sin 0/O/1/I/L) para cada fila existente que
-- todavía no tiene inviteCode.
--
-- CORRECCIÓN (detectada en revisión de código del PR #134, issue #133): la
-- subconsulta original no estaba correlacionada con ninguna columna de
-- "classes", así que PostgreSQL la resolvía como InitPlan y la evaluaba UNA
-- sola vez para todo el UPDATE — con 2+ filas, TODAS recibían el mismo
-- código, no una colisión estadística ocasional sino un resultado
-- determinístico. Pasó desapercibido porque esta migración corrió con 0 o 1
-- clase existente. Se corrige correlacionando con "c"."id" (vía el WHERE de
-- la subconsulta) para forzar reevaluación por fila.
UPDATE "classes" AS c
SET "invite_code" = (
  SELECT string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1),
    ''
  )
  FROM generate_series(1, 6)
  WHERE c."id" IS NOT NULL
)
WHERE "invite_code" IS NULL;

-- Guard: si pese a la correlación por fila quedara algún duplicado
-- (riesgo estadístico residual, ya no el bug determinístico corregido
-- arriba), falla aquí con mensaje claro en vez de un P3018 genérico.
DO $$
DECLARE
  duplicate_count INT;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT "invite_code" FROM "classes" GROUP BY "invite_code" HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Backfill de classes.invite_code generó % código(s) duplicado(s) — reintentar la migración.', duplicate_count;
  END IF;
END $$;

-- Ahora que todas las filas tienen valor único, se puede exigir NOT NULL + UNIQUE.
ALTER TABLE "classes" ALTER COLUMN "invite_code" SET NOT NULL;
CREATE UNIQUE INDEX "classes_invite_code_key" ON "classes"("invite_code");

-- CreateIndex
CREATE INDEX "classes_organization_id_idx" ON "classes"("organization_id");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "class_enrollments" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_class_id_user_id_key" ON "class_enrollments"("class_id", "user_id");

-- CreateIndex
CREATE INDEX "class_enrollments_user_id_idx" ON "class_enrollments"("user_id");

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
