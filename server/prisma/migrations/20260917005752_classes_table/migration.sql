-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "teacher_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "classes_teacher_user_id_created_at_idx" ON "classes"("teacher_user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
