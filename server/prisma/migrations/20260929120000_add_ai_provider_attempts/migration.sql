-- Issue #204: fallback de proveedores de IA (Gemini -> Groq). Registro
-- crudo de cada intento (éxito o falla) para el panel de administración de
-- IA. Solo crea tabla nueva, no toca datos existentes. `provider`/
-- `operation` son TEXT a propósito (no un enum de Postgres): agregar un
-- proveedor nuevo nunca debe requerir una migración de esquema.
CREATE TABLE "ai_provider_attempts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "used_fallback" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_provider_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_provider_attempts_created_at_idx" ON "ai_provider_attempts"("created_at");
