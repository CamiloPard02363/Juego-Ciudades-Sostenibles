-- Backfill: hasta ahora nadie pedía fecha de nacimiento, así que todo usuario
-- existente tiene birth_date NULL. Son cuentas de prueba y ya adultas — se
-- les asigna una fecha que los deja claramente sobre el umbral del Modo Kids
-- (10 años) y de mayoría de edad (18), sin bloquear su acceso ni forzar que
-- alguien la corrija a mano. No se vuelve NOT NULL la columna: una cuenta sin
-- fecha se sigue tratando como adulta por defecto (ver isKidsMode en el
-- cliente), así que un valor ausente nunca es peligroso, solo incompleto.
UPDATE "users" SET "birth_date" = (CURRENT_DATE - INTERVAL '25 years') WHERE "birth_date" IS NULL;
