-- AlterTable: agrega organization_id opcional a classes (issue #101, punto 3).
ALTER TABLE "classes" ADD COLUMN "organization_id" TEXT;

-- AlterTable: agrega invite_code como NULLABLE primero para poder backfillear
-- las filas existentes sin violar NOT NULL (no hay flujo destructivo: no se
-- borra ni trunca nada, solo se agrega una columna nueva).
ALTER TABLE "classes" ADD COLUMN "invite_code" TEXT;

-- Backfill: genera un código aleatorio de 6 caracteres (mismo alfabeto que
-- RandomInviteCodeGenerator, sin 0/O/1/I/L) para cada fila existente que
-- todavía no tiene inviteCode. Con pocas filas la probabilidad de colisión es
-- despreciable; si llegara a colisionar, el índice único de más abajo lo
-- haría fallar de forma ruidosa (preferible a un valor silenciosamente
-- duplicado).
UPDATE "classes"
SET "invite_code" = (
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ceil(random() * 32)::int, 1), '')
  FROM generate_series(1, 6)
)
WHERE "invite_code" IS NULL;

-- Ahora que todas las filas tienen valor, se puede exigir NOT NULL + UNIQUE.
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
