-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- Seed fixed role catalog
INSERT INTO "roles" ("id", "name") VALUES
    (gen_random_uuid()::text, 'STUDENT'),
    (gen_random_uuid()::text, 'TEACHER'),
    (gen_random_uuid()::text, 'ADMIN');

-- AlterTable: add nullable role_id first, backfill, then enforce NOT NULL
ALTER TABLE "users" ADD COLUMN "role_id" TEXT;

UPDATE "users" u
SET "role_id" = r."id"
FROM "roles" r
WHERE r."name" = u."role"::text;

ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

-- DropColumn (old enum-backed column)
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRoleDb";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
