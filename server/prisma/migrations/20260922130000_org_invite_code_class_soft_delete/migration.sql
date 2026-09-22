-- Issue #133, Frente A: invite code de organización.
-- AlterTable: agrega invite_code como NULLABLE primero para poder backfillear
-- las filas existentes sin violar NOT NULL (no hay flujo destructivo: no se
-- borra ni trunca nada, solo se agrega una columna nueva).
ALTER TABLE "organizations" ADD COLUMN "invite_code" TEXT;

-- Backfill: mismo generador/alfabeto que el backfill de "classes.invite_code"
-- (issue #101), código aleatorio de 6 caracteres sin 0/O/1/I/L.
UPDATE "organizations"
SET "invite_code" = (
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ceil(random() * 32)::int, 1), '')
  FROM generate_series(1, 6)
)
WHERE "invite_code" IS NULL;

-- Ahora que todas las filas tienen valor, se puede exigir NOT NULL + UNIQUE.
ALTER TABLE "organizations" ALTER COLUMN "invite_code" SET NOT NULL;
CREATE UNIQUE INDEX "organizations_invite_code_key" ON "organizations"("invite_code");

-- Issue #133, Frente E: soft-delete de clases. Default TRUE preserva el
-- comportamiento actual para todas las filas existentes (no destructivo).
ALTER TABLE "classes" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
