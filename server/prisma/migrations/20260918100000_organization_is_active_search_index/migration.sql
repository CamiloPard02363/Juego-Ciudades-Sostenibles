-- AlterTable: agrega is_active con default true a organizations (issue #106,
-- CA2.3). No destructiva: ADD COLUMN con DEFAULT, todas las filas existentes
-- quedan activas sin backfill manual.
ALTER TABLE "organizations" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Índices funcionales trigram para acelerar `ILIKE`/`contains` case-insensitive
-- (issue #106, CA2.1/CA2.2: search en /users por displayName/email, search en
-- /organizations/all por name/domain). pg_trgm ya puede estar habilitado por
-- otra migración del proyecto; CREATE EXTENSION IF NOT EXISTS es idempotente
-- y no destructivo.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "users_display_name_trgm_idx" ON "users" USING gin ("display_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_email_trgm_idx" ON "users" USING gin ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "organizations_name_trgm_idx" ON "organizations" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "organizations_domain_trgm_idx" ON "organizations" USING gin ("domain" gin_trgm_ops);
