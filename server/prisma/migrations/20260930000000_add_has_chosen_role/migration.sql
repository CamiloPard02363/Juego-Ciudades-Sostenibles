-- Selección de rol post-registro: todo usuario nace STUDENT; este flag
-- marca si ya eligió explícitamente entre estudiante/profesor para no
-- repetir la pantalla de selección en cada login. Usuarios existentes
-- quedan en `false` y verán la pantalla una vez al próximo login.
ALTER TABLE "users" ADD COLUMN "has_chosen_role" BOOLEAN NOT NULL DEFAULT false;
