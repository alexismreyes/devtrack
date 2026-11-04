-- Additive task comment persistence with soft-delete via deletedAt.
-- Generate Client: `npm run prisma:generate` (TypeScript client only; no DB changes).
-- Apply this versioned migration: `npm run prisma:deploy`.
-- Do not run `prisma migrate reset` or delete Docker volumes unless authorized.
-- Do not add activity, label, audit, mention, or notification tables.

-- CreateTable
CREATE TABLE "task_comments" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_comments_taskId_idx" ON "task_comments"("taskId");

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
