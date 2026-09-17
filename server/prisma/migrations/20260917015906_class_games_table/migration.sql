-- CreateTable
CREATE TABLE "class_games" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_games_class_id_idx" ON "class_games"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_games_class_id_game_id_key" ON "class_games"("class_id", "game_id");

-- AddForeignKey
ALTER TABLE "class_games" ADD CONSTRAINT "class_games_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
