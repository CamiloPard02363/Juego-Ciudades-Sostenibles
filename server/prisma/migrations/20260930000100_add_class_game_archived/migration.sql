-- Issue #226: archivar un juego dentro de una clase (visibilidad local al
-- vínculo Class<->Game), sin afectar el Game global ni otras clases.
ALTER TABLE "class_games" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
