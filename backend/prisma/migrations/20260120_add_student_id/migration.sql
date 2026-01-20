-- AddColumn
ALTER TABLE "users" ADD COLUMN "student_id" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "users_student_id_key" ON "users"("student_id");

