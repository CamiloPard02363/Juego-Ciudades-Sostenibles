-- Issue #197: login federado con Google, modelo extensible a más proveedores.
-- passwordHash pasa a nullable (no destructivo: los usuarios existentes
-- conservan su hash intacto). Tabla nueva `identity_provider_accounts` en vez
-- de columnas sueltas authProvider/googleId, para que agregar Microsoft más
-- adelante no requiera otra migración estructural.

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('GOOGLE', 'MICROSOFT');

-- CreateTable
CREATE TABLE "identity_provider_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email_at_linking" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_provider_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_provider_accounts_provider_provider_user_id_key" ON "identity_provider_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "identity_provider_accounts_user_id_idx" ON "identity_provider_accounts"("user_id");

-- AddForeignKey
ALTER TABLE "identity_provider_accounts" ADD CONSTRAINT "identity_provider_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
