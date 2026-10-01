-- Issue #226: dashboard de métricas de estudiantes y de clase. Tabla de
-- hechos sobre la que se agregan ranking de clase, desglose por juego/materia
-- y evolución en el tiempo. `game_id`/`subject_id` son TEXT sueltos (sin FK
-- real) a propósito: `Game` vive en MongoDB (mismo criterio que
-- `class_games.game_id`) y `subject_id` se denormaliza junto con
-- `subject_name` para que el historial agregado sobreviva al soft-delete de
-- una materia. Solo crea tabla nueva, no toca datos existentes.
CREATE TABLE "game_play_results" (
    "id" TEXT NOT NULL,
    "student_user_id" TEXT NOT NULL,
    "class_id" TEXT,
    "game_id" TEXT NOT NULL,
    "game_title" TEXT NOT NULL,
    "subject_id" TEXT,
    "subject_name" TEXT,
    "score" INTEGER NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "incorrect_count" INTEGER NOT NULL,
    "time_played_ms" INTEGER NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_play_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "game_play_results_student_user_id_played_at_idx" ON "game_play_results"("student_user_id", "played_at");

CREATE INDEX "game_play_results_class_id_played_at_idx" ON "game_play_results"("class_id", "played_at");

CREATE INDEX "game_play_results_student_user_id_subject_id_idx" ON "game_play_results"("student_user_id", "subject_id");

CREATE INDEX "game_play_results_game_id_idx" ON "game_play_results"("game_id");

ALTER TABLE "game_play_results" ADD CONSTRAINT "game_play_results_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "game_play_results" ADD CONSTRAINT "game_play_results_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
