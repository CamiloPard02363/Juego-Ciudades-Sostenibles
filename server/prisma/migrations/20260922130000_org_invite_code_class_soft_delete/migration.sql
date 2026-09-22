-- Issue #133, Frente A: invite code de organización.
-- AlterTable: agrega invite_code como NULLABLE primero para poder backfillear
-- las filas existentes sin violar NOT NULL (no hay flujo destructivo: no se
-- borra ni trunca nada, solo se agrega una columna nueva).
ALTER TABLE "organizations" ADD COLUMN "invite_code" TEXT;

-- Backfill: mismo generador/alfabeto que el backfill de "classes.invite_code"
-- (issue #101), código aleatorio de 6 caracteres sin 0/O/1/I/L.
--
-- La subconsulta se correlaciona con "o"."id" (vía md5) para forzar a
-- PostgreSQL a reevaluarla por cada fila. Una subconsulta escalar SIN
-- referencia a la fila (como random() suelto) se resuelve como InitPlan y
-- PostgreSQL la ejecuta UNA sola vez para todo el UPDATE, generando el MISMO
-- código para todas las filas — bug detectado en revisión de código (PR
-- #134) al aplicar esta migración contra una BD con 8 organizaciones: el
-- índice único de la línea de abajo falló por duplicados. Con 0 o 1 fila
-- existente el bug no se manifiesta, que es como pasó desapercibido en el
-- backfill gemelo de "classes.invite_code" (issue #101).
UPDATE "organizations" AS o
SET "invite_code" = (
  SELECT string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1),
    ''
  )
  FROM generate_series(1, 6)
  WHERE o."id" IS NOT NULL
)
WHERE "invite_code" IS NULL;

-- Guard: si pese a la correlación por fila quedara algún duplicado (mismo
-- riesgo estadístico residual de cualquier generador aleatorio con pocas
-- filas), falla aquí con un mensaje claro en vez de dejar que el
-- CREATE UNIQUE INDEX de abajo reviente con un P3018 genérico.
DO $$
DECLARE
  duplicate_count INT;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT "invite_code" FROM "organizations" GROUP BY "invite_code" HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Backfill de organizations.invite_code generó % código(s) duplicado(s) — reintentar la migración.', duplicate_count;
  END IF;
END $$;

-- Ahora que todas las filas tienen valor único, se puede exigir NOT NULL + UNIQUE.
ALTER TABLE "organizations" ALTER COLUMN "invite_code" SET NOT NULL;
CREATE UNIQUE INDEX "organizations_invite_code_key" ON "organizations"("invite_code");

-- Issue #133, Frente E: soft-delete de clases. Default TRUE preserva el
-- comportamiento actual para todas las filas existentes (no destructivo).
ALTER TABLE "classes" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
