-- CreateEnum
CREATE TYPE "subject_status" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_subject_id" TEXT,
    "creator_user_id" TEXT,
    "status" "subject_status" NOT NULL DEFAULT 'PRIVATE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects"("slug");

-- CreateIndex
CREATE INDEX "subjects_parent_subject_id_idx" ON "subjects"("parent_subject_id");

-- CreateIndex
CREATE INDEX "subjects_creator_user_id_idx" ON "subjects"("creator_user_id");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_parent_subject_id_fkey" FOREIGN KEY ("parent_subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
