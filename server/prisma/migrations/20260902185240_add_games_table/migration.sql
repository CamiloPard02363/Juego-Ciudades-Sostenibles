-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "games_title_idx" ON "games"("title");
