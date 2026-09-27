-- Issue #156: gobernanza de archivado de tipos de juego (capa de
-- visibilidad transversal por GameType, independiente del GameStatus
-- individual de cada instancia en Mongo). Solo crea tabla nueva, no toca
-- datos existentes.
CREATE TYPE "GameTypeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "game_type_settings" (
    "id" TEXT NOT NULL,
    "game_type" TEXT NOT NULL,
    "status" "GameTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "archived_at" TIMESTAMP(3),
    "archived_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_type_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "game_type_settings_game_type_key" ON "game_type_settings"("game_type");
